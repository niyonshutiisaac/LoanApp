import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MoneyText } from "@/components/ui/MoneyText";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Badge } from "@/components/ui/Badge";
import { useReport, useShop } from "@/features/hooks";
import { formatMoneyShort, formatMoney } from "@/utils/money";
import { formatDateShort, toIsoDate } from "@/utils/date";
import type { PeriodKey } from "@/types/api";
import { useT, useTpl, type TranslationKey } from "@/i18n";

const PERIODS: { labelKey: TranslationKey; value: PeriodKey }[] = [
  { labelKey: "rep.today", value: "today" },
  { labelKey: "rep.week", value: "week" },
  { labelKey: "rep.month", value: "month" },
];

function rangeFor(period: PeriodKey): { from: string; to: string } {
  const now = dayjs();
  if (period === "today") return { from: toIsoDate(now.toDate()), to: toIsoDate(now.toDate()) };
  if (period === "week") return { from: toIsoDate(now.startOf("week").toDate()), to: toIsoDate(now.toDate()) };
  return { from: toIsoDate(now.startOf("month").toDate()), to: toIsoDate(now.toDate()) };
}

export default function ReportsScreen() {
  const tt = useT();
  const tpl = useTpl();
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodKey>("today");
  const { from, to } = useMemo(() => rangeFor(period), [period]);
  const { data, isLoading, isError, refetch } = useReport({ from, to });
  const { data: shopData } = useShop();
  const currency = shopData?.currency ?? "RWF";

  return (
    <Screen>
      <ScreenHeader title={tt("rep.title")} subtitle={tt("rep.subtitle")} />
      <SegmentedControl
        options={PERIODS.map((p) => ({ label: tt(p.labelKey), value: p.value }))}
        value={period}
        onChange={setPeriod}
        tone="primary"
        className="mx-4"
      />
      <Text className="mx-4 px-1 text-xs text-ink-muted">
        {formatDateShort(from)} — {formatDateShort(to)}
      </Text>

      {isLoading && !data ? <LoadingState /> : null}
      {isError && !data ? <ErrorState message={tt("rep.loadError")} onRetry={() => refetch()} /> : null}
      {data ? (
        <>
          <Card className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-ink">{tt("rep.sales")}</Text>
              <Badge label={tpl("rep.salesCount", { n: data.salesCount })} tone="primary" />
            </View>
            <MoneyText amount={data.sales} currency={currency} size="xl" className="mt-0" />
            <View className="flex-row border-t border-zinc-100 pt-3">
              <View className="flex-1">
                <Text className="text-[11px] uppercase tracking-wide text-ink-muted">{tt("rep.cashReceived")}</Text>
                <Text className="mt-0.5 text-sm font-bold text-success">{formatMoney(data.cashReceived, currency)}</Text>
              </View>
              <View className="flex-1 border-l border-zinc-100 pl-3">
                <Text className="text-[11px] uppercase tracking-wide text-ink-muted">{tt("rep.onCredit")}</Text>
                <Text className="mt-0.5 text-sm font-bold text-danger">{formatMoney(data.creditSales, currency)}</Text>
              </View>
            </View>
          </Card>

          <View className="flex-row gap-3">
            <Card className="flex-1">
              <Text className="text-[11px] uppercase tracking-wide text-ink-muted">{tt("rep.purchases")}</Text>
              <Text className="mt-1 text-xl font-bold text-ink">{formatMoneyShort(data.purchases, currency)}</Text>
            </Card>
            <Card className="flex-1">
              <Text className="text-[11px] uppercase tracking-wide text-ink-muted">{tt("rep.expenses")}</Text>
              <Text className="mt-1 text-xl font-bold text-ink">{formatMoneyShort(data.expenses, currency)}</Text>
            </Card>
          </View>

          <Card className="border-success-100 bg-success-50">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-semibold text-ink">{tt("rep.estimatedProfit")}</Text>
                <Text className="text-[11px] text-ink-muted">{tt("rep.profitFormula")}</Text>
              </View>
              <Text className={`text-2xl font-extrabold ${Number(data.estimatedProfit) >= 0 ? "text-success" : "text-danger"}`}>
                {formatMoney(data.estimatedProfit, currency)}
              </Text>
            </View>
          </Card>

          <View className="gap-2">
            <Text className="px-1 text-sm font-semibold text-ink-soft">{tt("rep.customersOwing")}</Text>
            {data.customerDebts.length === 0 ? (
              <Card>
                <EmptyState icon="checkmark-circle-outline" title={tt("rep.noDebts")} message={tt("rep.noDebtsMsg")} />
              </Card>
            ) : (
              data.customerDebts.slice(0, 8).map((debt) => (
                <Pressable
                  key={debt.customerId}
                  onPress={() => router.push(`/customer/${debt.customerId}`)}
                  className="rounded-2xl border border-zinc-200/80 bg-white p-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-ink">{debt.customerName}</Text>
                      <Text className="text-xs text-ink-muted">
                        {debt.daysOverdue !== null
                          ? debt.daysOverdue === 1
                            ? tt("rep.daysOverdue1")
                            : tpl("rep.daysOverdueN", { n: debt.daysOverdue })
                          : debt.nextDueDate
                            ? tpl("rep.due", { d: formatDateShort(debt.nextDueDate) })
                            : tt("rep.noDueDate")}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-danger">{formatMoney(debt.balance, currency)}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          <View className="flex-row items-center gap-1.5 px-2">
            <Ionicons name="information-circle-outline" size={14} color="#94A3B8" />
            <Text className="flex-1 text-[11px] leading-4 text-ink-muted">
              {tt("rep.profitInfo")}
            </Text>
          </View>
        </>
      ) : null}
    </Screen>
  );
}