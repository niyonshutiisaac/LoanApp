import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useT, useTpl } from "@/i18n";
import type { Product } from "@/types/api";
import { formatMoney } from "@/utils/money";

export function ProductRow({
  product,
  onPress,
  currency = "RWF",
}: {
  product: Product;
  onPress?: () => void;
  currency?: string;
}) {
  const lowStock = product.stockQuantity <= product.lowStockThreshold;
  const outOfStock = product.stockQuantity <= 0;
  const tt = useT();
  const tpl = useTpl();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 active:bg-zinc-50"
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-info-50">
        <Ionicons name="cube-outline" size={20} color="#2563EB" />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-ink">{product.name}</Text>
        <Text className="text-xs text-ink-muted">
          Sell {formatMoney(product.sellingPrice, currency)}
          {product.unit ? ` / ${product.unit}` : ""}
        </Text>
      </View>
      <View className="items-end">
        <Text className={`text-[15px] font-bold ${outOfStock ? "text-danger" : lowStock ? "text-warning" : "text-ink"}`}>
          {outOfStock ? tt("common.outOfStock") : tpl("prod.nLeft", { n: product.stockQuantity })}
        </Text>
        <Text className="text-[11px] text-ink-muted">
          {product.sku ?? (product.unit ? `${product.unit}s` : tt("prod.item"))}
        </Text>
      </View>
    </Pressable>
  );
}