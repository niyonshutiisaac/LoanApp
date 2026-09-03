import { Prisma, type Payment } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/errors";
import { money, normalizeAmount } from "../../lib/money";
import { parsePageParams, toPaginated, type Paginated } from "../../lib/pagination";
import type { z } from "zod";
import type { paymentInputSchema, paymentListQuerySchema } from "./payments.schemas";

function serialize(p: Payment & { customer: { name: string } }) {
  return {
    id: p.id,
    shopId: p.shopId,
    customerId: p.customerId,
    customerName: p.customer.name,
    saleId: p.saleId,
    amount: money(p.amount),
    method: p.method,
    paidAt: p.paidAt.toISOString(),
    notes: p.notes,
    balanceAfter: money(p.balanceAfter),
    createdAt: p.createdAt.toISOString(),
  };
}

export const paymentsService = {
  async list(shopId: string, query: z.infer<typeof paymentListQuerySchema>): Promise<Paginated<ReturnType<typeof serialize>>> {
    const { page, limit, skip } = parsePageParams(query);
    const where: Prisma.PaymentWhereInput = {
      shopId,
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.from && query.to && { paidAt: { gte: new Date(query.from), lte: new Date(query.to) } }),
    };
    const [items, total] = await Promise.all([
      prisma.payment.findMany({ where, include: { customer: { select: { name: true } } }, orderBy: { paidAt: "desc" }, skip, take: limit }),
      prisma.payment.count({ where }),
    ]);
    return toPaginated(items.map(serialize), total, page, limit);
  },

  async create(shopId: string, input: z.infer<typeof paymentInputSchema>) {
    const amount = normalizeAmount(input.amount);
    if (amount <= 0) throw new ApiError("VALIDATION_ERROR", "Payment amount must be greater than zero", 422);

    const payment = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: input.customerId, shopId, isActive: true } });
      if (!customer) throw new ApiError("CUSTOMER_NOT_FOUND", "Customer was not found", 404);

      // Serializes concurrent payments for the same customer so two simultaneous
      // requests can't both read the same "balance before" and jointly overpay it.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${customer.id}))`;

      const [{ balance }] = await tx.$queryRaw<Array<{ balance: string | null }>>(Prisma.sql`
        SELECT SUM(CASE WHEN direction = 'IN' THEN amount ELSE -amount END) AS balance
        FROM customer_ledger_entries WHERE "customerId" = ${customer.id}
      `);
      const balanceBefore = Math.max(0, Number(balance ?? 0));
      if (amount > balanceBefore) {
        throw new ApiError("PAYMENT_EXCEEDS_BALANCE", `Payment exceeds the outstanding balance of ${money(balanceBefore)}`, 422);
      }

      const sale = input.saleId ? await tx.sale.findFirst({ where: { id: input.saleId, shopId } }) : null;

      const payment = await tx.payment.create({
        data: {
          shopId,
          customerId: customer.id,
          saleId: sale?.id ?? null,
          amount: money(amount),
          method: input.method ?? "CASH",
          paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
          notes: input.notes?.trim() || null,
          balanceAfter: money(balanceBefore - amount),
        },
        include: { customer: { select: { name: true } } },
      });

      await tx.customerLedgerEntry.create({
        data: {
          shopId,
          customerId: customer.id,
          type: "CUSTOMER_PAYMENT",
          description: `Paid ${payment.method === "MOBILE_MONEY" ? "via mobile money" : "in cash"}`,
          amount: money(amount),
          direction: "OUT",
        },
      });

      if (sale && Number(sale.remainingAmount) > 0) {
        const newRemaining = Math.max(0, Number(sale.remainingAmount) - amount);
        await tx.sale.update({
          where: { id: sale.id },
          data: { remainingAmount: money(newRemaining), paidAmount: money(Number(sale.paidAmount) + amount) },
        });
      }

      return payment;
    });

    return serialize(payment);
  },
};
