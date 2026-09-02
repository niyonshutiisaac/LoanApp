import dayjs from "dayjs";
import type { ActivityItem, Customer, CustomerInput, CustomerLedgerEntry, CustomerSummary, Paginated } from "@/types/api";
import { money, nextId, type MockDb } from "./db";
import { searchBy, paginate, sortByDate, throwApiError, wait } from "./utils";

function getCustomer(db: MockDb, id: string): Customer {
  const customer = db.customers.find((c) => c.id === id && c.isActive);
  if (!customer) throwApiError("CUSTOMER_NOT_FOUND", "Customer was not found", 404);
  return customer;
}

export function withBalance(db: MockDb, c: Customer): Customer {
  const entries = db.ledgers[c.id] ?? [];
  let balance = 0;
  for (const e of entries) {
    balance += e.direction === "IN" ? Number(e.amount) : -Number(e.amount);
  }
  c.balance = money(Math.max(0, balance));
  const futureDue = db.sales
    .filter((s) => s.customerId === c.id && s.remainingAmount !== "0.00" && s.dueDate)
    .map((s) => s.dueDate!)
    .sort();
  c.nextDueDate = futureDue[0] ?? null;
  const bought = entries.filter((e) => e.type === "SALE").reduce((s, e) => s + Number(e.amount), 0);
  const paid = entries.filter((e) => e.type === "CUSTOMER_PAYMENT").reduce((s, e) => s + Number(e.amount), 0);
  c.totalBought = money(bought);
  c.totalPaid = money(paid);
  return c;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  status?: "active" | "owed" | "overdue";
}

export const mockCustomers = {
  async list(db: MockDb, query: ListQuery = {}): Promise<Paginated<Customer>> {
    await wait(300);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    let items = db.customers.map((c) => withBalance(db, { ...c }));

    if (query.status === "owed") items = items.filter((c) => Number(c.balance) > 0);
    else if (query.status === "active") items = items.filter((c) => c.isActive);
    else items = items.filter((c) => c.isActive);

    if (query.status === "overdue") {
      items = items.filter((c) => {
        if (!c.nextDueDate) return false;
        return dayjs(c.nextDueDate).startOf("day").isBefore(dayjs().startOf("day"));
      });
    }

    const searched = searchBy(items, query.search, ["name", "phone", "address"] as (keyof Customer)[]);
    const sorted =
      query.sort === "balance"
        ? [...searched].sort((a, b) => Number(b.balance) - Number(a.balance))
        : sortByDate(searched, "createdAt", "asc");
    return paginate(sorted, page, limit);
  },

  async get(db: MockDb, id: string): Promise<Customer> {
    await wait(250);
    return withBalance(db, { ...getCustomer(db, id) });
  },

  async create(db: MockDb, input: CustomerInput): Promise<Customer> {
    await wait(350);
    if (!input.name?.trim()) throwApiError("VALIDATION_ERROR", "Customer name is required");
    const customer: Customer = {
      id: nextId(db, "cus"),
      shopId: db.shops[0]!.id,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      isActive: true,
      balance: money(0),
      nextDueDate: null,
      totalBought: money(0),
      totalPaid: money(0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.customers.push(customer);
    db.ledgers[customer.id] = [];
    return withBalance(db, { ...customer });
  },

  async update(db: MockDb, id: string, input: Partial<CustomerInput>): Promise<Customer> {
    await wait(300);
    const customer = getCustomer(db, id);
    if (input.name && !input.name.trim()) throwApiError("VALIDATION_ERROR", "Customer name is required");
    Object.assign(customer, {
      name: input.name?.trim() ?? customer.name,
      phone: input.phone !== undefined ? input.phone?.trim() || null : customer.phone,
      address: input.address !== undefined ? input.address?.trim() || null : customer.address,
      notes: input.notes !== undefined ? input.notes?.trim() || null : customer.notes,
      updatedAt: new Date().toISOString(),
    });
    return withBalance(db, { ...customer });
  },

  async archive(db: MockDb, id: string): Promise<{ id: string }> {
    await wait(250);
    const customer = getCustomer(db, id);
    customer.isActive = false;
    customer.updatedAt = new Date().toISOString();
    return { id };
  },

  async ledger(db: MockDb, customerId: string): Promise<CustomerLedgerEntry[]> {
    await wait(250);
    getCustomer(db, customerId);
    return sortByDate(db.ledgers[customerId] ?? [], "createdAt", "desc");
  },

  async transactions(
    db: MockDb,
    customerId: string,
  ): Promise<ActivityItem[]> {
    await wait(300);
    getCustomer(db, customerId);
    const items: ActivityItem[] = [];
    for (const s of db.sales.filter((s) => s.customerId === customerId)) {
      items.push({
        id: `act_${s.id}`,
        type: "SALE",
        title: s.paymentType === "CASH" ? "Sale (paid)" : "Bought on credit",
        subtitle: s.items.map((i) => i.productName).join(", "),
        amount: s.totalAmount,
        direction: "IN",
        createdAt: s.soldAt,
      });
    }
    for (const p of db.payments.filter((p) => p.customerId === customerId)) {
      items.push({
        id: `act_${p.id}`,
        type: "PAYMENT",
        title: "Paid you",
        subtitle: p.method === "MOBILE_MONEY" ? "Mobile money" : "Cash",
        amount: p.amount,
        direction: "OUT",
        createdAt: p.paidAt,
      });
    }
    return sortByDate(items, "createdAt", "desc");
  },

  async dueSoon(db: MockDb): Promise<CustomerSummary[]> {
    await wait(200);
    const customers = db.customers
      .filter((c) => c.isActive)
      .map((c) => withBalance(db, { ...c }))
      .filter((c) => Number(c.balance) > 0 && c.nextDueDate)
      .sort((a, b) => (a.nextDueDate! < b.nextDueDate! ? -1 : 1))
      .slice(0, 6);
    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      balance: c.balance,
      nextDueDate: c.nextDueDate,
    }));
  },
};