import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { useT } from "@/i18n";
import { cn } from "@/utils/cn";

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  debounceMs = 300,
  className,
  autoFocus,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
}) {
  const [immediate, setImmediate] = useState(value);
  const tt = useT();

  useEffect(() => {
    if (immediate === value) return;
    const timer = setTimeout(() => onChangeText(immediate), debounceMs);
    return () => clearTimeout(timer);
  }, [immediate, debounceMs, value, onChangeText]);

  const ph = placeholder ?? tt("common.search");

  return (
    <View
      className={cn(
        "h-12 flex-row items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4",
        className,
      )}
    >
      <Ionicons name="search" size={18} color="#94A3B8" />
      <TextInput
        value={immediate}
        onChangeText={setImmediate}
        placeholder={ph}
        placeholderTextColor="#94A3B8"
        autoFocus={autoFocus}
        autoCorrect={false}
        className="flex-1 py-2 text-base text-ink"
        accessibilityLabel={ph}
        returnKeyType="search"
      />
      {immediate.length > 0 ? (
        <View
          accessibilityRole="button"
          accessibilityLabel={tt("common.clearSearch")}
          hitSlop={8}
          onTouchEnd={() => {
            setImmediate("");
            onChangeText("");
          }}
          className="h-6 w-6 items-center justify-center rounded-full bg-zinc-100"
        >
          <Ionicons name="close" size={14} color="#475569" />
        </View>
      ) : null}
    </View>
  );
}