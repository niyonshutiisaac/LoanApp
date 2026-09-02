import { zodResolver } from "@hookform/resolvers/zod";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useCreateCustomer, useCustomer, useUpdateCustomer } from "@/features/hooks";
import { useT } from "@/i18n";
import { useEffect } from "react";

type CustomerForm = z.infer<ReturnType<typeof buildCustomerSchema>>;

function buildCustomerSchema(enterName: string, invalidPhone: string) {
  return z.object({
    name: z.string().min(2, enterName),
    phone: z
      .string()
      .optional()
      .refine((v) => !v || v.length >= 7, invalidPhone),
    address: z.string().optional(),
    notes: z.string().optional(),
  });
}

export default function CustomerFormScreen() {
  const router = useRouter();
  const tt = useT();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEdit = !!editId;
  const { data: existing } = useCustomer(editId ?? "");
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const customerSchema = buildCustomerSchema(tt("cuf.enterName"), tt("cuf.invalidPhone"));

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", address: "", notes: "" },
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        phone: existing.phone ?? "",
        address: existing.address ?? "",
        notes: existing.notes ?? "",
      });
    }
  }, [existing, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && editId) {
        await updateCustomer.mutateAsync({ id: editId, input: values });
      } else {
        await createCustomer.mutateAsync(values);
      }
      router.back();
    } catch (e) {
      // surfaced through the mutation error state; keep simple for now
      void e;
    }
  });

  return (
    <Screen keyboard>
      <Stack.Screen options={{ presentation: "modal" }} />
      <ScreenHeader title={isEdit ? tt("cuf.editTitle") : tt("cuf.newTitle")} />
      <View className="gap-4 px-1">
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input label={tt("cuf.nameRequired")} placeholder={tt("cuf.namePh")} autoCapitalize="words" error={errors.name?.message} value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input label={tt("cuf.phone")} placeholder="+2507..." keyboardType="phone-pad" hint={tt("cuf.phoneHint")} error={errors.phone?.message} value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <Input label={tt("common.address")} placeholder={tt("cuf.addressPh")} value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <Input label={tt("common.notesOptional")} placeholder={tt("cuf.notesPh")} multiline value={field.value} onChangeText={field.onChange} className="min-h-20" />
          )}
        />

        {!isEdit ? (
          <View className="rounded-2xl bg-info-50 p-3">
            <Text className="text-xs leading-5 text-info">
              {tt("cuf.tip")}
            </Text>
          </View>
        ) : null}

        <Button
          title={tt("cuf.saveNew")}
          onPress={onSubmit}
          loading={isSubmitting || createCustomer.isPending || updateCustomer.isPending}
          fullWidth
          className="mt-2"
        />
      </View>
    </Screen>
  );
}