import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { ActivityRow } from "@/components/ui/ActivityRow";
import { Card } from "@/components/ui/Card";
import { CustomerRow } from "@/components/ui/CustomerRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MoneyText } from "@/components/ui/MoneyText";
import { Screen } from "@/components/ui/Screen";
import { StatCard } from "@/components/ui/StatCard";
import { useDashboard } from "@/features/hooks";
import { useT, useTpl, type TranslationKey } from "@/i18n";
import { useAuthStore } from "@/store/auth";
import { formatMoneyShort } from "@/utils/money";
import { greetingForHour } from "@/utils/date";

const QUICK_ACTIONS: {
  key: string;
  labelKey: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
}[] = [
  { key: "sale", labelKey: "dash.actionSale", icon: "bag-handle-outline" as const, tone: "bg-primary" as const },
  { key: "credit", labelKey: "dash.actionCreditSale", icon: "book-outline" as const, tone: "bg-danger" as const },
  { key: "payment", labelKey: "dash.actionPayment", icon: "cash-outline" as const, tone: "bg-success" as const },
  { key: "purchase", labelKey: "dash.actionPurchase", icon: "cart-outline" as const, tone: "bg-info" as const },
  { key: "expense", labelKey: "dash.actionExpense", icon: "receipt-outline" as const, tone: "bg-warning" as const },
];

