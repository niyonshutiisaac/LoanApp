import dayjs from "dayjs";
import type {
  ActivityItem,
  Customer,
  CustomerLedgerEntry,
  Expense,
  Payment,
  Product,
  Purchase,
  Reminder,
  Sale,
  SaleItemView,
  Shop,
  User,
} from "@/types/api";

const now = () => dayjs();
const iso = (d: dayjs.Dayjs) => d.toISOString();
const day = (offset: number, hour = 10, minute = 0) =>
  iso(now().add(offset, "day").hour(hour).minute(minute).second(0));
const dayDate = (offset: number) => now().add(offset, "day").format("YYYY-MM-DD");
export const money = (n: number | string) => Number(n).toFixed(2);

export interface MockUser extends User {
  password: string;
}

export interface MockDb {
  users: MockUser[];
  shops: Shop[];
  customers: Customer[];
  ledgers: Record<string, CustomerLedgerEntry[]>;
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  payments: Payment[];
  expenses: Expense[];
  reminders: Reminder[];
  activity: ActivityItem[];
  seq: number;
}

export function nextId(db: MockDb, prefix: string): string {
  db.seq += 1;
  return `${prefix}_${db.seq.toString(36)}`;
}

function seedActivity(): ActivityItem[] {
  return [
    { id: "act_1", type: "SALE", title: "Cash sale", subtitle: "3 items", amount: money(28000), direction: "IN", createdAt: day(0, 9, 12) },
    { id: "act_2", type: "SALE", title: "John bought on credit", subtitle: "Credit sale", amount: money(15000), direction: "IN", createdAt: day(0, 10, 5) },
    { id: "act_3", type: "PAYMENT", title: "David paid you", subtitle: "Payment", amount: money(10000), direction: "IN", createdAt: day(-1, 17, 40) },
    { id: "act_4", type: "PURCHASE", title: "Bought goods", subtitle: "From market", amount: money(120000), direction: "OUT", createdAt: day(-1, 8, 0) },
    { id: "act_5", type: "EXPENSE", title: "Transport", subtitle: "Expense", amount: money(5000), direction: "OUT", createdAt: day(0, 7, 30) },
    { id: "act_6", type: "SALE", title: "Peter bought on credit", subtitle: "Credit sale", amount: money(20000), direction: "IN", createdAt: day(0, 11, 20) },
  ];
}

