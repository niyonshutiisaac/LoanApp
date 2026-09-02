import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useT } from "@/i18n";

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  back = true,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  back?: boolean;
}) {
  const router = useRouter();
  const tt = useT();
  return (
    <View className="mx-4 mb-1 mt-2 flex-row items-center gap-3">
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tt("common.goBack")}
          hitSlop={8}
          onPress={onBack ?? (() => router.back())}
          className="h-11 w-11 -ml-2 items-center justify-center rounded-full active:bg-zinc-200/60"
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </Pressable>
      ) : null}
      <View className="flex-1">
        <Text className="text-xl font-bold tracking-tight text-ink">{title}</Text>
        {subtitle ? <Text className="text-sm text-ink-muted">{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}