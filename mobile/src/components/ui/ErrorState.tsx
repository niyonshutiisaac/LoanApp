import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useT } from "@/i18n";
import { Button } from "./Button";

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const tt = useT();
  return (
    <View className="flex-1 items-center justify-center gap-3 p-10">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-danger-50">
        <Ionicons name="alert-circle" size={32} color="#DC2626" />
      </View>
      <Text className="text-center text-base font-medium text-ink">{message ?? tt("common.somethingWrong")}</Text>
      {onRetry ? <Button title={tt("common.tryAgain")} variant="outline" size="md" onPress={onRetry} className="mt-2" /> : null}
    </View>
  );
}