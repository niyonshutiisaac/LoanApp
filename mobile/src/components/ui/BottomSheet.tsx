import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useT } from "@/i18n";
import { cn } from "@/utils/cn";

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  className,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const tt = useT();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          className="absolute inset-0 bg-black/50"
        >
          <Pressable className="flex-1" accessibilityLabel={tt("common.closeSheet")} onPress={onClose} />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(180)}
          className={cn("rounded-t-3xl bg-white p-5 pb-8", className)}
        >
          <View className="mb-3 h-1.5 w-10 self-center rounded-full bg-zinc-200" />
          {title ? <Text className="mb-4 text-lg font-bold text-ink">{title}</Text> : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function SheetRow({
  label,
  value,
  selected,
  onPress,
  icon,
  destructive,
}: {
  label: string;
  value?: string;
  selected?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "h-14 flex-row items-center gap-3 rounded-2xl px-4 active:bg-zinc-100",
        selected && "bg-primary-50",
      )}
    >
      {icon ? <Ionicons name={icon} size={20} color={destructive ? "#DC2626" : "#0F766E"} /> : null}
      <Text className={cn("flex-1 text-base", destructive ? "text-danger" : "text-ink")}>{label}</Text>
      {value ? <Text className="text-sm text-ink-muted">{value}</Text> : null}
      {selected ? <Ionicons name="checkmark" size={18} color="#0F766E" /> : null}
    </Pressable>
  );
}