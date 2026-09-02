import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { z } from "zod";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { BottomSheet, SheetRow } from "@/components/ui/BottomSheet";
import { Input, MoneyInput } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SuccessOverlay } from "@/components/ui/SuccessOverlay";
import { useCreateExpense, useShop } from "@/features/hooks";
import { EXPENSE_CATEGORIES, expenseCategoryKey } from "@/constants/expenseCategories";
import { useState } from "react";
import { ApiClientError } from "@/services/api/httpClient";
import { useT } from "@/i18n";

function buildExpenseSchema(amountError: string) {
  return z.object({
    amount: z.string().refine((v) => Number(v) > 0, amountError),
    description: z.string().optional(),
  });
}

type ExpenseForm = z.infer<ReturnType<typeof buildExpenseSchema>>;

const DEFAULT_CATEGORY = "Transport";

export default function NewExpenseScreen() {
  const router = useRouter();
  const tt = useT();
  const { data: shopData } = useShop();
  const currency = shopData?.currency ?? "RWF";
  const createExpense = useCreateExpense();
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [showCategories, setShowCategories] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const expenseSchema = buildExpenseSchema(tt("exf.errAmount"));

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: "", description: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    try {
      await createExpense.mutateAsync({
        category,
        amount: values.amount,
        description: values.description || null,
      });
      setShowSuccess(true);
    } catch (e) {
      setErrorMessage(e instanceof ApiClientError ? e.message : tt("exf.errRecord"));
    }
  });

  return (
    <>
      <Screen keyboard>
        <ScreenHeader title={tt("exf.newExpense")} subtitle={tt("exf.subtitle")} />
        <View className="gap-4 px-1">
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowCategories(true)}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5"
          >
            <Text className="text-xs text-ink-muted">{tt("exf.category")}</Text>
            <View className="mt-0.5 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-ink">{tt(expenseCategoryKey(category))}</Text>
              <Ionicons name="chevron-down" size={18} color="#94A3B8" />
            </View>
          </Pressable>

          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <MoneyInput label={tt("exf.amount")} currency={currency} error={errors.amount?.message} value={field.value} onChangeText={field.onChange} />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Input label={tt("exf.description")} placeholder={tt("exf.descPh")} value={field.value} onChangeText={field.onChange} />
            )}
          />

          {errorMessage ? (
            <View className="flex-row items-center gap-2 rounded-2xl bg-danger-50 p-3">
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text className="flex-1 text-xs text-danger">{errorMessage}</Text>
            </View>
          ) : null}

          <Button title={tt("exf.record")} onPress={onSubmit} loading={isSubmitting || createExpense.isPending} fullWidth className="mt-2" />
        </View>
      </Screen>

      <BottomSheet visible={showCategories} onClose={() => setShowCategories(false)} title={tt("exf.chooseCategory")}>
        {EXPENSE_CATEGORIES.map((c) => (
          <SheetRow
            key={c.key}
            label={tt(c.key)}
            icon="pricetag-outline"
            selected={c.value === category}
            onPress={() => {
              setCategory(c.value);
              setShowCategories(false);
            }}
          />
        ))}
      </BottomSheet>

      <SuccessOverlay
        visible={showSuccess}
        title={tt("exf.recorded")}
        subtitle={tt(expenseCategoryKey(category))}
        buttonLabel={tt("common.done")}
        onDone={() => {
          setShowSuccess(false);
          router.back();
        }}
      />
    </>
  );
}