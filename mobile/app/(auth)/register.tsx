import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useRegister } from "@/features/hooks";
import { useT, useTpl } from "@/i18n";
import { useState } from "react";

export default function RegisterScreen() {
  const tt = useT();
  const register = useRegister();
  const [serverError, setServerError] = useState<string | null>(null);

  const registerSchema = z
    .object({
      name: z.string().min(2, tt("auth.enterName")),
      shopName: z.string().min(2, tt("auth.enterShopName")).optional().or(z.literal("")),
      email: z.string().email(tt("auth.invalidEmail")),
      phone: z
        .string()
        .optional()
        .refine((v) => !v || v.length >= 7, tt("auth.enterPhone")),
      password: z.string().min(6, tt("auth.passwordMin")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: tt("auth.passwordsDontMatch"),
      path: ["confirmPassword"],
    });

  type RegisterForm = z.infer<typeof registerSchema>;

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", shopName: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await register.mutateAsync({
        name: values.name,
        shopName: values.shopName || undefined,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : tt("auth.registerError");
      setError("email", { message });
      setServerError(message);
    }
  });

  return (
    <Screen keyboard>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={tt("auth.createAccount")} subtitle={tt("auth.createSubtitle")} />
      <View className="gap-4 px-1">
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input label={tt("auth.yourName")} placeholder={tt("auth.yourNamePh")} error={errors.name?.message} value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="shopName"
          render={({ field }) => (
            <Input label={tt("auth.shopName")} placeholder={tt("auth.shopNamePh")} error={errors.shopName?.message} value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input label={tt("auth.email")} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" error={errors.email?.message} value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <Input label={tt("auth.phoneOptional")} placeholder={tt("shop.phonePh")} keyboardType="phone-pad" error={errors.phone?.message} value={field.value} onChangeText={field.onChange} />
          )}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <Input label={tt("auth.password")} placeholder={tt("auth.min6")} secureTextEntry error={errors.password?.message} value={field.value} onChangeText={field.onChange} />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field }) => (
                <Input label={tt("auth.repeat")} placeholder={tt("auth.again")} secureTextEntry error={errors.confirmPassword?.message} value={field.value} onChangeText={field.onChange} />
              )}
            />
          </View>
        </View>

        <Button title={tt("auth.createAccountTitle")} onPress={onSubmit} loading={isSubmitting || register.isPending} fullWidth className="mt-2" />
        {serverError ? (
          <View className="flex-row items-center gap-2 rounded-2xl bg-danger-50 p-3">
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text className="flex-1 text-xs text-danger">{serverError}</Text>
          </View>
        ) : null}

        <View className="flex-row justify-center gap-1 py-2">
          <Text className="text-sm text-ink-muted">{tt("auth.alreadyHave")}</Text>
          <Link href="/(auth)/login" className="text-sm font-semibold text-primary-700">
            {tt("auth.login")}
          </Link>
        </View>
      </View>
    </Screen>
  );
}