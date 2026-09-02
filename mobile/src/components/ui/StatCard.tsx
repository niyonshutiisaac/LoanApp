import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { cn } from "@/utils/cn";

type Tone = "primary" | "success" | "danger" | "warning" | "info" | "neutral";

const toneStyles: Record<Tone, { iconBg: string; iconColor: string }> = {
  primary: { iconBg: "bg-primary-50", iconColor: "#0F766E" },
  success: { iconBg: "bg-success-100", iconColor: "#16A34A" },
  danger: { iconBg: "bg-danger-100", iconColor: "#DC2626" },
  warning: { iconBg: "bg-warning-100", iconColor: "#D97706" },
  info: { iconBg: "bg-info-100", iconColor: "#2563EB" },
  neutral: { iconBg: "bg-zinc-100", iconColor: "#475569" },
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "primary",
  onPress,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  onPress?: () => void;
  className?: string;
}) {
  const { iconBg, iconColor } = toneStyles[tone];
  const content = (
    <>
      <View className={cn("h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
        <Ionicons name={icon} size={19} color={iconColor} />
      </View>
      <Text className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</Text>
      <View className="mt-0.5">
        {typeof value === "string" || typeof value === "number" ? (
          <Text className="text-xl font-bold tracking-tight text-ink" numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
      {sub ? <Text className="mt-0.5 text-xs text-ink-muted">{sub}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        className={cn(
          "rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-200/50 active:bg-zinc-50",
          className,
        )}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View className={cn("rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-200/50", className)}>
      {content}
    </View>
  );
}