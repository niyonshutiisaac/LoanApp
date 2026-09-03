import type { Reminder } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/errors";
import { money } from "../../lib/money";
import { getFinancialsForCustomer } from "../../lib/ledger";
import { parsePageParams, toPaginated, type Paginated } from "../../lib/pagination";
import type { z } from "zod";
import type { reminderInputSchema, reminderListQuerySchema } from "./reminders.schemas";

function serialize(r: Reminder & { customer: { name: string } }) {
  return {
    id: r.id,
    customerId: r.customerId,
    customerName: r.customer.name,
    scheduledFor: r.scheduledFor.toISOString(),
    status: r.status,
    channel: r.channel,
    message: r.message,
    sentAt: r.sentAt?.toISOString() ?? null,
    failedAt: r.failedAt?.toISOString() ?? null,
    error: r.error,
    createdAt: r.createdAt.toISOString(),
  };
}

export const remindersService = {
  async list(shopId: string, query: z.infer<typeof reminderListQuerySchema>): Promise<Paginated<ReturnType<typeof serialize>>> {
    const { page, limit, skip } = parsePageParams(query);
    const where = { shopId, ...(query.status && { status: query.status }) };
    const [items, total] = await Promise.all([
      prisma.reminder.findMany({ where, include: { customer: { select: { name: true } } }, orderBy: { scheduledFor: "desc" }, skip, take: limit }),
      prisma.reminder.count({ where }),
    ]);
    return toPaginated(items.map(serialize), total, page, limit);
  },

  async create(shopId: string, input: z.infer<typeof reminderInputSchema>) {
    const customer = await prisma.customer.findFirst({ where: { id: input.customerId, shopId, isActive: true } });
    if (!customer) throw new ApiError("CUSTOMER_NOT_FOUND", "Customer was not found", 404);
    const shop = await prisma.shop.findUniqueOrThrow({ where: { id: shopId } });

    const amount = input.amount !== undefined ? money(input.amount) : (await getFinancialsForCustomer(customer.id)).balance;

    const reminder = await prisma.reminder.create({
      data: {
        shopId,
        customerId: customer.id,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : new Date(),
        status: "PENDING",
        channel: input.channel ?? "SMS",
        message: `Hello ${customer.name}, this is a friendly reminder that your outstanding balance at ${shop.name} is ${amount} ${shop.currency}. Your payment is due today. Thank you.`,
      },
      include: { customer: { select: { name: true } } },
    });
    return serialize(reminder);
  },

  async sendNow(shopId: string, id: string) {
    const reminder = await prisma.reminder.findFirst({ where: { id, shopId }, include: { customer: { select: { name: true } } } });
    if (!reminder) throw new ApiError("REMINDER_NOT_FOUND", "Reminder was not found", 404);
    // No real SMS/push/email provider is wired up yet — this stubs delivery the
    // same way the mock does, marking it sent so the UI flow can be exercised.
    const updated = await prisma.reminder.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
      include: { customer: { select: { name: true } } },
    });
    return serialize(updated);
  },
};
