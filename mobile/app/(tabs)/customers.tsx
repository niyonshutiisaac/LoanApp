import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PaginatedList } from "@/components/features/PaginatedList";
import { CustomerRow } from "@/components/ui/CustomerRow";
import { FAB } from "@/components/ui/FAB";
import { SearchBar } from "@/components/ui/SearchBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Screen } from "@/components/ui/Screen";
import { useCustomers, useShop } from "@/features/hooks";
import { usePagination } from "@/hooks/usePagination";
import { useT } from "@/i18n";
import type { Customer } from "@/types/api";

type StatusFilter = "all" | "owed" | "overdue";

export default function CustomersScreen() {
  const router = useRouter();
  const tt = useT();
  const { search, setSearch, page, setPage, nextPage, hasMore } = usePagination({ limit: 30 });
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const { data, isLoading, isError, isFetching, refetch } = useCustomers({
    search,
    status,
    page,
    limit: 30,
  });
  const { data: shopData } = useShop();
  const currency = shopData?.currency ?? "RWF";

  useEffect(() => {
    setPage(1);
  }, [status, search, setPage]);

  const emptyMessage = useMemo(() => {
    if (status === "owed") return tt("cust.owedEmpty");
    if (status === "overdue") return tt("cust.overdueEmpty");
    return tt("cust.firstEmpty");
  }, [status, tt]);

  return (
    <Screen scroll={false}>
      <View className="px-4 pt-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-extrabold tracking-tight text-ink">{tt("cust.title")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tt("cust.addAria")}
            onPress={() => router.push("/customer/new")}
            className="h-11 w-11 items-center justify-center rounded-full bg-white active:bg-zinc-100"
          >
            <Ionicons name="person-add" size={22} color="#0F766E" />
          </Pressable>
        </View>
        <SearchBar value={searchInput} onChangeText={(v) => { setSearchInput(v); setSearch(v); }} placeholder={tt("cust.searchPh")} className="mt-3" />
        <SegmentedControl
          options={[
            { label: tt("common.all"), value: "all" },
            { label: tt("cust.owing"), value: "owed" },
            { label: tt("cust.overdue"), value: "overdue" },
          ]}
          value={status}
          onChange={setStatus}
          className="mt-3"
        />
      </View>

      <PaginatedList
        className="mt-3 flex-1 px-4"
        isLoading={isLoading}
        isError={isError}
        data={data?.items ?? []}
        keyExtractor={(item: Customer) => item.id}
        onRetry={() => refetch()}
        hasMore={hasMore(data)}
        loadingMore={isFetching}
        onEndReached={nextPage}
        empty={{
          title: status === "all" ? tt("cust.noCustomers") : tt("cust.nothingHere"),
          message: emptyMessage,
        }}
        renderItem={({ item }: { item: Customer }) => (
          <CustomerRow customer={item} currency={currency} onPress={() => router.push(`/customer/${item.id}`)} />
        )}
      />
      <FAB onPress={() => router.push("/customer/new")} />
    </Screen>
  );
}