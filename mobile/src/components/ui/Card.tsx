import { Pressable, View, type ViewProps } from "react-native";
import { cn } from "@/utils/cn";

interface CardProps extends ViewProps {
  onPress?: () => void;
  className?: string;
}

export function Card({ onPress, className, children, ...rest }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className={cn(
          "rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-200/50 active:bg-zinc-50",
          className,
        )}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View
      className={cn(
        "rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-200/50",
        className,
      )}
      {...rest}
    >
      {children}
    </View>
  );
}