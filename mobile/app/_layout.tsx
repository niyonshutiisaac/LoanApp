import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth";
import { t, useLocaleStore } from "@/i18n";
import { FullScreenLoading } from "@/components/ui/LoadingState";
import "../global.css";

// Expo Go (SDK 53+) no longer supports the expo-notifications module at all —
// merely importing it there throws at load time. A dynamic import defers that
// require() until this check has already ruled Expo Go out, instead of a
// static import (which Metro evaluates unconditionally at bundle load and
// would crash the whole root layout module before this file even renders).
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  import("expo-notifications").then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  });
}

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
    if (isExpoGo) return;
    let sub: { remove: () => void } | undefined;
    let cancelled = false;
    import("expo-notifications").then((Notifications) => {
      if (cancelled) return;
      sub = Notifications.addNotificationReceivedListener(() => {
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      });
    });
    return () => {
      cancelled = true;
      sub?.remove();
    };
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