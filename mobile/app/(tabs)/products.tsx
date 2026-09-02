import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PaginatedList } from "@/components/features/PaginatedList";
import { FAB } from "@/components/ui/FAB";
import { ProductRow } from "@/components/ui/ProductRow";
import { SearchBar } from "@/components/ui/SearchBar";
import { Screen } from "@/components/ui/Screen";
import { useProducts, useShop } from "@/features/hooks";
import { usePagination } from "@/hooks/usePagination";
import { useT } from "@/i18n";
import type { Product } from "@/types/api";

export default function ProductsScreen() {
  const router = useRouter();
  const tt = useT();
  const { search, setSearch, page, setPage, nextPage, hasMore } = usePagination({ limit: 20 });
  const [searchInput, setSearchInput] = useState("");
  const { data, isLoading, isError, isFetching, refetch } = useProducts({ search, page, limit: 20 });
  const { data: shopData } = useShop();
  const currency = shopData?.currency ?? "RWF";

  useEffect(() => {
    setPage(1);
  }, [search, setPage]);

  return (
    <Screen scroll={false}>
      <View className="px-4 pt-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-extrabold tracking-tight text-ink">{tt("prod.title")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tt("prod.addAria")}
            onPress={() => router.push("/product/new")}
            className="h-11 w-11 items-center justify-center rounded-full bg-white active:bg-zinc-100"
          >
            <Ionicons name="add" size={24} color="#0F766E" />
          </Pressable>
        </View>
        <SearchBar value={searchInput} onChangeText={(v) => { setSearchInput(v); setSearch(v); }} placeholder={tt("prod.searchPh")} className="mt-3" />
        <View className="mt-3 flex-row items-center gap-1 px-1">
          <Ionicons name="information-circle-outline" size={14} color="#94A3B8" />
          <Text className="flex-1 text-xs text-ink-muted">
            {tt("prod.hint")}
          </Text>
        </View>
      </View>

      <PaginatedList
        className="mt-3 flex-1 px-4"
        isLoading={isLoading}
        isError={isError}
        data={data?.items ?? []}
        keyExtractor={(item: Product) => item.id}
        onRetry={() => refetch()}
        hasMore={hasMore(data)}
        loadingMore={isFetching}
        onEndReached={nextPage}
        empty={{
          title: tt("prod.emptyTitle"),
          message: tt("prod.emptyMessage"),
          action: (
            <Pressable
              onPress={() => router.push("/product/new")}
              className="h-12 items-center justify-center rounded-2xl bg-primary"
            >
              <Text className="font-semibold text-white">{tt("prod.add")}</Text>
            </Pressable>
          ),
        }}
        renderItem={({ item }: { item: Product }) => (
          <ProductRow product={item} currency={currency} onPress={() => router.push(`/product/${item.id}` as never)} />
        )}
      />
      <FAB onPress={() => router.push("/product/new")} />
    </Screen>
  );
}