import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useEffect } from "react";
import { Pressable, Text } from "react-native";

export function FAB({
  icon = "add",
  label,
  onPress,
  tone = "primary",
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  tone?: "primary" | "danger";
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = withSpring(0.9, { damping: 12 });
    scale.value = withSpring(1, { damping: 12 });
  }, [scale]);

  return (
    <Animated.View
      style={[animatedStyle]}
      className="absolute bottom-6 right-5 rounded-full shadow-lg shadow-black/20"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? "Add"}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.92, { damping: 12 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12 });
        }}
        className={`h-14 flex-row items-center justify-center gap-1.5 rounded-full px-6 ${tone === "primary" ? "bg-primary" : "bg-danger"}`}
      >
        <Ionicons name={icon} size={26} color="white" />
        {label ? <Text className="text-base font-semibold text-white">{label}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}