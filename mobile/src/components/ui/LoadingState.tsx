import { ActivityIndicator, Text, View } from "react-native";
import { useT } from "@/i18n";

export function LoadingState({ label }: { label?: string }) {
  const tt = useT();
  return (
    <View className="flex-1 items-center justify-center gap-3 p-10" accessibilityLabel={label ?? tt("common.loading")}>
      <ActivityIndicator size="large" color="#0F766E" />
      <Text className="text-sm text-ink-muted">{label ?? tt("common.loading")}</Text>
    </View>
  );
}

export function FullScreenLoading({ label }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-zinc-50">
      <LoadingState label={label} />
    </View>
  );
}