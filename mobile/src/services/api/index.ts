import { USE_MOCK_API } from "@/constants/api";
import type {
  ApiErrorBody,
  AuthSession,
  Customer,
  CustomerInput,
  CustomerLedgerEntry,
  CustomerSummary,
  DashboardSummary,
  Expense,
  ExpenseInput,
  LoginInput,
  Paginated,
  Payment,
  PaymentInput,
  Product,
  ProductInput,
  Purchase,
  PurchaseInput,
  RegisterInput,
  Reminder,
  ReminderInput,
  ReportData,
  ReportFilters,
  Sale,
  SaleInput,
  Shop,
  User,
} from "@/types/api";
import { apiRequest, newIdempotencyKey } from "./httpClient";
import { createMockDb, type MockDb } from "@/services/mock/db";
import { mockAuth } from "@/services/mock/auth";
import { mockCustomers } from "@/services/mock/customers";
import { mockProducts } from "@/services/mock/products";
import { mockSales } from "@/services/mock/sales";
import { mockPurchases } from "@/services/mock/purchases";
import { mockExpenses } from "@/services/mock/expenses";
import { mockPayments } from "@/services/mock/payments";
import { mockDashboard, mockReports } from "@/services/mock/dashboard";
import { mockReminders, mockShop } from "@/services/mock/misc";
import type { ListQuery as CustomerListQuery } from "@/services/mock/customers";
import type { SaleListQuery } from "@/services/mock/sales";

export type { ApiErrorBody };

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  status?: string;
  type?: string;
  from?: string;
  to?: string;
  customerId?: string;
  lowStock?: boolean;
}

let mockDb: MockDb | null = null;

export function resetMockDb(): void {
  mockDb = createMockDb();
}

function db(): MockDb {
  if (!mockDb) mockDb = createMockDb();
  return mockDb;
}

async function toPaged<T>(fn: () => Promise<Paginated<T>>): Promise<Paginated<T>> {
  return fn();
}

// ---------- Auth ----------
export const authApi = {
  async login(input: LoginInput): Promise<AuthSession> {
    if (USE_MOCK_API) return mockAuth.login(db(), input);
    // Longer timeout: login is often the first request after the app has been
    // idle, and a free-tier Render backend can take ~30-50s to wake from sleep.
    return apiRequest<AuthSession>("/auth/login", { method: "POST", body: input, skipAuth: true, timeoutMs: 45000 });
  },
  async register(input: RegisterInput): Promise<AuthSession> {
    if (USE_MOCK_API) return mockAuth.register(db(), input);
    return apiRequest<AuthSession>("/auth/register", { method: "POST", body: input, skipAuth: true, timeoutMs: 45000 });
  },
  async me(): Promise<{ user: User; shop: Shop | null }> {
    if (USE_MOCK_API) return mockAuth.me(db());
    return apiRequest("/auth/me");
  },
  async logout(): Promise<void> {
    if (USE_MOCK_API) return;
    await apiRequest("/auth/logout", { method: "POST" }).catch(() => undefined);
  },
};

// ---------- Customers ----------
export const customersApi = {
  list(params: ListParams = {}): Promise<Paginated<Customer>> {
    if (USE_MOCK_API)
      return toPaged(() => mockCustomers.list(db(), params as CustomerListQuery));
    return apiRequest(`/customers?${toQuery(params)}`);
  },
  get(id: string): Promise<Customer> {
    if (USE_MOCK_API) return mockCustomers.get(db(), id);
    return apiRequest(`/customers/${id}`);
  },
  create(input: CustomerInput): Promise<Customer> {
    if (USE_MOCK_API) return mockCustomers.create(db(), input);
    return apiRequest("/customers", { method: "POST", body: input });
  },
  update(id: string, input: Partial<CustomerInput>): Promise<Customer> {
    if (USE_MOCK_API) return mockCustomers.update(db(), id, input);
    return apiRequest(`/customers/${id}`, { method: "PATCH", body: input });
  },
  archive(id: string): Promise<{ id: string }> {
    if (USE_MOCK_API) return mockCustomers.archive(db(), id);
    return apiRequest(`/customers/${id}`, { method: "DELETE" });
  },
  ledger(id: string): Promise<CustomerLedgerEntry[]> {
    if (USE_MOCK_API) return mockCustomers.ledger(db(), id);
    return apiRequest(`/customers/${id}/ledger`);
  },
  dueSoon(): Promise<CustomerSummary[]> {
    if (USE_MOCK_API) return mockCustomers.dueSoon(db());
    return apiRequest("/customers/due-soon");
  },
};

