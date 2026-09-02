import { forwardRef, useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { cn } from "@/utils/cn";
import { moneyToNumber, parseMoney } from "@/utils/money";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, leftIcon, className, multiline, ...rest },
  ref,
) {
  return (
    <View className="gap-1.5">
      {label ? <Text className="px-1 text-sm font-medium text-ink-soft">{label}</Text> : null}
      <View
        className={cn(
          "flex-row items-center gap-2 rounded-2xl border bg-white px-4",
          multiline ? "min-h-[96px] py-3" : "h-13",
          error ? "border-danger" : "border-zinc-200 focus-within:border-primary-600",
        )}
      >
        {leftIcon ? <View className="shrink-0">{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label ?? rest.placeholder}
          placeholderTextColor="#94A3B8"
          multiline={multiline}
          className={cn("flex-1 py-3 text-base text-ink", multiline && "text-left align-top", className)}
          {...rest}
        />
      </View>
      {error ? (
        <Text className="px-1 text-xs text-danger">{error}</Text>
      ) : hint ? (
        <Text className="px-1 text-xs text-ink-muted">{hint}</Text>
      ) : null}
    </View>
  );
});

interface MoneyInputProps extends Omit<TextInputProps, "value" | "onChangeText" | "keyboardType"> {
  label?: string;
  error?: string;
  value: string;
  onChangeText: (raw: string) => void;
  currency?: string;
}

function formatGrouped(raw: string): string {
  const n = moneyToNumber(raw);
  if (!Number.isFinite(n) || n === 0) return "";
  const str = raw.replace(/[^\d.-]/g, "");
  const negative = str.startsWith("-");
  const digits = str.replace(/[^0-9]/g, "");
  const grouped = Number(digits).toLocaleString("en-US");
  return `${negative ? "-" : ""}${grouped}`;
}

export const MoneyInput = forwardRef<TextInput, MoneyInputProps>(function MoneyInput(
  { label, error, value, onChangeText, currency, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-1.5">
      {label ? <Text className="px-1 text-sm font-medium text-ink-soft">{label}</Text> : null}
      <View
        className={cn(
          "h-13 flex-row items-center rounded-2xl border bg-white px-4",
          focused ? "border-primary-600" : "border-zinc-200",
          error && "border-danger",
        )}
      >
        <TextInput
          ref={ref}
          keyboardType="decimal-pad"
          value={focused && !value ? value : formatGrouped(value)}
          onChangeText={(text) => {
            onChangeText(text.replace(/[^0-9]/g, ""));
          }}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholder="0"
          placeholderTextColor="#CBD5E1"
          className="flex-1 py-3 text-lg font-semibold text-ink"
          {...rest}
        />
        <Text className="text-sm text-ink-muted">{currency ?? "RWF"}</Text>
      </View>
      {error ? <Text className="px-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
});

export function parseMoneyValue(raw: string): string {
  return parseMoney(raw || "0").toFixed(2);
}