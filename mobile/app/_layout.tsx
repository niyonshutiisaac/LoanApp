import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth";
import { t, useLocaleStore } from "@/i18n";
import { FullScreenLoading } from "@/components/ui/LoadingState";
import "../global.css";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const localeReady = useLocaleStore((s) => s.ready);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    useAuthStore.getState().hydrate().finally(() => {
      setReady(true);
    });
  }, []);

  useEffect(() => {
    useLocaleStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });
    return () => sub.remove();
  }, []);

  if (!ready || !isHydrated || !localeReady) {
    return <FullScreenLoading label={t("common.opening")} />;
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="customer/[id]" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="customer/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="product/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="product/[id]" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="sale/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="purchase/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="expense/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="payment/new" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="reports" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="shop" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="reminders" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="payments" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="purchases" options={{ animation: "slide_from_right" }} />
          <Stack.Screen name="expenses" options={{ animation: "slide_from_right" }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}