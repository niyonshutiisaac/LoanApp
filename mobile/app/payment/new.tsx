import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { MoneyText } from "@/components/ui/MoneyText";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SuccessOverlay } from "@/components/ui/SuccessOverlay";
import { useCustomer, useCustomers, useCreatePayment } from "@/features/hooks";
import { useAuthStore } from "@/store/auth";
import { formatMoney, parseMoney } from "@/utils/money";
import { ApiClientError } from "@/services/api/httpClient";
import { useT, useTpl } from "@/i18n";

type Method = "CASH" | "MOBILE_MONEY";

export default function NewPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ customerId?: string }>();
  const shop = useAuthStore((s) => s.shop);
  const currency = shop?.currency ?? "RWF";
  const tt = useT();
  const tpl = useTpl();
  const [customerId, setCustomerId] = useState<string | null>(params.customerId ?? null);
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<string>("0");
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: customer } = useCustomer(customerId ?? "");
  const { data: customersData } = useCustomers({ search, page: 1, limit: 30 });
  const customers = customersData?.items ?? [];
  const createPayment = useCreatePayment();

  const enterAmount = parseMoney(amount || "0");
  const customerBalance = Number(customer?.balance ?? 0);
  const exceeds = customerBalance > 0 && enterAmount > customerBalance;

  async function handleSave() {
    setErrorMessage(null);
    if (!customerId) {
      setErrorMessage(tt("payf.errChooseCustomer"));
      return;
    }
    if (enterAmount <= 0) {
      setErrorMessage(tt("payf.errAmount"));
      return;
    }
    if (exceeds) {
      setErrorMessage(tpl("payf.errExceeds", { amt: formatMoney(customerBalance, currency) }));
      return;
    }
    try {
      const payment = await createPayment.mutateAsync({
        customerId,
        amount: amount,
        method,
      });
      setRemaining(payment.balanceAfter);
      setShowSuccess(true);
    } catch (e) {
      setErrorMessage(e instanceof ApiClientError ? e.message : tt("payf.errRecord"));
    }
  }

  if (customerId && !customer) {
    return <Screen scroll={false}><LoadingState /></Screen>;
  }

  return (
    <>
      <Screen keyboard>
        <ScreenHeader title={tt("payf.title")} subtitle={tt("payf.subtitle")} />

        <View className="gap-4 px-1">
          {!customerId ? (
            <View className="gap-2">
              <Input label={tt("payf.searchLabel")} placeholder={tt("payf.searchPh")} value={search} onChangeText={setSearch} />
              {customers.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setCustomerId(c.id)}
                  className="flex-row items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 active:bg-zinc-50"
                >
                  <Text className="text-[15px] font-semibold text-ink">{c.name}</Text>
                  <Text className="text-xs font-medium text-danger">{tpl("saf.customerOwes", { amt: formatMoney(c.balance, currency) })}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <>
              <Card>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-sm text-ink-muted">{tpl("payf.customerOwes", { name: customer?.name ?? "" })}</Text>
                    <MoneyText amount={customerBalance} currency={currency} size="xl" tone={customerBalance > 0 ? "danger" : "success"} className="mt-0.5" />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tt("payf.changeCustomer")}
                    onPress={() => setCustomerId(null)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200"
                  >
                    <Ionicons name="swap-horizontal" size={18} color="#475569" />
                  </Pressable>
                </View>
              </Card>

              <View className="gap-1.5">
                <Text className="px-1 text-sm font-medium text-ink-soft">{tt("payf.howMuch")}</Text>
                <View className={`h-13 flex-row items-center rounded-2xl border bg-white px-4 ${exceeds ? "border-danger" : "border-zinc-200"}`}>
                  <TextInput
                    value={amount}
                    onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ""))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#CBD5E1"
                    className="flex-1 text-lg font-semibold text-ink"
                    accessibilityLabel={tt("payf.amountAria")}
                    autoFocus
                  />
                  <Text className="text-sm text-ink-muted">{currency}</Text>
                </View>
                {exceeds ? (
                  <Text className="px-1 text-xs text-danger">
                    {tpl("payf.exceedsMsg", { amt: formatMoney(customerBalance, currency) })}
                  </Text>
                ) : (
                  <Text className="px-1 text-xs text-ink-muted">
                    {customerBalance > 0
                      ? tpl("payf.remainingAfter", { amt: formatMoney(Math.max(0, customerBalance - enterAmount), currency) })
                      : tt("payf.nothingOutstanding")}
                  </Text>
                )}
              </View>

              <View className="gap-2">
                <Text className="px-1 text-sm font-medium text-ink-soft">{tt("payf.howDidTheyPay")}</Text>
                <SegmentedControl
                  options={[
                    { label: tt("common.cash"), value: "CASH" },
                    { label: tt("common.mobileMoney"), value: "MOBILE_MONEY" },
                  ]}
                  value={method}
                  onChange={(v) => setMethod(v as Method)}
                  tone="primary"
                />
              </View>
            </>
          )}

          {errorMessage ? (
            <View className="flex-row items-center gap-2 rounded-2xl bg-danger-50 p-3">
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text className="flex-1 text-xs text-danger">{errorMessage}</Text>
            </View>
          ) : null}

          {customerId ? (
            <Button
              title={tpl("payf.save", { total: formatMoney(enterAmount, currency) })}
              onPress={handleSave}
              loading={createPayment.isPending}
              disabled={enterAmount <= 0}
              fullWidth
            />
          ) : null}
        </View>
      </Screen>

      <SuccessOverlay
        visible={showSuccess}
        title={tt("payf.recorded")}
        amount={amount}
        subtitle={tpl("payf.remainingFor", { name: customer?.name ?? "", amt: formatMoney(remaining, currency) })}
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