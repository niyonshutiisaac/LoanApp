import { Pressable, Text, View } from "react-native";
import { useT, useTpl } from "@/i18n";
import type { Customer } from "@/types/api";
import { dueLabel, formatDateShort, getDueStatus } from "@/utils/date";
import { formatMoney } from "@/utils/money";

const dueTones = {
  overdue: "text-danger",
  due_today: "text-warning",
  due_soon: "text-ink-soft",
  safe: "text-ink-muted",
} as const;

export function CustomerRow({
  customer,
  onPress,
  currency = "RWF",
}: {
  customer: Customer;
  onPress?: () => void;
  currency?: string;
}) {
  const balance = Number(customer.balance);
  const status = getDueStatus(customer.nextDueDate);
  const label = dueLabel(customer.nextDueDate);
  const tt = useT();
  const tpl = useTpl();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${customer.name}, ${tpl("common.owed", {})} ${formatMoney(customer.balance, currency)}`}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 active:bg-zinc-50"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-50">
        <Text className="text-base font-bold text-primary-800">
          {customer.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-ink">{customer.name}</Text>
        <Text className="text-xs text-ink-muted">
          {balance > 0
            ? label
              ? `${label} · ${formatDateShort(customer.nextDueDate)}`
              : tt("cust.owedMoney")
            : tt("cust.noBalance")}
        </Text>
      </View>
      <View className="items-end">
        <Text className={`text-[15px] font-bold ${balance > 0 ? "text-danger" : "text-success"}`}>
          {balance > 0 ? formatMoney(customer.balance, currency) : tt("common.settled")}
        </Text>
        {status ? (
          <Text className={`text-[11px] font-medium ${dueTones[status]}`}>{label}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}