import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { QUERY_KEYS } from "@/constants/api";
import {
  authApi,
  customersApi,
  dashboardApi,
  expensesApi,
  paymentsApi,
  productsApi,
  profileApi,
  purchasesApi,
  remindersApi,
  reportsApi,
  salesApi,
  shopApi,
} from "@/services/api";
import { queryClient } from "@/lib/queryClient";
import type {
  CustomerInput,
  ExpenseInput,
  LoginInput,
  PaymentInput,
  ProductInput,
  PurchaseInput,
  RegisterInput,
  ReminderInput,
  ReportFilters,
  SaleInput,
  Shop,
} from "@/types/api";
import { useAuthStore } from "@/store/auth";

function invalidateMany(keys: (string | readonly string[])[]) {
  keys.forEach((key) =>
    queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] }),
  );
}

export { useQueryClient };

// ---------- Auth ----------
export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: async (session) => {
      await useAuthStore.getState().setSession(session);
      queryClient.clear();
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: async (session) => {
      await useAuthStore.getState().setSession(session);
      queryClient.clear();
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await authApi.logout();
      await useAuthStore.getState().logout();
      queryClient.clear();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      profileApi.changePassword(oldPassword, newPassword),
  });
}

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { user, shop } = await authApi.me();
      useAuthStore.setState({ user, shop });
      return { user, shop };
    },
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });
}

// ---------- Dashboard ----------
export function useDashboard() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: () => dashboardApi.get(),
  });
}

// ---------- Customers ----------
export function useCustomers(params: { search?: string; status?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.customers, params],
    queryFn: () => customersApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.customer(id),
    queryFn: () => customersApi.get(id),
  });
}

export function useCustomerLedger(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.customer(id), "ledger"],
    queryFn: () => customersApi.ledger(id),
  });
}

export function useCreateCustomer() {
  return useMutation({
    mutationFn: (input: CustomerInput) => customersApi.create(input),
    onSuccess: () => invalidateMany([QUERY_KEYS.customers, QUERY_KEYS.dashboard]),
  });
}

export function useUpdateCustomer() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CustomerInput> }) =>
      customersApi.update(id, input),
    onSuccess: (_data, vars) =>
      invalidateMany([QUERY_KEYS.customers, QUERY_KEYS.customer(vars.id), QUERY_KEYS.dashboard]),
  });
}

export function useArchiveCustomer() {
  return useMutation({
    mutationFn: (id: string) => customersApi.archive(id),
    onSuccess: () => invalidateMany([QUERY_KEYS.customers, QUERY_KEYS.dashboard]),
  });
}

// ---------- Products ----------
export function useProducts(params: { search?: string; lowStock?: boolean; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.products, params],
    queryFn: () => productsApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateProduct() {
  return useMutation({
    mutationFn: (input: ProductInput) => productsApi.create(input),
    onSuccess: () => invalidateMany([QUERY_KEYS.products, QUERY_KEYS.dashboard]),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.products, "detail", id],
    queryFn: () => productsApi.get(id),
  });
}

export function useUpdateProduct() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) =>
      productsApi.update(id, input),
    onSuccess: () => invalidateMany([QUERY_KEYS.products, QUERY_KEYS.dashboard]),
  });
}

// ---------- Sales ----------
export function useSales(params: { search?: string; type?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.sales, params],
    queryFn: () => salesApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateSale() {
  return useMutation({
    mutationFn: (input: SaleInput) => salesApi.create(input),
    onSuccess: () =>
      invalidateMany([
        QUERY_KEYS.sales,
        QUERY_KEYS.customers,
        QUERY_KEYS.products,
        QUERY_KEYS.dashboard,
        QUERY_KEYS.payments,
      ]),
  });
}

// ---------- Purchases ----------
export function usePurchases(params: { search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.purchases, params],
    queryFn: () => purchasesApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreatePurchase() {
  return useMutation({
    mutationFn: (input: PurchaseInput) => purchasesApi.create(input),
    onSuccess: () => invalidateMany([QUERY_KEYS.purchases, QUERY_KEYS.products, QUERY_KEYS.dashboard]),
  });
}

// ---------- Payments ----------
export function usePayments(params: { customerId?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.payments, params],
    queryFn: () => paymentsApi.list(params),
  });
}

export function useCreatePayment() {
  return useMutation({
    mutationFn: (input: PaymentInput) => paymentsApi.create(input),
    onSuccess: (_data, vars) =>
      invalidateMany([
        QUERY_KEYS.customers,
        QUERY_KEYS.customer(vars.customerId),
        QUERY_KEYS.payments,
        QUERY_KEYS.sales,
        QUERY_KEYS.dashboard,
      ]),
  });
}

// ---------- Expenses ----------
export function useExpenses(params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.expenses, params],
    queryFn: () => expensesApi.list(params),
  });
}

export function useCreateExpense() {
  return useMutation({
    mutationFn: (input: ExpenseInput) => expensesApi.create(input),
    onSuccess: () => invalidateMany([QUERY_KEYS.expenses, QUERY_KEYS.dashboard]),
  });
}

// ---------- Reports ----------
export function useReport(filters: ReportFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.reports(`${filters.from}|${filters.to}`),
    queryFn: () => reportsApi.get(filters),
  });
}

// ---------- Reminders ----------
export function useReminders(params: { status?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.reminders, params],
    queryFn: () => remindersApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateReminder() {
  return useMutation({
    mutationFn: (input: ReminderInput) => remindersApi.create(input),
  });
}

export function useSendReminder() {
  return useMutation({
    mutationFn: (id: string) => remindersApi.sendNow(id),
  });
}

// ---------- Shop ----------
export function useShop() {
  return useQuery({
    queryKey: QUERY_KEYS.shop,
    queryFn: () => shopApi.get(),
  });
}

export function useUpdateShop() {
  return useMutation({
    mutationFn: (input: Partial<Shop>) => shopApi.update(input),
    onSuccess: () => invalidateMany([QUERY_KEYS.shop, QUERY_KEYS.dashboard]),
  });
}

// ---------- Notifications ----------
export function useNotificationsPermission(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications", "permission"],
    queryFn: async () => {
      if (!enabled) return false;
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === "granted") return true;
        const req = await Notifications.requestPermissionsAsync();
        return req.status === "granted";
      } catch {
        return false;
      }
    },
    enabled,
  });
}