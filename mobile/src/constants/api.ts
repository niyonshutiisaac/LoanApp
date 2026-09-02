import Constants from "expo-constants";

export const API_BASE_URL = (() => {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured;
  const devHost = Constants.expoConfig?.hostUri?.split(":").shift();
  return `http://${devHost ?? "localhost"}:4000/api/v1`;
})();

export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK !== "false";

export const REQUEST_TIMEOUT_MS = 15000;

export const CURRENCIES = [
  { code: "RWF", symbol: "RWF", label: "Rwandan Franc" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
  { code: "UGX", symbol: "USh", label: "Ugandan Shilling" },
  { code: "TZS", symbol: "TSh", label: "Tanzanian Shilling" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "USD", symbol: "$", label: "US Dollar" },
];

export const TIMEZONES = [
  "Africa/Kigali",
  "Africa/Nairobi",
  "Africa/Kampala",
  "Africa/Dar_es_Salaam",
  "Africa/Lagos",
  "Africa/Accra",
  "UTC",
];

export const QUERY_KEYS = {
  dashboard: ["dashboard"] as const,
  customers: ["customers"] as const,
  customer: (id: string) => ["customers", id] as const,
  products: ["products"] as const,
  sales: ["sales"] as const,
  purchases: ["purchases"] as const,
  expenses: ["expenses"] as const,
  payments: ["payments"] as const,
  reminders: ["reminders"] as const,
  reports: (filters: string) => ["reports", filters] as const,
  shop: ["shop"] as const,
  notifications: ["notifications"] as const,
};