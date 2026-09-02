import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { useT } from "@/i18n";
import { Button } from "./Button";
import { MoneyText } from "./MoneyText";

export function SuccessOverlay({
  visible,
  title,
  subtitle,
  amount,
  currency = "RWF",
  buttonLabel,
  onDone,
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  amount?: string | number;
  currency?: string;
  buttonLabel?: string;
  onDone: () => void;
}) {
  const tt = useT();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDone}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} className="flex-1 items-center justify-center bg-black/60 px-8">
        <Animated.View entering={ZoomIn.springify().damping(16)} className="w-full items-center rounded-3xl bg-white px-6 py-10">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-success-100">
            <Animated.View entering={ZoomIn.delay(150).springify().damping(12)}>
              <Ionicons name="checkmark" size={44} color="#16A34A" />
            </Animated.View>
          </View>
          <Text className="mt-5 text-xl font-bold text-ink">{title ?? tt("common.saved")}</Text>
          {amount !== undefined ? (
            <MoneyText amount={amount} currency={currency} size="lg" tone="success" className="mt-1" />
          ) : null}
          {subtitle ? <Text className="mt-1 text-center text-sm text-ink-muted">{subtitle}</Text> : null}
          <Button title={buttonLabel ?? tt("common.done")} className="mt-7 w-full" onPress={onDone} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}