// ---------- Products ----------
export const productsApi = {
  list(params: ListParams = {}): Promise<Paginated<Product>> {
    if (USE_MOCK_API) return toPaged(() => mockProducts.list(db(), params));
    return apiRequest(`/products?${toQuery(params)}`);
  },
  get(id: string): Promise<Product> {
    if (USE_MOCK_API) return mockProducts.get(db(), id);
    return apiRequest(`/products/${id}`);
  },
  create(input: ProductInput): Promise<Product> {
    if (USE_MOCK_API) return mockProducts.create(db(), input);
    return apiRequest("/products", { method: "POST", body: input });
  },
  update(id: string, input: Partial<ProductInput>): Promise<Product> {
    if (USE_MOCK_API) return mockProducts.update(db(), id, input);
    return apiRequest(`/products/${id}`, { method: "PATCH", body: input });
  },
  adjustStock(id: string, quantity: number): Promise<Product> {
    if (USE_MOCK_API) return mockProducts.adjustStock(db(), id, quantity);
    return apiRequest(`/products/${id}/stock`, { method: "POST", body: { quantity } });
  },
  archive(id: string): Promise<{ id: string }> {
    if (USE_MOCK_API) return mockProducts.archive(db(), id);
    return apiRequest(`/products/${id}`, { method: "DELETE" });
  },
};

// ---------- Sales ----------
export const salesApi = {
  list(params: ListParams = {}): Promise<Paginated<Sale>> {
    if (USE_MOCK_API) return toPaged(() => mockSales.list(db(), params as SaleListQuery));
    return apiRequest(`/sales?${toQuery(params)}`);
  },
  get(id: string): Promise<Sale> {
    if (USE_MOCK_API) return mockSales.get(db(), id);
    return apiRequest(`/sales/${id}`);
  },
  create(input: SaleInput): Promise<Sale> {
    const key = newIdempotencyKey();
    if (USE_MOCK_API) return mockSales.create(db(), input);
    return apiRequest("/sales", { method: "POST", body: input, idempotencyKey: key });
  },
};

// ---------- Purchases ----------
export const purchasesApi = {
  list(params: ListParams = {}): Promise<Paginated<Purchase>> {
    if (USE_MOCK_API) return toPaged(() => mockPurchases.list(db(), params));
    return apiRequest(`/purchases?${toQuery(params)}`);
  },
  create(input: PurchaseInput): Promise<Purchase> {
    const key = newIdempotencyKey();
    if (USE_MOCK_API) return mockPurchases.create(db(), input);
    return apiRequest("/purchases", { method: "POST", body: input, idempotencyKey: key });
  },
};

// ---------- Payments ----------
export const paymentsApi = {
  list(params: ListParams = {}): Promise<Paginated<Payment>> {
    if (USE_MOCK_API) return toPaged(() => mockPayments.list(db(), params));
    return apiRequest(`/payments?${toQuery(params)}`);
  },
  create(input: PaymentInput): Promise<Payment> {
    const key = newIdempotencyKey();
    if (USE_MOCK_API) return mockPayments.create(db(), input);
    return apiRequest("/payments", { method: "POST", body: input, idempotencyKey: key });
  },
};

// ---------- Expenses ----------
export const expensesApi = {
  list(params: ListParams = {}): Promise<Paginated<Expense>> {
    if (USE_MOCK_API) return toPaged(() => mockExpenses.list(db(), params));
    return apiRequest(`/expenses?${toQuery(params)}`);
  },
  create(input: ExpenseInput): Promise<Expense> {
    if (USE_MOCK_API) return mockExpenses.create(db(), input);
    return apiRequest("/expenses", { method: "POST", body: input });
  },
};

// ---------- Dashboard & Reports ----------
export const dashboardApi = {
  get(): Promise<DashboardSummary> {
    if (USE_MOCK_API) return mockDashboard.get(db());
    return apiRequest("/dashboard");
  },
};

export const reportsApi = {
  get(filters: ReportFilters, kind: "sales" | "all" = "all"): Promise<ReportData> {
    if (USE_MOCK_API) return mockReports.get(db(), filters);
    return apiRequest(`/reports${kind === "sales" ? "/sales" : ""}?from=${filters.from}&to=${filters.to}`);
  },
};

// ---------- Reminders ----------
export const remindersApi = {
  list(params: ListParams = {}): Promise<Paginated<Reminder>> {
    if (USE_MOCK_API) return toPaged(() => mockReminders.list(db(), params));
    return apiRequest(`/reminders?${toQuery(params)}`);
  },
  create(input: ReminderInput): Promise<Reminder> {
    if (USE_MOCK_API) return mockReminders.create(db(), input);
    return apiRequest("/reminders", { method: "POST", body: input });
  },
  sendNow(id: string): Promise<Reminder> {
    if (USE_MOCK_API) return mockReminders.sendNow(db(), id);
    return apiRequest(`/reminders/${id}/send`, { method: "POST" });
  },
};

// ---------- Shop ----------
export const shopApi = {
  get(): Promise<Shop> {
    if (USE_MOCK_API) return mockShop.get(db());
    return apiRequest("/shop");
  },
  update(input: Partial<Shop>): Promise<Shop> {
    if (USE_MOCK_API) return mockShop.update(db(), input);
    return apiRequest("/shop", { method: "PATCH", body: input });
  },
};

// ---------- Profile ----------
export const profileApi = {
  changePassword(oldPassword: string, newPassword: string): Promise<{ ok: true }> {
    if (USE_MOCK_API) return Promise.resolve({ ok: true });
    return apiRequest("/auth/change-password", { method: "POST", body: { oldPassword, newPassword } });
  },
};

function toQuery(params: ListParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  return query.toString();
}