export default function DashboardScreen() {
  const router = useRouter();
  const tt = useT();
  const tpl = useTpl();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch, isRefetching } = useDashboard();

  if (isLoading && !data) return <Screen scroll={false}><LoadingState label={tt("dash.loading")} /></Screen>;
  if (isError || !data) {
    return (
      <Screen scroll={false}>
        <ErrorState message={tt("dash.loadError")} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const { shop, today, totals, activity, dueSoonCustomers } = data;
  const hour = new Date().getHours();
  const overdueCount = totals.overdueCustomers;

  const actionTarget: Record<string, string> = {
    sale: "/sale/new?mode=cash",
    credit: "/sale/new?mode=credit",
    payment: "/payment/new",
    purchase: "/purchase/new",
    expense: "/expense/new",
  };

  return (
    <Screen refreshControl={{ refreshing: isRefetching, onRefresh: refetch }}>
      <Animated.View entering={FadeInUp.duration(350)}>
        <View className="flex-row items-center justify-between pt-1">
          <View className="flex-1">
            <Text className="text-sm text-ink-muted">{greetingForHour(hour)} 👋</Text>
            <Text className="text-2xl font-extrabold tracking-tight text-ink">{shop.name}</Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-50">
            <Text className="text-base font-bold text-primary-800">
              {(user?.name ?? "S").charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(350)}>
        <View className="rounded-3xl bg-primary p-5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-primary-100">{tt("dash.cashToday")}</Text>
          <MoneyText amount={today.cashReceived} currency={shop.currency} size="2xl" className="mt-1 text-white" />
          <View className="mt-3 flex-row gap-4">
            <View className="flex-1">
              <Text className="text-[11px] text-primary-100">{tt("dash.sales")}</Text>
              <Text className="text-sm font-bold text-white">{formatMoneyShort(today.sales, shop.currency)}</Text>
            </View>
            <View className="flex-1 border-l border-primary-100/30 pl-4">
              <Text className="text-[11px] text-primary-100">{tt("dash.creditSales")}</Text>
              <Text className="text-sm font-bold text-white">{formatMoneyShort(today.creditSales, shop.currency)}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).duration(350)}>
        <Card
          onPress={() => router.push({ pathname: "/customers", params: {} })}
          className="flex-row items-center justify-between"
        >
          <View className="flex-1">
            <Text className="text-sm font-semibold text-ink">{tt("dash.customersOwing")}</Text>
            <MoneyText amount={totals.customersOwing} currency={shop.currency} size="xl" tone={Number(totals.customersOwing) > 0 ? "danger" : "success"} className="mt-1" />
          </View>
          {overdueCount > 0 ? (
            <View className="items-end">
              <View className="items-center rounded-full bg-danger-100 px-3 py-1.5">
                <Text className="text-xs font-bold text-danger">{tpl("dash.overdueCount", { n: overdueCount })}</Text>
              </View>
              <Text className="mt-1 text-[11px] text-ink-muted">{tpl("dash.customersOwingCount", { n: totals.customerCount })}</Text>
            </View>
          ) : (
            <View className="items-end gap-1">
              <View className="items-center rounded-full bg-success-100 px-3 py-1.5">
                <Text className="text-xs font-bold text-success">{tt("dash.allSettled")}</Text>
              </View>
              <Text className="text-[11px] text-ink-muted">{tpl("dash.customersOwingCount", { n: totals.customerCount })}</Text>
            </View>
          )}
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(350)} className="flex-row gap-3">
        <StatCard
          className="flex-1"
          label={tt("dash.todaysSales")}
          value={formatMoneyShort(today.sales, shop.currency)}
          sub={tpl("dash.salesCount", { n: today.saleCount })}
          icon="bag-handle-outline"
          tone="primary"
          onPress={() => router.push("/sales")}
        />
        <StatCard
          className="flex-1"
          label={tt("dash.purchases")}
          value={formatMoneyShort(today.purchased, shop.currency)}
          sub={tt("dash.boughtToday")}
          icon="cart-outline"
          tone="info"
          onPress={() => router.push({ pathname: "/more", params: { tab: "purchases" } })}
        />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(260).duration(350)} className="flex-row gap-3">
        <StatCard
          className="flex-1"
          label={tt("dash.expenses")}
          value={formatMoneyShort(today.expenses, shop.currency)}
          sub={tt("dash.spentToday")}
          icon="receipt-outline"
          tone="warning"
          onPress={() => router.push({ pathname: "/more", params: { tab: "expenses" } })}
        />
        <StatCard
          className="flex-1"
          label={tt("dash.inStock")}
          value={tpl("dash.dashItems", { n: totals.productsInStock })}
          sub={totals.lowStockProducts > 0 ? tpl("dash.lowCount", { n: totals.lowStockProducts }) : tt("dash.allGood")}
          icon="cube-outline"
          tone="neutral"
          onPress={() => router.push("/products")}
        />
      </Animated.View>

      <View>
        <Text className="px-1 text-sm font-semibold text-ink-soft">{tt("dash.quickActions")}</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Animated.View key={action.key} entering={FadeInDown.delay(300 + Number(action.key.length) * 30).duration(300)}>
              <View
                className={`flex-row items-center gap-2 rounded-2xl ${action.tone} px-4 py-3 active:opacity-80`}
                accessibilityRole="button"
                accessibilityLabel={tt(action.labelKey)}
                onTouchEnd={() => router.push(actionTarget[action.key] as never)}
              >
                <Ionicons name={action.icon} size={17} color="white" />
                <Text className="text-sm font-semibold text-white">{tt(action.labelKey)}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </View>

      {dueSoonCustomers.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(380).duration(350)} className="gap-2">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-sm font-semibold text-ink-soft">{tt("dash.paymentReminders")}</Text>
            <Text className="text-xs font-medium text-primary-700" onPress={() => router.push("/reminders")}>
              {tt("dash.viewAll")}
            </Text>
          </View>
          {dueSoonCustomers.map((customer, index) => (
            <CustomerRow
              key={customer.id}
              customer={{
                id: customer.id,
                shopId: shop.id,
                name: customer.name,
                phone: null,
                address: null,
                notes: null,
                isActive: true,
                balance: customer.balance,
                nextDueDate: customer.nextDueDate,
                totalBought: customer.balance,
                totalPaid: "0.00",
                createdAt: "",
                updatedAt: "",
              }}
              currency={shop.currency}
              onPress={() => router.push(`/customer/${customer.id}`)}
            />
          ))}
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(420).duration(350)}>
        <View className="flex-row items-center justify-between px-1">
          <Text className="text-sm font-semibold text-ink-soft">{tt("dash.todayActivity")}</Text>
        </View>
        <Card className="mt-2">
          {activity.length === 0 ? (
            <EmptyState
              icon="notifications-outline"
              title={tt("dash.nothingRecorded")}
              message={tt("dash.firstSaleHint")}
            />
          ) : (
            activity.map((item) => <ActivityRow key={item.id} item={item} />)
          )}
        </Card>
      </Animated.View>
    </Screen>
  );
}