export function createMockDb(): MockDb {
  const db: MockDb = {
    users: [],
    shops: [],
    customers: [],
    ledgers: {},
    products: [],
    sales: [],
    purchases: [],
    payments: [],
    expenses: [],
    reminders: [],
    activity: seedActivity(),
    seq: 0,
  };

  db.users.push({
    id: "user_demo",
    name: "Demo Owner",
    email: "demo@loanapp.com",
    phone: "+250780000000",
    password: "demo1234",
    createdAt: day(-90, 8),
  });

  db.shops.push({
    id: "shop_demo",
    name: "ABC Shop",
    phone: "+250788000000",
    address: "Main Market, Kigali",
    currency: "RWF",
    timezone: "Africa/Kigali",
    allowNegativeInventory: false,
    createdAt: day(-90, 8),
    updatedAt: day(-90, 8),
  });

  const customers: [string, string, string, number, number | null][] = [
    ["John", "+250781111111", "Remera", 45000, -3],
    ["Peter", "+250782222222", "Nyamirambo", 25000, 0],
    ["David", "+250783333333", "Kicukiro", 10000, 5],
    ["Alice", "+250784444444", "Gisozi", 60000, -1],
    ["Grace", "+250785555555", "Kimironko", 0, null],
    ["Emmanuel", "+250786666666", "Kabuga", 0, null],
  ];

  for (const [name, phone, address, balance, dueOffset] of customers) {
    const id = nextId(db, "cus");
    const dueDate = dueOffset === null ? null : dayDate(dueOffset);
    const paid = balance > 0 ? Math.round(balance * 2.7) : 10000;
    const bought = balance + paid;
    db.customers.push({
      id,
      shopId: "shop_demo",
      name,
      phone,
      address,
      notes: null,
      isActive: true,
      balance: money(balance),
      nextDueDate: dueDate,
      totalBought: money(bought),
      totalPaid: money(paid),
      createdAt: day(-40, 9),
      updatedAt: day(-1, 9),
    });

    db.ledgers[id] = [
      {
        id: nextId(db, "led"),
        type: "SALE",
        description: `Bought goods on credit (${name})`,
        amount: money(bought),
        direction: "IN",
        createdAt: day(-20, 12),
      },
      { id: nextId(db, "led"), type: "CUSTOMER_PAYMENT", description: "Cash payment", amount: money(paid * 0.5), direction: "OUT", createdAt: day(-15, 15) },
      { id: nextId(db, "led"), type: "CUSTOMER_PAYMENT", description: "Cash payment", amount: money(paid * 0.5), direction: "OUT", createdAt: day(-6, 16) },
    ];
  }

  const productData: [string, string, string, number, number, number, number, number][] = [
    ["Sugar", "SUG-001", "kg", 4000, 5000, 24, 10, 0],
    ["Rice", "RIC-001", "kg", 3500, 4500, 18, 10, 1],
    ["Cooking Oil", "OIL-001", "liter", 7000, 8500, 15, 6, 0],
    ["Salt", "SAL-001", "pack", 500, 700, 40, 12, 0],
    ["Bathing Soap", "SOAP-01", "piece", 1200, 1500, 30, 10, 4],
    ["Maize Flour", "MAI-001", "kg", 2500, 3000, 8, 8, 0],
    ["Bottled Water", "WAT-001", "bottle", 400, 600, 96, 24, 0],
    ["Milk", "MIL-001", "liter", 900, 1300, 0, 6, 2],
  ];

  for (const [name, sku, unit, buying, selling, stock, threshold, daysAgo] of productData) {
    db.products.push({
      id: nextId(db, "prd"),
      shopId: "shop_demo",
      name,
      sku,
      unit,
      categoryId: null,
      categoryName: null,
      buyingPrice: money(buying),
      sellingPrice: money(selling),
      stockQuantity: stock,
      lowStockThreshold: threshold,
      isActive: true,
      createdAt: day(-daysAgo * 7, 9),
      updatedAt: day(-daysAgo, 9),
    });
  }

  const saleOf = (
    customerId: string | null,
    customerName: string | null,
    paymentType: "CASH" | "CREDIT" | "PARTIAL",
    items: [string, string | null, number, number][],
    dueOffset: number | null,
    when: number,
    paidAmount: number,
  ): Sale => {
    const total = items.reduce((sum, [, , qty, price]) => sum + qty * price, 0);
    const remaining = Math.max(0, total - paidAmount);
    return {
      id: nextId(db, "sal"),
      shopId: "shop_demo",
      customerId,
      customerName,
      paymentType,
      totalAmount: money(total),
      paidAmount: money(paidAmount),
      remainingAmount: money(remaining),
      dueDate: dueOffset === null ? null : dayDate(dueOffset),
      soldAt: day(when, 11, 30),
      notes: null,
      items: items.map(([name, productId, quantity, unitPrice]) => ({
        id: nextId(db, "sit"),
        productId,
        productName: name,
        quantity,
        unitPrice: money(unitPrice),
        total: money(quantity * unitPrice),
      })) as SaleItemView[],
    };
  };

  const john = db.customers[0];
  const peter = db.customers[1];
  const david = db.customers[2];
  const alice = db.customers[3];
  const sugar = db.products[0];
  const rice = db.products[1];
  const oil = db.products[2];
  const flour = db.products[5];
  const water = db.products[6];
  const milk = db.products[7];

  db.sales.push(
    saleOf(null, null, "CASH", [["Sugar", sugar.id, 2, 5000], ["Bottled Water", water.id, 3, 600]], null, 0, 28000),
    saleOf(john.id, john.name, "CREDIT", [["Cooking Oil", oil.id, 2, 8500]], 7, 0, 0),
    saleOf(peter.id, peter.name, "CREDIT", [["Sugar", sugar.id, 4, 5000]], 0, 0, 0),
    saleOf(null, null, "CASH", [["Maize Flour", flour.id, 2, 3000], ["Salt", null, 1, 700]], null, -1, 0),
    saleOf(david.id, david.name, "PARTIAL", [["Rice", rice.id, 3, 4500]], 5, -2, 10000),
    saleOf(alice.id, alice.name, "CREDIT", [["Milk", milk.id, 5, 1300]], -1, -3, 0),
    saleOf(null, null, "CASH", [["Quick item: Bread", null, 2, 1500], ["Bottled Water", water.id, 6, 600]], null, -6, 0),
  );

  db.purchases.push({
    id: nextId(db, "pur"),
    shopId: "shop_demo",
    totalAmount: money(260000),
    paymentAmount: money(260000),
    remainingAmount: money(0),
    paymentStatus: "PAID",
    purchasedAt: day(-7, 7, 30),
    notes: null,
    items: [
      { id: nextId(db, "pit"), productId: sugar.id, productName: "Sugar", quantity: 5, unitCost: money(4000), total: money(20000) },
      { id: nextId(db, "pit"), productId: rice.id, productName: "Rice", quantity: 10, unitCost: money(3500), total: money(35000) },
      { id: nextId(db, "pit"), productId: oil.id, productName: "Cooking Oil", quantity: 6, unitCost: money(7000), total: money(42000) },
    ],
  });
  db.purchases.push({
    id: nextId(db, "pur"),
    shopId: "shop_demo",
    totalAmount: money(120000),
    paymentAmount: money(120000),
    remainingAmount: money(0),
    paymentStatus: "PAID",
    purchasedAt: day(-1, 8, 0),
    notes: "Market day",
    items: [
      { id: nextId(db, "pit"), productId: flour.id, productName: "Maize Flour", quantity: 12, unitCost: money(2500), total: money(30000) },
      { id: nextId(db, "pit"), productId: water.id, productName: "Bottled Water", quantity: 48, unitCost: money(400), total: money(19200) },
    ],
  });

  db.expenses.push(
    { id: nextId(db, "exp"), shopId: "shop_demo", category: "Transport", description: "Delivery of goods", amount: money(5000), expenseDate: day(0, 7, 30), createdAt: day(0, 7, 30) },
    { id: nextId(db, "exp"), shopId: "shop_demo", category: "Electricity", description: null, amount: money(15000), expenseDate: day(-4, 16), createdAt: day(-4, 16) },
    { id: nextId(db, "exp"), shopId: "shop_demo", category: "Rent", description: "Monthly shop rent", amount: money(100000), expenseDate: day(-1, 9), createdAt: day(-1, 9) },
  );

  db.payments.push(
    { id: nextId(db, "pay"), shopId: "shop_demo", customerId: john.id, customerName: john.name, saleId: null, amount: money(30000), method: "CASH", paidAt: day(-6, 16), notes: null, balanceAfter: money(15000), createdAt: day(-6, 16) },
    { id: nextId(db, "pay"), shopId: "shop_demo", customerId: david.id, customerName: david.name, saleId: db.sales[4].id, amount: money(10000), method: "MOBILE_MONEY", paidAt: day(-2, 15), notes: null, balanceAfter: money(10000), createdAt: day(-2, 15) },
  );

  db.reminders.push(
    { id: nextId(db, "rem"), customerId: john.id, customerName: john.name, scheduledFor: day(-3, 9), status: "SENT", channel: "SMS", message: `Hello John, this is a friendly reminder that your outstanding balance at ABC Shop is 45,000 RWF.`, sentAt: day(-3, 9), failedAt: null, error: null, createdAt: day(-3, 8, 30) },
    { id: nextId(db, "rem"), customerId: alice.id, customerName: alice.name, scheduledFor: day(-1, 9), status: "SENT", channel: "SMS", message: `Hello Alice, this is a friendly reminder that your outstanding balance at ABC Shop is 60,000 RWF.`, sentAt: day(-1, 9), failedAt: null, error: null, createdAt: day(-1, 8, 30) },
  );

  return db;
}

export function resetMockDb(): MockDb {
  return createMockDb();
}