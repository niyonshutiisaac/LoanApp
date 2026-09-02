import { Text } from "react-native";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/money";

type Tone = "default" | "danger" | "success" | "soft" | "muted" | "warning";
type Size = "md" | "lg" | "xl" | "2xl";

const sizeClasses: Record<Size, string> = {
  md: "text-lg font-semibold",
  lg: "text-2xl font-bold tracking-tight",
  xl: "text-3xl font-bold tracking-tight",
  "2xl": "text-4xl font-extrabold tracking-tighter",
};

const toneClasses: Record<Tone, string> = {
  default: "text-ink",
  danger: "text-danger",
  success: "text-success",
  soft: "text-ink-soft",
  muted: "text-ink-muted",
  warning: "text-warning",
};

export function MoneyText({
  amount,
  currency = "RWF",
  size = "lg",
  tone = "default",
  prefix,
  className,
}: {
  amount: string | number;
  currency?: string;
  size?: Size;
  tone?: Tone;
  prefix?: string;
  className?: string;
}) {
  return (
    <Text
      accessibilityLabel={`${formatMoney(amount, currency)}`}
      className={cn(sizeClasses[size], toneClasses[tone], className)}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {prefix ? <Text className="text-sm text-ink-muted">{prefix} </Text> : null}
      <Text>{formatMoney(amount, currency)}</Text>
    </Text>
  );
}