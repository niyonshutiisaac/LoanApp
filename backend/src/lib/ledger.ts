import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { money } from "./money";

export interface CustomerFinancials {
  balance: string;
  totalBought: string;
  totalPaid: string;
  nextDueDate: string | null;
}

interface BalanceRow {
  customer_id: string;
  balance: string | null;
  total_bought: string | null;
  total_paid: string | null;
}

/**
 * Computes balance/totalBought/totalPaid/nextDueDate for many customers in one
 * pair of grouped queries (not N+1), the same way withBalance() does per-customer
 * in the mock, but scoped to run efficiently over a whole page of results.
 */
export async function getFinancialsForCustomers(customerIds: string[]): Promise<Map<string, CustomerFinancials>> {
  const result = new Map<string, CustomerFinancials>();
  if (customerIds.length === 0) return result;

  const [balances, dueDates] = await Promise.all([
    prisma.$queryRaw<BalanceRow[]>(Prisma.sql`
      SELECT
        "customerId" AS customer_id,
        SUM(CASE WHEN direction = 'IN' THEN amount ELSE -amount END) AS balance,
        SUM(CASE WHEN type = 'SALE' THEN amount ELSE 0 END) AS total_bought,
        SUM(CASE WHEN type = 'CUSTOMER_PAYMENT' THEN amount ELSE 0 END) AS total_paid
      FROM customer_ledger_entries
      WHERE "customerId" IN (${Prisma.join(customerIds)})
      GROUP BY "customerId"
    `),
    prisma.sale.groupBy({
      by: ["customerId"],
      where: { customerId: { in: customerIds }, remainingAmount: { gt: 0 }, dueDate: { not: null } },
      _min: { dueDate: true },
    }),
  ]);

  const dueDateByCustomer = new Map(dueDates.map((d) => [d.customerId as string, d._min.dueDate]));

  for (const id of customerIds) {
    const row = balances.find((b) => b.customer_id === id);
    const due = dueDateByCustomer.get(id);
    result.set(id, {
      balance: money(Math.max(0, Number(row?.balance ?? 0))),
      totalBought: money(Number(row?.total_bought ?? 0)),
      totalPaid: money(Number(row?.total_paid ?? 0)),
      nextDueDate: due ? due.toISOString().slice(0, 10) : null,
    });
  }

  return result;
}

export async function getFinancialsForCustomer(customerId: string): Promise<CustomerFinancials> {
  const map = await getFinancialsForCustomers([customerId]);
  return (
    map.get(customerId) ?? { balance: "0.00", totalBought: "0.00", totalPaid: "0.00", nextDueDate: null }
  );
}
