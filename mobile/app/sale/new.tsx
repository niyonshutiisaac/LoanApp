import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SearchBar } from "@/components/ui/SearchBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SuccessOverlay } from "@/components/ui/SuccessOverlay";
import { useCreateSale, useCustomer, useCustomers, useProducts } from "@/features/hooks";
import { useAuthStore } from "@/store/auth";
import { formatDate } from "@/utils/date";
import { formatMoney, parseMoney } from "@/utils/money";
import type { Customer, PaymentType, Product } from "@/types/api";
import { ApiClientError } from "@/services/api/httpClient";
import { useT, useTpl } from "@/i18n";

interface DraftItem {
  key: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: string;
}

let draftKey = 0;
const nextKey = () => `draft_${++draftKey}`;

export default function NewSaleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; customerId?: string }>();
  const shop = useAuthStore((s) => s.shop);
  const currency = shop?.currency ?? "RWF";
  const tt = useT();
  const tpl = useTpl();

  const paymentOptions: { label: string; value: PaymentType }[] = [
    { label: tt("saf.paid"), value: "CASH" },
    { label: tt("saf.onCredit"), value: "CREDIT" },
    { label: tt("saf.partially"), value: "PARTIAL" },
  ];

  const [items, setItems] = useState<DraftItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>(
    params.mode === "credit" ? "CREDIT" : "CASH",
  );
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [partialPaid, setPartialPaid] = useState("");
  const [search, setSearch] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickPrice, setQuickPrice] = useState("");
  const [showCustomerSheet, setShowCustomerSheet] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addedSale, setAddedSale] = useState<{ total: string; customerName: string | null } | null>(null);

  const createSale = useCreateSale();
  const { data: productsData } = useProducts({ search, page: 1, limit: 50 });
  const { data: customersData } = useCustomers({ search: customerSearch, page: 1, limit: 30 });

  const preselectCustomerId = params.customerId ?? null;
  const preselectCustomer = useCustomer(preselectCustomerId ?? "");
  const [preselected, setPreselected] = useState<Customer | null>(null);
  if (preselectCustomer.data && preselectCustomer.data !== preselected) {
    setPreselected(preselectCustomer.data);
    setCustomer(preselectCustomer.data);
    setPaymentType("CREDIT");
  }

  const products = productsData?.items ?? [];
  const customers = customersData?.items ?? [];

  const total = useMemo(() => {
    let sum = 0;
    for (const item of items) {
      sum += item.quantity * (parseMoney(item.unitPrice || "0") || 0);
    }
    return sum;
  }, [items]);

  const needsCustomer = paymentType !== "CASH";

  function addProduct(product: Product) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.key === existing.key ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          key: nextKey(),
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.sellingPrice,
        },
      ];
    });
  }

  function addQuickItem() {
    const name = quickName.trim();
    const price = parseMoney(quickPrice || "0");
    if (!name || price <= 0) {
      setErrorMessage(tt("saf.errQuickItem"));
      return;
    }
    setItems((prev) => [...prev, { key: nextKey(), productId: null, productName: name, quantity: 1, unitPrice: price.toFixed(2) }]);
    setQuickName("");
    setQuickPrice("");
    setErrorMessage(null);
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  async function handleSave() {
    setErrorMessage(null);
    if (items.length === 0) {
      setErrorMessage(tt("saf.errNoItems"));
      return;
    }
    if (needsCustomer && !customer) {
      setErrorMessage(tt("saf.errNoCustomer"));
      return;
    }
    if (paymentType === "PARTIAL") {
      const paid = parseMoney(partialPaid || "0");
      if (paid <= 0) {
        setErrorMessage(tt("saf.errPartialAmount"));
        return;
      }
      if (paid >= total) {
        setErrorMessage(tt("saf.errPartialLess"));
        return;
      }
    }

    try {
      const sale = await createSale.mutateAsync({
        customerId: customer?.id ?? null,
        paymentType,
        paidAmount: paymentType === "PARTIAL" ? partialPaid : paymentType === "CREDIT" ? "0" : String(total),
        dueDate: needsCustomer && dueDate ? dueDate.toISOString() : null,
        notes: notes.trim() || null,
        items: items.map((i) => ({
          productId: i.productId ?? null,
          productName: i.productId ? undefined : i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      setAddedSale({ total: sale.totalAmount, customerName: sale.customerName });
      setShowSuccess(true);
    } catch (e) {
      setErrorMessage(e instanceof ApiClientError ? e.message : tt("saf.errRecord"));
    }
  }

  return (
    <>
      <Screen keyboard>
        <ScreenHeader title={tt("saf.newSale")} subtitle={needsCustomer ? tt("saf.onCredit") : tt("saf.cashSale")} />

        <SearchBar value={search} onChangeText={setSearch} placeholder={tt("saf.searchProduct")} className="mx-4" />

        {products.length > 0 && items.length < 12 ? (
          <View className="mx-4 max-h-40" style={{ maxHeight: 160 }}>
            {products.slice(0, 6).map((product) => (
              <Pressable
                key={product.id}
                accessibilityRole="button"
                onPress={() => addProduct(product)}
                className="flex-row items-center justify-between rounded-xl border-b border-zinc-100 bg-white px-4 py-2.5 active:bg-zinc-50"
              >
                <View className="flex-1">
                  <Text className="text-[15px] font-medium text-ink">{product.name}</Text>
                  <Text className="text-xs text-ink-muted">
                    {formatMoney(product.sellingPrice, currency)}
                    {product.stockQuantity <= 0 ? tpl("saf.outOfStock", {}) : tpl("saf.inStock", { n: product.stockQuantity })}
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
            <Text className="text-sm font-semibold text-ink-soft">{tt("saf.items")}</Text>
            {items.map((item) => (
              <View key={item.key} className="flex-row items-center gap-2 border-b border-zinc-100 py-2 last:border-0">
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-ink" numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <TextInput
                    value={item.unitPrice}
                    onChangeText={(v) => updateItem(item.key, { unitPrice: v.replace(/[^0-9]/g, "") })}
                    keyboardType="decimal-pad"
                    className="h-9 text-sm font-medium text-ink-soft"
                    accessibilityLabel={tpl("saf.priceOf", { n: item.productName })}
                  />
                </View>
                <View className="flex-row items-center gap-2.5">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tpl("saf.decrease", { n: item.productName })}
                    onPress={() => updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })}
                    className="h-8 w-8 items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200"
                  >
                    <Ionicons name="remove" size={16} color="#334155" />
                  </Pressable>
                  <Text className="w-6 text-center text-base font-bold text-ink">{item.quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tpl("saf.increase", { n: item.productName })}
                    onPress={() => updateItem(item.key, { quantity: item.quantity + 1 })}
                    className="h-8 w-8 items-center justify-center rounded-full bg-primary-50 active:bg-primary-100"
                  >
                    <Ionicons name="add" size={16} color="#0F766E" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tpl("saf.remove", { n: item.productName })}
                    onPress={() => removeItem(item.key)}
                    className="ml-1 h-8 w-8 items-center justify-center rounded-full bg-danger-50 active:bg-danger-100"
                  >
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
              <Ionicons name="bag-add-outline" size={30} color="#0F766E" />
              <Text className="text-sm text-ink-muted">
                {tt("saf.searchOrQuick")}
              </Text>
            </View>
            <View className="gap-2 border-t border-zinc-100 pt-3">
              <Text className="text-sm font-semibold text-ink-soft">{tt("saf.quickItem")}</Text>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Input placeholder={tt("saf.itemName")} value={quickName} onChangeText={setQuickName} />
                </View>
                <View className="w-28">
                  <Input placeholder={tt("saf.price")} value={quickPrice} onChangeText={setQuickPrice} keyboardType="decimal-pad" />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tt("common.addQuickItem")}
                  onPress={addQuickItem}
                  className="h-13 w-13 items-center justify-center rounded-2xl bg-primary-50"
                >
                  <Ionicons name="add" size={22} color="#0F766E" />
                </Pressable>
              </View>
            </View>
          </Card>
        )}

        <Card className="mx-4 gap-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowCustomerSheet(true)}
            className="flex-row items-center justify-between"
          >
            <View>
              <Text className="text-sm text-ink-muted">{tt("saf.customer")}</Text>
              <Text className="text-[15px] font-bold text-ink">
                {customer ? customer.name : tt("common.walkIn")}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#94A3B8" />
          </Pressable>
          <View className="border-t border-zinc-100 pt-3">
            <Text className="mb-1 text-sm text-ink-muted">{tt("saf.payment")}</Text>
            <SegmentedControl options={paymentOptions} value={paymentType} onChange={setPaymentType} tone="primary" />
            {paymentType === "PARTIAL" ? (
              <View className="mt-3 gap-1.5">
                <Text className="px-1 text-sm font-medium text-ink-soft">{tt("saf.paidNow")}</Text>
                <View className="h-13 flex-row items-center rounded-2xl border border-zinc-200 bg-white px-4">
                  <TextInput
                    value={partialPaid}
                    onChangeText={(v) => setPartialPaid(v.replace(/[^0-9]/g, ""))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#CBD5E1"
                    className="flex-1 text-lg font-semibold text-ink"
                    accessibilityLabel={tt("saf.partialAria")}
                  />
                  <Text className="text-sm text-ink-muted">{currency}</Text>
                </View>
                <Text className="px-1 text-xs text-ink-muted">
                  {tpl("saf.remainingOnCredit", { amt: formatMoney(Math.max(0, total - parseMoney(partialPaid || "0")), currency) })}
                </Text>
              </View>
            ) : null}
            {needsCustomer ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowDatePicker(true)}
                className="mt-3 flex-row items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3"
              >
                <View>
                  <Text className="text-xs text-ink-muted">{tt("common.dueDate")}</Text>
                  <Text className="text-[15px] font-semibold text-ink">{dueDate ? formatDate(dueDate.toISOString()) : tt("common.select")}</Text>
                </View>
                <Ionicons name="calendar-outline" size={20} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>
        </Card>

        <Input
          label={tt("common.notesOptional")}
          placeholder={tt("saf.notesPh")}
          value={notes}
          onChangeText={setNotes}
          className="mx-4"
        />

        {errorMessage ? (
          <View className="mx-4 flex-row items-center gap-2 rounded-2xl bg-danger-50 p-3">
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text className="flex-1 text-xs text-danger">{errorMessage}</Text>
          </View>
        ) : null}

        <View className="mx-4">
          <Button title={tpl("saf.completeSale", { total: formatMoney(total, currency) })} onPress={handleSave} loading={createSale.isPending} />
        </View>
        <Text className="pb-2 text-center text-[11px] text-ink-muted" onPress={() => void router.back()}>
          {tt("common.cancel")}
        </Text>
      </Screen>

      {showDatePicker ? (
        <DateTimePicker
          value={dueDate ?? new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === "ios");
            if (event.type === "set" && date) setDueDate(date);
          }}
        />
      ) : null}

      <BottomSheet visible={showCustomerSheet} onClose={() => setShowCustomerSheet(false)} title={tt("saf.chooseCustomer")}>
        <SearchBar value={customerSearch} onChangeText={setCustomerSearch} placeholder={tt("saf.searchCustomer")} />
        <View className="mt-2 max-h-96">
          <Pressable
            onPress={() => {
              setCustomer(null);
              setShowCustomerSheet(false);
            }}
            className={`h-14 flex-row items-center gap-3 rounded-2xl px-4 ${!customer ? "bg-primary-50" : ""}`}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <Ionicons name="walk" size={20} color="#475569" />
            </View>
            <Text className="flex-1 text-base text-ink">{tt("saf.walkInCash")}</Text>
            {!customer ? <Ionicons name="checkmark" size={18} color="#0F766E" /> : null}
          </Pressable>
          {customers.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => {
                setCustomer(c);
                setShowCustomerSheet(false);
              }}
              className={`h-14 flex-row items-center gap-3 rounded-2xl px-4 ${customer?.id === c.id ? "bg-primary-50" : ""}`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-50">
                <Text className="font-bold text-primary-800">{c.name.charAt(0)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base text-ink">{c.name}</Text>
                <Text className="text-xs text-ink-muted">{tpl("saf.customerOwes", { amt: formatMoney(c.balance, currency) })}</Text>
              </View>
              {customer?.id === c.id ? <Ionicons name="checkmark" size={18} color="#0F766E" /> : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <SuccessOverlay
        visible={showSuccess}
        title={tt("saf.saleRecorded")}
        amount={addedSale?.total}
        subtitle={addedSale?.customerName ? tpl("saf.onCreditFor", { name: addedSale.customerName }) : tt("saf.paymentReceived")}
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