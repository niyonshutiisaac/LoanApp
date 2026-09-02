import { forwardRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { cn } from "@/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  style?: ViewStyle;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-primary active:bg-primary-800",
  secondary: "bg-primary-50 active:bg-primary-100",
  ghost: "bg-transparent active:bg-zinc-100",
  danger: "bg-danger active:bg-red-800",
  outline: "bg-white border border-zinc-300 active:bg-zinc-50",
};

const textStyles: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-primary-800",
  ghost: "text-ink",
  danger: "text-white",
  outline: "text-ink",
};

const sizeStyles: Record<Size, { button: string; text: string }> = {
  sm: { button: "h-10 px-4 rounded-xl", text: "text-sm" },
  md: { button: "h-12 px-5 rounded-xl", text: "text-base" },
  lg: { button: "h-14 px-6 rounded-2xl", text: "text-base font-semibold" },
};

export const Button = forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  function Button(
    { title, variant = "primary", size = "lg", loading, icon, fullWidth, disabled, className, style, ...rest },
    ref,
  ) {
    const s = sizeStyles[size];
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        disabled={disabled || loading}
        className={cn(
          "flex-row items-center justify-center gap-2",
          s.button,
          variantStyles[variant],
          (disabled || loading) && "opacity-50",
          fullWidth && "w-full",
          className,
        )}
        style={style}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#fff" : "#0F766E"} />
        ) : (
          <>
            {icon}
            <Text className={cn("font-semibold", s.text, textStyles[variant])}>{title}</Text>
          </>
        )}
      </Pressable>
    );
  },
);

export function IconButton({
  icon,
  onPress,
  label,
  className,
  ...rest
}: {
  icon: React.ReactNode;
  onPress: () => void;
  label: string;
  className?: string;
} & Omit<PressableProps, "style" | "onPress">) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      className={cn("h-11 w-11 items-center justify-center rounded-full active:bg-zinc-100", className)}
      {...rest}
    >
      {icon}
    </Pressable>
  );
}