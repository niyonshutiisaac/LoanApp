export type Money = string;

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type PaymentType = "CASH" | "CREDIT" | "PARTIAL";
export type PaymentMethod = "CASH" | "MOBILE_MONEY" | "BANK";
export type PurchasePaymentStatus = "PAID" | "PARTIAL" | "UNPAID";
export type ReminderStatus = "PENDING" | "SENT" | "FAILED" | "CANCELLED";
export type ReminderChannel = "SMS" | "PUSH" | "EMAIL";
export type LedgerType =
  | "SALE"
  | "CUSTOMER_PAYMENT"
  | "PURCHASE"
  | "EXPENSE"
  | "ADJUSTMENT";
export type LedgerDirection = "IN" | "OUT";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export interface Shop {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  allowNegativeInventory: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  shop: Shop | null;
  accessToken: string;
  refreshToken: string;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  balance: Money;
  nextDueDate: string | null;
  totalBought: Money;
  totalPaid: Money;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface CustomerLedgerEntry {
  id: string;
  type: LedgerType;
  description: string;
  amount: Money;
  direction: LedgerDirection;
  createdAt: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  sku: string | null;
  unit: string | null;
  categoryId: string | null;
  categoryName: string | null;
  buyingPrice: Money;
  sellingPrice: Money;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  sku?: string | null;
  unit?: string | null;
  buyingPrice: Money;
  sellingPrice: Money;
  stockQuantity?: number;
  lowStockThreshold?: number;
}

export interface SaleItemView {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
}

export interface Sale {
  id: string;
  shopId: string;
  customerId: string | null;
  customerName: string | null;
  paymentType: PaymentType;
  totalAmount: Money;
  paidAmount: Money;
  remainingAmount: Money;
  dueDate: string | null;
  soldAt: string;
  notes: string | null;
  items: SaleItemView[];
}

export interface SaleItemInput {
  productId?: string | null;
  productName?: string;
  quantity: number;
  unitPrice: Money;
}

export interface SaleInput {
  customerId?: string | null;
  paymentType: PaymentType;
  paidAmount?: Money;
  dueDate?: string | null;
  notes?: string | null;
  items: SaleItemInput[];
}

export interface PurchaseItemView {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitCost: Money;
  total: Money;
}

export interface Purchase {
  id: string;
  shopId: string;
  totalAmount: Money;
  paymentAmount: Money;
  remainingAmount: Money;
  paymentStatus: PurchasePaymentStatus;
  purchasedAt: string;
  notes: string | null;
  items: PurchaseItemView[];
}

export interface PurchaseItemInput {
  productId?: string | null;
  productName?: string;
  quantity: number;
  unitCost: Money;
}

export interface PurchaseInput {
  paymentAmount?: Money;
  purchasedAt?: string;
  notes?: string | null;
  items: PurchaseItemInput[];
}

export interface Payment {
  id: string;
  shopId: string;
  customerId: string;
  customerName: string;
  saleId: string | null;
  amount: Money;
  method: PaymentMethod;
  paidAt: string;
  notes: string | null;
  balanceAfter: Money;
  createdAt: string;
}

export interface PaymentInput {
  customerId: string;
  amount: Money;
  method?: PaymentMethod;
  paidAt?: string;
  saleId?: string | null;
  notes?: string | null;
}

export interface Expense {
  id: string;
  shopId: string;
  category: string;
  description: string | null;
  amount: Money;
  expenseDate: string;
  createdAt: string;
}

export interface ExpenseInput {
  category: string;
  description?: string | null;
  amount: Money;
  expenseDate?: string;
}

export interface ReminderInput {
  customerId: string;
  channel?: ReminderChannel;
  scheduledFor?: string;
  amount?: Money;
}

export interface Reminder {
  id: string;
  customerId: string;
  customerName: string;
  scheduledFor: string;
  status: ReminderStatus;
  channel: ReminderChannel;
  message: string;
  sentAt: string | null;
  failedAt: string | null;
  error: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  shop: Shop;
  today: {
    sales: Money;
    cashReceived: Money;
    creditSales: Money;
    purchased: Money;
    expenses: Money;
    saleCount: number;
  };
  totals: {
    customersOwing: Money;
    customerCount: number;
    overdueCustomers: number;
    productsInStock: number;
    lowStockProducts: number;
    stockValue: Money;
  };
  activity: ActivityItem[];
  dueSoonCustomers: CustomerSummary[];
}

export interface CustomerSummary {
  id: string;
  name: string;
  balance: Money;
  nextDueDate: string | null;
}

export interface ActivityItem {
  id: string;
  type: "SALE" | "PURCHASE" | "PAYMENT" | "EXPENSE" | "CUSTOMER";
  title: string;
  subtitle: string;
  amount: Money;
  direction: "IN" | "OUT";
  createdAt: string;
}

export interface ReportFilters {
  from: string;
  to: string;
}

export interface ReportData {
  from: string;
  to: string;
  sales: Money;
  salesCount: number;
  creditSales: Money;
  cashReceived: Money;
  purchases: Money;
  expenses: Money;
  estimatedProfit: Money;
  customerDebts: CustomerDebtRow[];
}

export interface CustomerDebtRow {
  customerId: string;
  customerName: string;
  balance: Money;
  nextDueDate: string | null;
  daysOverdue: number | null;
}

export type PeriodKey = "today" | "week" | "month" | "custom";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  shopName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
}