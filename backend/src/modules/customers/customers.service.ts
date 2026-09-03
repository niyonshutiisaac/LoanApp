import { Prisma, type Customer } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/errors";
import { parsePageParams, toPaginated, type Paginated } from "../../lib/pagination";
import { getFinancialsForCustomer, getFinancialsForCustomers } from "../../lib/ledger";
import type { customerInputSchema, customerListQuerySchema, customerUpdateSchema } from "./customers.schemas";
import type { z } from "zod";

interface CustomerDto {
  id: string;
  shopId: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  balance: string;
  nextDueDate: string | null;
  totalBought: string;
  totalPaid: string;
  createdAt: string;
  updatedAt: string;
}

function serialize(c: Customer, financials: { balance: string; totalBought: string; totalPaid: string; nextDueDate: string | null }): CustomerDto {
  return {
    id: c.id,
    shopId: c.shopId,
    name: c.name,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
    isActive: c.isActive,
    balance: financials.balance,
    nextDueDate: financials.nextDueDate,
    totalBought: financials.totalBought,
    totalPaid: financials.totalPaid,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

async function getActiveCustomer(shopId: string, id: string): Promise<Customer> {
  const customer = await prisma.customer.findFirst({ where: { id, shopId, isActive: true } });
  if (!customer) throw new ApiError("CUSTOMER_NOT_FOUND", "Customer was not found", 404);
  return customer;
}

export const customersService = {
  async list(shopId: string, query: z.infer<typeof customerListQuerySchema>): Promise<Paginated<CustomerDto>> {
    const { page, limit, skip } = parsePageParams(query);

    const searchClause = query.search
      ? Prisma.sql`AND (c.name ILIKE ${`%${query.search}%`} OR c.phone ILIKE ${`%${query.search}%`} OR c.address ILIKE ${`%${query.search}%`})`
      : Prisma.empty;

    const havingClause =
      query.status === "owed"
        ? Prisma.sql`HAVING COALESCE(SUM(CASE WHEN cle.direction = 'IN' THEN cle.amount ELSE -cle.amount END), 0) > 0`
        : query.status === "overdue"
          ? Prisma.sql`HAVING MIN(due.next_due_date) IS NOT NULL AND MIN(due.next_due_date) < CURRENT_DATE`
          : Prisma.empty;

    const orderClause =
      query.sort === "balance"
        ? Prisma.sql`ORDER BY balance DESC`
        : Prisma.sql`ORDER BY c."createdAt" ASC`;

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        total_count: bigint;
        balance: string;
        total_bought: string;
        total_paid: string;
        next_due_date: Date | null;
      }>
    >(Prisma.sql`
      SELECT
        c.id,
        COUNT(*) OVER() AS total_count,
        COALESCE(SUM(CASE WHEN cle.direction = 'IN' THEN cle.amount ELSE -cle.amount END), 0) AS balance,
        COALESCE(SUM(CASE WHEN cle.type = 'SALE' THEN cle.amount ELSE 0 END), 0) AS total_bought,
        COALESCE(SUM(CASE WHEN cle.type = 'CUSTOMER_PAYMENT' THEN cle.amount ELSE 0 END), 0) AS total_paid,
        MIN(due.next_due_date) AS next_due_date
      FROM customers c
      LEFT JOIN customer_ledger_entries cle ON cle."customerId" = c.id
      LEFT JOIN (
        SELECT "customerId" AS customer_id, "dueDate" AS next_due_date
        FROM sales
        WHERE "remainingAmount" > 0 AND "dueDate" IS NOT NULL
      ) due ON due.customer_id = c.id
      WHERE c."shopId" = ${shopId} AND c."isActive" = true ${searchClause}
      GROUP BY c.id
      ${havingClause}
      ${orderClause}
      LIMIT ${limit} OFFSET ${skip}
    `);

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
    if (rows.length === 0) return toPaginated([], 0, page, limit);

    const customers = await prisma.customer.findMany({ where: { id: { in: rows.map((r) => r.id) } } });
    const byId = new Map(customers.map((c) => [c.id, c]));

    const items = rows
      .map((row) => {
        const customer = byId.get(row.id);
        if (!customer) return null;
        return serialize(customer, {
          balance: Number(row.balance).toFixed(2),
          totalBought: Number(row.total_bought).toFixed(2),
          totalPaid: Number(row.total_paid).toFixed(2),
          nextDueDate: row.next_due_date ? row.next_due_date.toISOString().slice(0, 10) : null,
        });
      })
      .filter((c): c is CustomerDto => c !== null);

    return toPaginated(items, total, page, limit);
  },

  async get(shopId: string, id: string): Promise<CustomerDto> {
    const customer = await getActiveCustomer(shopId, id);
    const financials = await getFinancialsForCustomer(id);
    return serialize(customer, financials);
  },

  async create(shopId: string, input: z.infer<typeof customerInputSchema>): Promise<CustomerDto> {
    const customer = await prisma.customer.create({
      data: {
        shopId,
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });
    return serialize(customer, { balance: "0.00", totalBought: "0.00", totalPaid: "0.00", nextDueDate: null });
  },

  async update(shopId: string, id: string, input: z.infer<typeof customerUpdateSchema>): Promise<CustomerDto> {
    await getActiveCustomer(shopId, id);
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.phone !== undefined && { phone: input.phone?.trim() || null }),
        ...(input.address !== undefined && { address: input.address?.trim() || null }),
        ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
      },
    });
    const financials = await getFinancialsForCustomer(id);
    return serialize(customer, financials);
  },

  async archive(shopId: string, id: string): Promise<{ id: string }> {
    await getActiveCustomer(shopId, id);
    await prisma.customer.update({ where: { id }, data: { isActive: false } });
    return { id };
  },

  async ledger(shopId: string, id: string) {
    await getActiveCustomer(shopId, id);
    const entries = await prisma.customerLedgerEntry.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
    });
    return entries.map((e) => ({
      id: e.id,
      type: e.type,
      description: e.description,
      amount: e.amount.toFixed(2),
      direction: e.direction,
      createdAt: e.createdAt.toISOString(),
    }));
  },

  async dueSoon(shopId: string) {
    // Capped at 200 candidates before ranking in memory — this is a "top 6" dashboard
    // widget, not a paginated list, so an approximate cap is an acceptable tradeoff
    // for shops with very large customer bases.
    const customers = await prisma.customer.findMany({ where: { shopId, isActive: true }, take: 200 });
    if (customers.length === 0) return [];
    const financials = await getFinancialsForCustomers(customers.map((c) => c.id));
    return customers
      .map((c) => ({ id: c.id, name: c.name, ...financials.get(c.id)! }))
      .filter((c) => Number(c.balance) > 0 && c.nextDueDate)
      .sort((a, b) => (a.nextDueDate! < b.nextDueDate! ? -1 : 1))
      .slice(0, 6)
      .map((c) => ({ id: c.id, name: c.name, balance: c.balance, nextDueDate: c.nextDueDate }));
  },
};
