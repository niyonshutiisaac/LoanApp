import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/utils/cn";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  scrollContentClassName?: string;
  refreshControl?: { refreshing: boolean; onRefresh: () => void };
  className?: string;
  keyboard?: boolean;
}

export function Screen({
  children,
  scroll = true,
  scrollContentClassName,
  refreshControl,
  className,
  keyboard = false,
}: ScreenProps) {
  const body = (
    <ScrollView
      className="flex-1"
      contentContainerClassName={cn("grow gap-4 p-4 pb-8", scrollContentClassName)}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        refreshControl ? (
          <RefreshControl
            refreshing={refreshControl.refreshing}
            onRefresh={refreshControl.onRefresh}
            tintColor="#0F766E"
            colors={["#0F766E"]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );

  const wrapped = keyboard ? (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <SafeAreaView edges={["top"]} className={cn("flex-1 bg-zinc-50", className)}>
      {scroll ? wrapped : <View className="flex-1">{children}</View>}
    </SafeAreaView>
  );
}