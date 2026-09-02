import type { Paginated, Reminder, ReminderInput, Shop } from "@/types/api";
import { money, nextId, type MockDb } from "./db";
import { withBalance } from "./customers";
import { paginate, sortByDate, throwApiError, wait } from "./utils";

export const mockReminders = {
  async list(db: MockDb, query: { page?: number; limit?: number } = {}): Promise<Paginated<Reminder>> {
    await wait(250);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const items = sortByDate(db.reminders, "scheduledFor", "desc");
    return paginate(items, page, limit);
  },

  async create(db: MockDb, input: ReminderInput): Promise<Reminder> {
    await wait(300);
    const customer = db.customers.find((c) => c.id === input.customerId && c.isActive);
    if (!customer) throwApiError("CUSTOMER_NOT_FOUND", "Customer was not found", 404);
    const shop = db.shops[0]!;
    const withB = withBalance(db, { ...customer });
    const amount = input.amount ?? withB.balance;

    const reminder: Reminder = {
      id: nextId(db, "rem"),
      customerId: customer.id,
      customerName: customer.name,
      scheduledFor: input.scheduledFor ?? new Date().toISOString(),
      status: "PENDING",
      channel: input.channel ?? "SMS",
      message: `Hello ${customer.name}, this is a friendly reminder that your outstanding balance at ${shop.name} is ${money(amount)} ${shop.currency}. Your payment is due today. Thank you.`,
      sentAt: null,
      failedAt: null,
      error: null,
      createdAt: new Date().toISOString(),
    };
    db.reminders.push(reminder);
    return reminder;
  },

  async sendNow(db: MockDb, reminderId: string): Promise<Reminder> {
    await wait(550);
    const reminder = db.reminders.find((r) => r.id === reminderId);
    if (!reminder) throwApiError("REMINDER_NOT_FOUND", "Reminder was not found", 404);
    reminder.status = "SENT";
    reminder.sentAt = new Date().toISOString();
    return { ...reminder };
  },
};

export const mockShop = {
  async get(db: MockDb): Promise<Shop> {
    await wait(200);
    if (!db.shops[0]) throwApiError("SHOP_NOT_FOUND", "Shop was not found", 404);
    return { ...db.shops[0] };
  },

  async update(db: MockDb, input: Partial<Shop>): Promise<Shop> {
    await wait(350);
    const shop = db.shops[0];
    if (!shop) throwApiError("SHOP_NOT_FOUND", "Shop was not found", 404);
    Object.assign(shop, {
      name: input.name?.trim() || shop.name,
      phone: input.phone !== undefined ? input.phone?.trim() || null : shop.phone,
      address: input.address !== undefined ? input.address?.trim() || null : shop.address,
      currency: input.currency ?? shop.currency,
      timezone: input.timezone ?? shop.timezone,
      updatedAt: new Date().toISOString(),
    });
    return { ...shop };
  },
};