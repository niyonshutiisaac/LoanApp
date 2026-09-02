import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input, MoneyInput } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useCreateProduct, useProduct, useShop, useUpdateProduct } from "@/features/hooks";
import { useT } from "@/i18n";
import { useEffect } from "react";

type ProductForm = z.infer<ReturnType<typeof buildProductSchema>>;

function buildProductSchema(
  nameError: string,
  buyingPriceError: string,
  sellingPriceError: string,
  stockError: string,
) {
  return z.object({
    name: z.string().min(2, nameError),
    sku: z.string().optional(),
    unit: z.string().optional(),
    buyingPrice: z.string().refine((v) => Number(v) >= 0, buyingPriceError),
    sellingPrice: z.string().refine((v) => Number(v) > 0, sellingPriceError),
    stockQuantity: z.string().refine((v) => Number(v) >= 0, stockError),
    lowStockThreshold: z.string().optional(),
  });
}

export default function ProductFormScreen() {
  const router = useRouter();
  const tt = useT();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEdit = !!editId;
  const { data: existing } = useProduct(editId ?? "");
  const { data: shopData } = useShop();
  const currency = shopData?.currency ?? "RWF";
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const productSchema = buildProductSchema(tt("puf.nameError"), tt("puf.buyingPriceError"), tt("puf.sellingPriceError"), tt("puf.stockError"));

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      unit: "",
      buyingPrice: "",
      sellingPrice: "",
      stockQuantity: "",
      lowStockThreshold: "",
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        sku: existing.sku ?? "",
        unit: existing.unit ?? "",
        buyingPrice: String(Number(existing.buyingPrice) || ""),
        sellingPrice: String(Number(existing.sellingPrice) || ""),
        stockQuantity: String(existing.stockQuantity ?? ""),
        lowStockThreshold: String(existing.lowStockThreshold ?? ""),
      });
    }
  }, [existing, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const input = {
        name: values.name,
        sku: values.sku || null,
        unit: values.unit || null,
        buyingPrice: values.buyingPrice || "0",
        sellingPrice: values.sellingPrice,
        stockQuantity: Number(values.stockQuantity || 0),
        lowStockThreshold: Number(values.lowStockThreshold || 5),
      };
      if (isEdit && editId) {
        await updateProduct.mutateAsync({ id: editId, input });
      } else {
        await createProduct.mutateAsync(input);
      }
      router.back();
    } catch (e) {
      void e;
    }
  });

  return (
    <Screen keyboard>
      <ScreenHeader title={isEdit ? tt("puf.editTitle") : tt("puf.newTitle")} />
      <View className="gap-4 px-1">
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input label={tt("puf.nameRequired")} placeholder={tt("puf.namePh")} error={errors.name?.message} value={field.value} onChangeText={field.onChange} />
          )}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="sku"
              render={({ field }) => (
                <Input label={tt("puf.sku")} placeholder="SUG-001" autoCapitalize="characters" error={errors.sku?.message} value={field.value} onChangeText={field.onChange} />
              )}
            />
          </View>
          <View className="w-28">
            <Controller
              control={control}
              name="unit"
              render={({ field }) => (
                <Input label={tt("puf.unit")} placeholder={tt("puf.unitPh")} error={errors.unit?.message} value={field.value} onChangeText={field.onChange} />
              )}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="buyingPrice"
          render={({ field }) => (
            <MoneyInput label={tt("puf.buyingPrice")} currency={currency} error={errors.buyingPrice?.message} value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="sellingPrice"
          render={({ field }) => (
            <MoneyInput label={tt("puf.sellingPrice")} currency={currency} error={errors.sellingPrice?.message} value={field.value} onChangeText={field.onChange} />
          )}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="stockQuantity"
              render={({ field }) => (
                <Input label={tt("puf.stockNow")} keyboardType="number-pad" error={errors.stockQuantity?.message} value={field.value} onChangeText={field.onChange} />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="lowStockThreshold"
              render={({ field }) => (
                <Input label={tt("puf.lowStockAlert")} keyboardType="number-pad" hint={tt("puf.lowStockHint")} error={errors.lowStockThreshold?.message} value={field.value} onChangeText={field.onChange} />
              )}
            />
          </View>
        </View>

        {!isEdit ? (
          <View className="rounded-2xl bg-info-50 p-3">
            <Text className="text-xs leading-5 text-info">
              {tt("puf.tip")}
            </Text>
          </View>
        ) : null}

        <Button
          title={tt("puf.saveNew")}
          onPress={onSubmit}
          loading={isSubmitting || createProduct.isPending || updateProduct.isPending}
          fullWidth
          className="mt-2"
        />
      </View>
    </Screen>
  );
}