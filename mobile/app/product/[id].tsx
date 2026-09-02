import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MoneyText } from "@/components/ui/MoneyText";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useProduct, useShop } from "@/features/hooks";
import { useT, useTpl } from "@/i18n";
import { productsApi } from "@/services/api";
import { queryClient } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/api";
import { formatMoney } from "@/utils/money";
import { ApiClientError } from "@/services/api/httpClient";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tt = useT();
  const tpl = useTpl();
  const { data: product, isLoading, isError, refetch } = useProduct(id);
  const { data: shopData } = useShop();
  const currency = shopData?.currency ?? "RWF";
  const [adjustSheet, setAdjustSheet] = useState(false);
  const [adjustValue, setAdjustValue] = useState("");
  const [confirmAdjust, setConfirmAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  if (isLoading) return <Screen scroll={false}><LoadingState /></Screen>;
  if (isError || !product) {
    return <Screen scroll={false}><ErrorState message={tt("prd.loadError")} onRetry={() => refetch()} /></Screen>;
  }

  const profit = Number(product.sellingPrice) - Number(product.buyingPrice);
  const lowStock = product.stockQuantity <= product.lowStockThreshold;

  async function applyAdjustment() {
    const qty = Number(adjustValue);
    if (!Number.isFinite(qty) || qty === 0) {
      setAdjustError(tt("prd.adjustValueError"));
      return;
    }
    setConfirmAdjust(false);
    try {
      await productsApi.adjustStock(product!.id, qty);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      queryClient.invalidateQueries({ queryKey: ["products", "detail", product!.id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      setAdjustSheet(false);
      setAdjustValue("");
      setAdjustError(null);
    } catch (e) {
      setAdjustError(e instanceof ApiClientError ? e.message : tt("prd.adjustFailed"));
    }
  }

  return (
    <>
      <Screen>
        <ScreenHeader
          title={product.name}
          subtitle={product.sku ?? (product.unit ? tpl("prd.soldBy", { u: product.unit }) : undefined)}
          right={
            <Pressable
              onPress={() => router.push(`/product/new?editId=${product.id}`)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={tt("prd.editAria")}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-zinc-100"
            >
              <Ionicons name="create-outline" size={22} color="#0F766E" />
            </Pressable>
          }
        />

        <Card className="items-center gap-1">
          <Text className="text-sm text-ink-muted">{tt("prd.stockNow")}</Text>
          <Text className={`text-4xl font-extrabold ${
            product.stockQuantity <= 0 ? "text-danger" : lowStock ? "text-warning" : "text-ink"
          }`}>
            {product.stockQuantity}
          </Text>
          <Text className="text-xs text-ink-muted">
            {product.stockQuantity <= 0
              ? tt("prd.outOfStock")
              : lowStock
                ? tpl("prd.lowAlert", { n: product.lowStockThreshold })
                : tpl("prd.allGoodAlert", { n: product.lowStockThreshold })}
          </Text>
          {(product.stockQuantity <= 0 || lowStock) ? (
            <Badge label={product.stockQuantity <= 0 ? tt("prd.outOfStock") : tt("common.lowStock")} tone={product.stockQuantity <= 0 ? "danger" : "warning"} className="mt-1" />
          ) : null}
          <Button title={tt("prd.adjustStock")} variant="outline" size="sm" className="mt-3" onPress={() => setAdjustSheet(true)} />
        </Card>

        <View className="flex-row gap-3">
          <Card className="flex-1">
            <Text className="text-[11px] uppercase tracking-wide text-ink-muted">{tt("prd.buyingPrice")}</Text>
            <MoneyText amount={product.buyingPrice} currency={currency} size="lg" className="mt-1" />
          </Card>
          <Card className="flex-1">
            <Text className="text-[11px] uppercase tracking-wide text-ink-muted">{tt("prd.sellingPrice")}</Text>
            <MoneyText amount={product.sellingPrice} currency={currency} size="lg" className="mt-1" />
          </Card>
        </View>

        <Card>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-medium text-ink-soft">{tpl("prd.profitPer", { u: product.unit ?? tt("common.unit") })}</Text>
              <Text className={`mt-0.5 text-lg font-bold ${profit >= 0 ? "text-success" : "text-danger"}`}>
                {formatMoney(profit, currency)}
              </Text>
            </View>
            <Badge label={profit >= 0 ? tt("prd.goodMargin") : tt("prd.belowCost")} tone={profit >= 0 ? "success" : "danger"} />
          </View>
        </Card>

        <ConfirmDialog
          visible={confirmArchive}
          title={tt("prd.archiveTitle")}
          message={tt("prd.archiveMessage")}
          confirmLabel={tt("prd.archive")}
          destructive
          onCancel={() => setConfirmArchive(false)}
          onConfirm={() => {
            productsApi.archive(product.id).then(() => {
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
              router.back();
            });
          }}
        />
      </Screen>

      <BottomSheet visible={adjustSheet} onClose={() => setAdjustSheet(false)} title={tt("prd.adjustTitle")}>
        <Text className="mb-3 text-sm text-ink-soft">
          {tt("prd.adjustHint")}
        </Text>
        <Input
          placeholder={tt("prd.adjustPh")}
          keyboardType="number-pad"
          value={adjustValue}
          onChangeText={(v) => setAdjustValue(v.startsWith("-") ? `-${v.replace(/[^0-9]/g, "")}` : v.replace(/[^0-9]/g, ""))}
          error={adjustError ?? undefined}
        />
        <Button title={tt("common.apply")} className="mt-4" onPress={() => setConfirmAdjust(true)} />
      </BottomSheet>

      <ConfirmDialog
        visible={confirmAdjust}
        title={tt("prd.applyTitle")}
        message={tpl("prd.applyMessage", { name: product.name })}
        confirmLabel={tt("common.apply")}
        onCancel={() => setConfirmAdjust(false)}
        onConfirm={applyAdjustment}
      />
    </>
  );
}