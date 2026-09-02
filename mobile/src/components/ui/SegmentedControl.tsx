import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";
import { cn } from "@/utils/cn";

type Tone = "primary" | "success" | "danger" | "warning" | "info" | "neutral";

const toneStyles: Record<Tone, string> = {
  primary: "bg-primary-50 text-primary",
  success: "bg-success-100 text-success",
  danger: "bg-danger-100 text-danger",
  warning: "bg-warning-100 text-warning",
  info: "bg-info-100 text-info",
  neutral: "bg-zinc-100 text-ink-soft",
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = "neutral",
  className,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Pressable
      accessibilityRole="tablist"
      className={cn("flex-row gap-1 rounded-2xl bg-zinc-100 p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            className={cn(
              "h-10 flex-1 items-center justify-center rounded-xl",
              active ? "bg-white shadow-sm" : "active:bg-zinc-200/60",
            )}
          >
            <Text className={cn("text-sm font-semibold", active ? toneStyles[tone] : "text-ink-muted")}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </Pressable>
  );
}

export { Ionicons };