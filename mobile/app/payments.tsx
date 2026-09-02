import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PaginatedList } from "@/components/features/PaginatedList";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { usePayments, useShop } from "@/features/hooks";
import { usePagination } from "@/hooks/usePagination";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/date";
import type { Payment } from "@/types/api";
import { useT, useTpl } from "@/i18n";

export default function PaymentsScreen() {
  const router = useRouter();
  const tt = useT();
  const tpl = useTpl();
  const { page, nextPage, hasMore } = usePagination({ limit: 20 });
  const { data, isLoading, isError, isFetching, refetch } = usePayments({ page, limit: 20 });
  const { data: shopData } = useShop();
  const currency = shopData?.currency ?? "RWF";

  return (
    <Screen scroll={false}>
      <ScreenHeader title={tt("pay.title")} subtitle={tt("pay.subtitle")} />
      <PaginatedList
        className="flex-1 px-4"
        isLoading={isLoading}
        isError={isError}
        data={data?.items ?? []}
        keyExtractor={(item: Payment) => item.id}
        onRetry={() => refetch()}
        hasMore={hasMore(data)}
        loadingMore={isFetching}
        onEndReached={nextPage}
        empty={{
          title: tt("pay.emptyTitle"),
          message: tt("pay.emptyMessage"),
          action: (
            <Pressable
              onPress={() => router.push("/payment/new")}
              className="h-12 items-center justify-center rounded-2xl bg-primary"
            >
              <Text className="font-semibold text-white">{tt("pay.recordAction")}</Text>
            </Pressable>
          ),
        }}
        renderItem={({ item }: { item: Payment }) => (
          <View className="flex-row items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-success-100">
              <Ionicons name="cash-outline" size={18} color="#16A34A" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-ink">{item.customerName}</Text>
              <Text className="text-xs text-ink-muted">
                {item.method === "MOBILE_MONEY" ? tt("common.mobileMoney") : tt("common.cash")} · {formatDateTime(item.paidAt)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-base font-bold text-success">+{formatMoney(item.amount, currency)}</Text>
              <Text className="text-[11px] text-ink-muted">{tpl("pay.balance", { amt: formatMoney(item.balanceAfter, currency) })}</Text>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}