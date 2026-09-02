import { Text, View } from "react-native";
import { cn } from "@/utils/cn";

type Tone = "success" | "danger" | "warning" | "info" | "neutral" | "primary";

const toneClasses: Record<Tone, string> = {
  success: "bg-success-100 text-success",
  danger: "bg-danger-100 text-danger",
  warning: "bg-warning-100 text-warning",
  info: "bg-info-100 text-info",
  neutral: "bg-zinc-100 text-ink-soft",
  primary: "bg-primary-50 text-primary-800",
};

export function Badge({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <View className={cn("self-start rounded-full px-2.5 py-1", toneClasses[tone], className)}>
      <Text className="text-xs font-semibold">{label}</Text>
    </View>
  );
}