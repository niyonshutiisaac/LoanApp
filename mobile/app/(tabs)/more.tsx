import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Screen } from "@/components/ui/Screen";
import { useLogout } from "@/features/hooks";
import { useT, useTpl, type TranslationKey } from "@/i18n";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/utils/cn";

const MENU_GROUPS: {
  titleKey: TranslationKey;
  items: { key: string; labelKey: TranslationKey; icon: keyof typeof Ionicons.glyphMap; href: string; color: string }[];
}[] = [
  {
    titleKey: "more.yourRecords",
    items: [
      { key: "purchases", labelKey: "more.purchases", icon: "cart-outline", href: "/purchases", color: "#2563EB" },
      { key: "expenses", labelKey: "more.expenses", icon: "receipt-outline", href: "/expenses", color: "#D97706" },
      { key: "payments", labelKey: "more.paymentsReceived", icon: "cash-outline", href: "/payments", color: "#16A34A" },
      { key: "reminders", labelKey: "more.reminders", icon: "notifications-outline", href: "/reminders", color: "#DC2626" },
    ],
  },
  {
    titleKey: "more.understand",
    items: [
      { key: "reports", labelKey: "more.reports", icon: "bar-chart-outline", href: "/reports", color: "#0F766E" },
    ],
  },
  {
    titleKey: "more.manage",
    items: [
      { key: "shop", labelKey: "more.shopSettings", icon: "storefront-outline", href: "/shop", color: "#7C3AED" },
      { key: "settings", labelKey: "more.account", icon: "settings-outline", href: "/settings", color: "#475569" },
    ],
  },
];

export default function MoreScreen() {
  const tt = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [logsOut, setLogsOut] = useState(false);
  const logout = useLogout();
  const user = useAuthStore((s) => s.user);

  const scrollToKey = params.tab ?? null;

  const menus = useMemo(() => {
    void scrollToKey;
    return MENU_GROUPS;
  }, [scrollToKey]);

  return (
    <Screen>
      <View className="pt-1">
        <Text className="text-2xl font-extrabold tracking-tight text-ink">{tt("more.title")}</Text>
        <Card className="mt-3 flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-50">
            <Text className="text-lg font-bold text-primary-800">
              {(user?.name ?? "S").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-ink">{user?.name ?? tt("common.shopkeeper")}</Text>
            <Text className="text-xs text-ink-muted">{user?.email ?? ""}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </Card>
      </View>

      {menus.map((group) => (
        <View key={group.titleKey} className="gap-2">
          <Text className="px-1 text-sm font-semibold text-ink-soft">{tt(group.titleKey)}</Text>
          <Card className="p-1.5">
            {group.items.map((item, index) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                onPress={() => {
                  if (item.key === "purchases" || item.key === "expenses") {
                    router.push({ pathname: item.href, params: { tab: item.key } });
                  } else {
                    router.push(item.href as never);
                  }
                }}
                className={cn(
                  "h-14 flex-row items-center gap-3 rounded-xl px-3 active:bg-zinc-50",
                  index > 0 && "border-t border-zinc-100",
                )}
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${item.color}14` }}
                >
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <Text className="flex-1 text-[15px] font-medium text-ink">{tt(item.labelKey)}</Text>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}

      <View className="gap-2">
        <Text className="px-1 text-sm font-semibold text-ink-soft">{tt("more.account")}</Text>
        <Card className="p-1.5">
          <Pressable
            accessibilityRole="button"
            onPress={() => setLogsOut(true)}
            className="h-14 flex-row items-center gap-3 rounded-xl px-3 active:bg-danger-50"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-danger-100">
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </View>
            <Text className="flex-1 text-[15px] font-medium text-danger">{tt("more.logOut")}</Text>
          </Pressable>
        </Card>
        <Text className="px-2 text-center text-[11px] text-ink-muted">{tt("more.version")}</Text>
      </View>

      <ConfirmDialog
        visible={logsOut}
        title={tt("more.logOutTitle")}
        message={tt("more.logOutMessage")}
        confirmLabel={tt("more.logOut")}
        cancelLabel={tt("common.stay")}
        onCancel={() => setLogsOut(false)}
        onConfirm={() => {
          setLogsOut(false);
          logout.mutate();
        }}
      />
    </Screen>
  );
}