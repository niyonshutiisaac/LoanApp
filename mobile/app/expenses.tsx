import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { PaginatedList } from "@/components/features/PaginatedList";
import { FAB } from "@/components/ui/FAB";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useExpenses, useShop } from "@/features/hooks";
import { usePagination } from "@/hooks/usePagination";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/date";
import type { Expense } from "@/types/api";
import { useT } from "@/i18n";
import { expenseCategoryKey } from "@/constants/expenseCategories";

export default function ExpensesScreen() {
  const router = useRouter();
  const tt = useT();
  const { page, nextPage, hasMore } = usePagination({ limit: 20 });
  const { data, isLoading, isError, isFetching, refetch } = useExpenses({ page, limit: 20 });
  const { data: shopData } = useShop();
  const currency = shopData?.currency ?? "RWF";

  return (
    <Screen scroll={false}>
      <ScreenHeader title={tt("exs.title")} subtitle={tt("exs.subtitle")} />
      <PaginatedList
        className="flex-1 px-4"
        isLoading={isLoading}
        isError={isError}
        data={data?.items ?? []}
        keyExtractor={(item: Expense) => item.id}
        onRetry={() => refetch()}
        hasMore={hasMore(data)}
        loadingMore={isFetching}
        onEndReached={nextPage}
        empty={{
          title: tt("exs.emptyTitle"),
          message: tt("exs.emptyMessage"),
        }}
        renderItem={({ item }: { item: Expense }) => (
          <View className="flex-row items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-warning-100">
              <Text className="text-xs font-bold text-warning">{item.category.charAt(0)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-ink">{tt(expenseCategoryKey(item.category))}</Text>
              <Text className="text-xs text-ink-muted">
                {item.description ?? tt("exs.fallback")} · {formatDateTime(item.expenseDate)}
              </Text>
            </View>
            <Text className="text-base font-bold text-danger">-{formatMoney(item.amount, currency)}</Text>
          </View>
        )}
      />
      <FAB label={tt("exs.fab")} onPress={() => router.push("/expense/new")} />
    </Screen>
  );
}