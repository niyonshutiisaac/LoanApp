import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PaginatedList } from "@/components/features/PaginatedList";
import { Badge } from "@/components/ui/Badge";
import { FAB } from "@/components/ui/FAB";
import { SearchBar } from "@/components/ui/SearchBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Screen } from "@/components/ui/Screen";
import { useSales, useShop } from "@/features/hooks";
import { usePagination } from "@/hooks/usePagination";
import { formatDateTime, formatDateShort } from "@/utils/date";
import { formatMoney } from "@/utils/money";
import type { Sale } from "@/types/api";
import { useT, useTpl, type TranslationKey } from "@/i18n";

const paymentTone = (type: Sale["paymentType"]) =>
  type === "CASH" ? "success" : type === "CREDIT" ? "danger" : "warning";

const paymentLabel = (type: Sale["paymentType"]): TranslationKey =>
  type === "CASH" ? "sales.paymentType" : type === "CREDIT" ? "sales.paymentTypeCredit" : "sales.paymentTypePartial";

export default function SalesScreen() {
  const router = useRouter();
  const tt = useT();
  const tpl = useTpl();
  const { search, setSearch, page, setPage, nextPage, hasMore } = usePagination();
  const [type, setType] = useState<"all" | "cash" | "credit">("all");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, isError, isFetching, refetch } = useSales({
    search,
    type: type === "all" ? undefined : type,
    page,
    limit: 20,
  });
  const { data: shopData } = useShop();
  const currency = shopData?.currency ?? "RWF";

  useEffect(() => {
    setPage(1);
  }, [type, search, setPage]);

  return (
    <Screen scroll={false}>
      <View className="px-4 pt-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-extrabold tracking-tight text-ink">{tt("sales.title")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tt("sales.summaryAria")}
            onPress={() => router.push("/reports")}
            className="h-10 w-10 items-center justify-center rounded-full bg-white active:bg-zinc-100"
          >
            <Ionicons name="bar-chart-outline" size={20} color="#0F766E" />
          </Pressable>
        </View>
        <SearchBar value={searchInput} onChangeText={(v) => { setSearchInput(v); setSearch(v); }} placeholder={tt("sales.searchPh")} className="mt-3" />
        <SegmentedControl
          className="mt-3"
          options={[
            { label: tt("common.all"), value: "all" },
            { label: tt("sales.cash"), value: "cash" },
            { label: tt("sales.credit"), value: "credit" },
          ]}
          value={type}
          onChange={setType}
        />
      </View>

      <PaginatedList
        className="mt-3 flex-1 px-4"
        isLoading={isLoading}
        isError={isError}
        data={data?.items ?? []}
        keyExtractor={(item: Sale) => item.id}
        onRetry={() => refetch()}
        hasMore={hasMore(data)}
        loadingMore={isFetching}
        onEndReached={nextPage}
        empty={{
          title: tt("sales.emptyTitle"),
          message: tt("sales.emptyMessage"),
          action: (
            <Pressable
              onPress={() => router.push("/sale/new")}
              className="h-12 items-center justify-center rounded-2xl bg-primary"
            >
              <Text className="font-semibold text-white">{tt("sales.newSale")}</Text>
            </Pressable>
          ),
        }}
        renderItem={({ item }: { item: Sale }) => (
          <View className="rounded-2xl border border-zinc-200/80 bg-white p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-ink">
                  {item.customerName ?? tt("sales.walkIn")}
                </Text>
                <Text className="text-xs text-ink-muted">
                  {formatDateTime(item.soldAt)}
                </Text>
              </View>
              <Text className="text-base font-bold text-ink">{formatMoney(item.totalAmount, currency)}</Text>
            </View>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="flex-1 pr-3 text-xs text-ink-soft" numberOfLines={1}>
                {item.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}
              </Text>
              <View className="flex-row items-center gap-2">
                {item.paymentType === "PARTIAL" && Number(item.remainingAmount) > 0 ? (
                  <Text className="text-[11px] font-medium text-warning">
                    {tpl("sales.xLeft", { n: formatMoney(item.remainingAmount, currency) })}
                  </Text>
                ) : null}
                {item.dueDate && Number(item.remainingAmount) > 0 ? (
                  <Text className="text-[11px] text-ink-muted">{tpl("sales.due", { d: formatDateShort(item.dueDate) })}</Text>
                ) : null}
                <Badge label={tt(paymentLabel(item.paymentType))} tone={paymentTone(item.paymentType)} />
              </View>
            </View>
          </View>
        )}
      />
      <FAB label={tt("sales.newSaleFAB")} onPress={() => router.push("/sale/new")} />
    </Screen>
  );
}