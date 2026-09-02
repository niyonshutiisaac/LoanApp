import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export function EmptyState({
  icon = "file-tray-outline",
  title,
  message,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="items-center gap-2 px-8 py-12">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-50">
        <Ionicons name={icon} size={36} color="#0F766E" />
      </View>
      <Text className="mt-2 text-center text-lg font-bold text-ink">{title}</Text>
      {message ? <Text className="text-center text-sm leading-5 text-ink-muted">{message}</Text> : null}
      {action ? <View className="mt-4 w-full max-w-[220px]">{action}</View> : null}
    </View>
  );
}