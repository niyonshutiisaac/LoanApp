import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { PaginatedList } from "@/components/features/PaginatedList";
import { Badge } from "@/components/ui/Badge";
import { FAB } from "@/components/ui/FAB";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { usePurchases, useShop } from "@/features/hooks";
import { usePagination } from "@/hooks/usePagination";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/date";
import type { Purchase } from "@/types/api";
import { useT, useTpl } from "@/i18n";

const statusTone = (s: Purchase["paymentStatus"]) =>
  s === "PAID" ? "success" : s === "PARTIAL" ? "warning" : "danger";

export default function PurchasesScreen() {
  const router = useRouter();
  const tt = useT();
  const tpl = useTpl();
  const { page, nextPage, hasMore } = usePagination({ limit: 20 });
  const { data, isLoading, isError, isFetching, refetch } = usePurchases({ page, limit: 20 });
  const { data: shopData } = useShop();
  const currency = shopData?.currency ?? "RWF";

  return (
    <Screen scroll={false}>
      <ScreenHeader title={tt("pur.title")} subtitle={tt("pur.subtitle")} />
      <PaginatedList
        className="flex-1 px-4"
        isLoading={isLoading}
        isError={isError}
        data={data?.items ?? []}
        keyExtractor={(item: Purchase) => item.id}
        onRetry={() => refetch()}
        hasMore={hasMore(data)}
        loadingMore={isFetching}
        onEndReached={nextPage}
        empty={{
          title: tt("pur.emptyTitle"),
          message: tt("pur.emptyMessage"),
        }}
        renderItem={({ item }: { item: Purchase }) => (
          <View className="rounded-2xl border border-zinc-200/80 bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-[15px] font-bold text-ink">{formatMoney(item.totalAmount, currency)}</Text>
              <Badge
                label={
                  item.paymentStatus === "PAID"
                    ? tt("common.paid")
                    : item.paymentStatus === "PARTIAL"
                      ? tpl("pur.owing", { amt: formatMoney(item.remainingAmount, currency) })
                      : tt("common.notPaid")
                }
                tone={statusTone(item.paymentStatus)}
              />
            </View>
            <Text className="mt-1 text-xs text-ink-muted" numberOfLines={1}>
              {item.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}
            </Text>
            <Text className="mt-1 text-xs text-ink-muted">{formatDateTime(item.purchasedAt)}</Text>
          </View>
        )}
      />
      <FAB label={tt("pur.fab")} onPress={() => router.push("/purchase/new")} />
    </Screen>
  );
}