import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { useT } from "@/i18n";

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const tt = useT();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} className="flex-1 justify-center bg-black/50 px-8">
        <Animated.View entering={ZoomIn.springify().damping(18)} className="rounded-3xl bg-white p-6">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-danger-50">
            <Ionicons name={destructive ? "trash-outline" : "help-outline"} size={24} color="#DC2626" />
          </View>
          <Text className="mt-4 text-lg font-bold text-ink">{title}</Text>
          {message ? <Text className="mt-1.5 text-sm leading-5 text-ink-soft">{message}</Text> : null}
          <View className="mt-6 flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              className="h-12 flex-1 items-center justify-center rounded-2xl border border-zinc-200 active:bg-zinc-50"
            >
              <Text className="font-semibold text-ink-soft">{cancelLabel ?? tt("common.cancel")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              className={`h-12 flex-1 items-center justify-center rounded-2xl active:opacity-80 ${destructive ? "bg-danger" : "bg-primary"}`}
            >
              <Text className="font-semibold text-white">{confirmLabel ?? tt("common.confirm")}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}