import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SearchBar } from "@/components/ui/SearchBar";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SuccessOverlay } from "@/components/ui/SuccessOverlay";
import { useCreatePurchase, useProducts } from "@/features/hooks";
import { useAuthStore } from "@/store/auth";
import { formatMoney, parseMoney } from "@/utils/money";
import type { Product } from "@/types/api";
import { ApiClientError } from "@/services/api/httpClient";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useT, useTpl } from "@/i18n";

interface DraftItem {
  key: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  unitCost: string;
}

let draftKey = 0;
const nextKey = () => `pd_${++draftKey}`;

export default function NewPurchaseScreen() {
  const router = useRouter();
  const shop = useAuthStore((s) => s.shop);
  const currency = shop?.currency ?? "RWF";
  const tt = useT();
  const tpl = useTpl();
  const [items, setItems] = useState<DraftItem[]>([]);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickCost, setQuickCost] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [addedTotal, setAddedTotal] = useState<string>("0");
  const [paidNow, setPaidNow] = useState<"full" | "unpaid" | "partial">("full");

  const createPurchase = useCreatePurchase();
  const { data: productsData } = useProducts({ search, page: 1, limit: 50 });
  const products = productsData?.items ?? [];

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * (parseMoney(i.unitCost || "0") || 0), 0),
    [items],
  );

  function addProduct(product: Product) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => (i.key === existing.key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { key: nextKey(), productId: product.id, productName: product.name, quantity: 1, unitCost: product.buyingPrice }];
    });
  }

  function addQuickItem() {
    const name = quickName.trim();
    const cost = parseMoney(quickCost || "0");
    if (!name || cost <= 0) {
      setErrorMessage(tt("puf2.errQuickItem"));
      return;
    }
    setItems((prev) => [...prev, { key: nextKey(), productId: null, productName: name, quantity: 1, unitCost: cost.toFixed(2) }]);
    setQuickName("");
    setQuickCost("");
    setErrorMessage(null);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  async function handleSave() {
    setErrorMessage(null);
    if (items.length === 0) {
      setErrorMessage(tt("puf2.errNoItems"));
      return;
    }
    const paymentAmount =
      paidNow === "full" ? String(total) : paidNow === "unpaid" ? "0" : "0";
    try {
      const purchase = await createPurchase.mutateAsync({
        paymentAmount,
        notes: notes.trim() || null,
        items: items.map((i) => ({
          productId: i.productId ?? null,
          productName: i.productId ? undefined : i.productName,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
      });
      setAddedTotal(purchase.totalAmount);
      setShowSuccess(true);
    } catch (e) {
      setErrorMessage(e instanceof ApiClientError ? e.message : tt("puf2.errRecord"));
    }
  }

  return (
    <>
      <Screen keyboard>
        <ScreenHeader title={tt("puf2.newPurchase")} subtitle={tt("puf2.subtitle")} />
        <SearchBar value={search} onChangeText={setSearch} placeholder={tt("puf2.searchProducts")} className="mx-4" />

        {products.length > 0 ? (
          <View className="mx-4">
            {products.slice(0, 6).map((product) => (
              <Pressable
                key={product.id}
                onPress={() => addProduct(product)}
                className="flex-row items-center justify-between rounded-xl border-b border-zinc-100 bg-white px-4 py-2.5 active:bg-zinc-50"
              >
                <View className="flex-1">
                  <Text className="text-[15px] font-medium text-ink">{product.name}</Text>
                  <Text className="text-xs text-ink-muted">
                    {tpl("puf2.buyLine", { p: formatMoney(product.buyingPrice, currency), n: product.stockQuantity })}
                  </Text>
                </View>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-50">
                  <Ionicons name="add" size={18} color="#0F766E" />
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {items.length > 0 ? (
          <Card className="mx-4 gap-1">
            <Text className="text-sm font-semibold text-ink-soft">{tt("puf2.itemsBought")}</Text>
            {items.map((item) => (
              <View key={item.key} className="flex-row items-center gap-2 border-b border-zinc-100 py-2 last:border-0">
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-ink" numberOfLines={1}>{item.productName}</Text>
                  <TextInput
                    value={item.unitCost}
                    onChangeText={(v) => updateItem(item.key, { unitCost: v.replace(/[^0-9]/g, "") })}
                    keyboardType="decimal-pad"
                    className="h-9 text-sm font-medium text-ink-soft"
                    accessibilityLabel={tpl("puf2.costOf", { n: item.productName })}
                  />
                </View>
                <View className="flex-row items-center gap-2.5">
                  <Pressable onPress={() => updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })} className="h-8 w-8 items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200" accessibilityRole="button" accessibilityLabel={tpl("saf.decrease", { n: item.productName })}>
                    <Ionicons name="remove" size={16} color="#334155" />
                  </Pressable>
                  <Text className="w-6 text-center text-base font-bold text-ink">{item.quantity}</Text>
                  <Pressable onPress={() => updateItem(item.key, { quantity: item.quantity + 1 })} className="h-8 w-8 items-center justify-center rounded-full bg-primary-50 active:bg-primary-100" accessibilityRole="button" accessibilityLabel={tpl("saf.increase", { n: item.productName })}>
                    <Ionicons name="add" size={16} color="#0F766E" />
                  </Pressable>
                  <Pressable onPress={() => setItems((prev) => prev.filter((i) => i.key !== item.key))} className="ml-1 h-8 w-8 items-center justify-center rounded-full bg-danger-50" accessibilityRole="button" accessibilityLabel={tpl("saf.remove", { n: item.productName })}>
                    <Ionicons name="trash-outline" size={15} color="#DC2626" />
                  </Pressable>
                </View>
              </View>
            ))}
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-base font-bold text-ink">{tt("common.total")}</Text>
              <Text className="text-xl font-extrabold text-ink">{formatMoney(total, currency)}</Text>
            </View>
          </Card>
        ) : (
          <Card className="mx-4">
            <View className="items-center gap-2 py-4">
              <Ionicons name="cart-outline" size={30} color="#0F766E" />
              <Text className="text-sm text-ink-muted">{tt("puf2.searchOrQuick")}</Text>
            </View>
            <View className="gap-2 border-t border-zinc-100 pt-3">
              <Text className="text-sm font-semibold text-ink-soft">{tt("puf2.quickItem")}</Text>
              <View className="flex-row gap-2">
                <View className="flex-1"><Input placeholder={tt("saf.itemName")} value={quickName} onChangeText={setQuickName} /></View>
                <View className="w-28"><Input placeholder={tt("puf2.cost")} value={quickCost} onChangeText={setQuickCost} keyboardType="decimal-pad" /></View>
                <Pressable onPress={addQuickItem} className="h-13 w-13 items-center justify-center rounded-2xl bg-primary-50" accessibilityRole="button" accessibilityLabel={tt("common.addQuickItem")}>
                  <Ionicons name="add" size={22} color="#0F766E" />
                </Pressable>
              </View>
            </View>
          </Card>
        )}

        <Card className="mx-4 gap-2">
          <Text className="text-sm font-semibold text-ink-soft">{tt("puf2.howPaid")}</Text>
          <SegmentedControl
            options={[
              { label: tt("puf2.paidInFull"), value: "full" },
              { label: tt("puf2.notPaid"), value: "unpaid" },
            ]}
            value={paidNow}
            onChange={(v) => setPaidNow(v as "full" | "unpaid")}
            tone="primary"
          />
        </Card>

        <Input label={tt("common.notesOptional")} placeholder={tt("puf2.notesPh")} value={notes} onChangeText={setNotes} className="mx-4" />

        {errorMessage ? (
          <View className="mx-4 flex-row items-center gap-2 rounded-2xl bg-danger-50 p-3">
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text className="flex-1 text-xs text-danger">{errorMessage}</Text>
          </View>
        ) : null}

        <View className="mx-4">
          <Button title={tpl("puf2.record", { total: formatMoney(total, currency) })} onPress={handleSave} loading={createPurchase.isPending} />
        </View>
        <Text className="pb-2 text-center text-[11px] text-ink-muted" onPress={() => router.back()}>{tt("common.cancel")}</Text>
      </Screen>

      <SuccessOverlay
        visible={showSuccess}
        title={tt("puf2.recorded")}
        amount={addedTotal}
        subtitle={tt("puf2.stockUpdated")}
        currency={currency}
        buttonLabel={tt("common.done")}
        onDone={() => {
          setShowSuccess(false);
          router.back();
        }}
      />
    </>
  );
}