import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { formatDateTime } from "@/utils/date";
import type { ActivityItem } from "@/types/api";
import { formatMoneyShort } from "@/utils/money";

const typeConfig: Record<
  ActivityItem["type"],
  { icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }
> = {
  SALE: { icon: "bag-handle-outline", bg: "bg-primary-50", color: "#0F766E" },
  PAYMENT: { icon: "cash-outline", bg: "bg-success-100", color: "#16A34A" },
  PURCHASE: { icon: "cart-outline", bg: "bg-info-100", color: "#2563EB" },
  EXPENSE: { icon: "receipt-outline", bg: "bg-warning-100", color: "#D97706" },
  CUSTOMER: { icon: "person-add-outline", bg: "bg-zinc-100", color: "#475569" },
};

export function ActivityRow({ item }: { item: ActivityItem }) {
  const config = typeConfig[item.type] ?? typeConfig.CUSTOMER;
  const isIn = item.direction === "IN";
  return (
    <View className="flex-row items-center gap-3 py-2.5" accessibilityLabel={`${item.title} ${item.subtitle}`}>
      <View className={`h-10 w-10 items-center justify-center rounded-full ${config.bg}`}>
        <Ionicons name={config.icon} size={18} color={config.color} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-ink">{item.title}</Text>
        <Text className="text-xs text-ink-muted">{formatDateTime(item.createdAt)}</Text>
      </View>
      <View className="items-end">
        <Text className={`text-[15px] font-bold ${isIn ? "text-success" : "text-danger"}`}>
          {isIn ? "+" : "-"}{formatMoneyShort(item.amount)}
        </Text>
        <Text className="text-[10px] text-ink-muted">{item.subtitle}</Text>
      </View>
    </View>
  );
}