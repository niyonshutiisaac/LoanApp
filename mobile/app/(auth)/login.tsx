import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { useLogin } from "@/features/hooks";
import { useT, useTpl } from "@/i18n";
import { useState } from "react";
import { ApiClientError, isTimeoutError } from "@/services/api/httpClient";

export default function LoginScreen() {
  const tt = useT();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(tt("auth.invalidEmail")),
    password: z.string().min(6, tt("auth.passwordMin")),
  });

  type LoginForm = z.infer<typeof loginSchema>;

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
    } catch (e) {
      const message = isTimeoutError(e)
        ? tt("auth.serverWakingUp")
        : e instanceof ApiClientError
          ? e.message
          : tt("auth.loginError");
      setError("password", { message });
    }
  });

  return (
    <Screen keyboard className="justify-center">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="gap-8 px-2">
        <View className="items-center gap-3 pt-4">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Ionicons name="book" size={30} color="white" />
          </View>
          <Text className="text-3xl font-extrabold tracking-tight text-ink">LoanApp</Text>
          <Text className="text-center text-sm text-ink-muted">{tt("auth.tagline")}</Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                label={tt("auth.email")}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.email?.message}
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                label={tt("auth.password")}
                placeholder={tt("auth.password")}
                secureTextEntry={!showPassword}
                error={errors.password?.message}
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowPassword((v) => !v)}
            className="mt-1 self-end"
            hitSlop={8}
          >
            <Text className="text-sm font-medium text-primary-700">{tt(showPassword ? "auth.hide" : "auth.show")}</Text>
          </Pressable>

          <Button title={tt("auth.login")} onPress={onSubmit} loading={isSubmitting || login.isPending} fullWidth className="mt-2" />
        </View>

        <View className="flex-row justify-center gap-1">
          <Text className="text-sm text-ink-muted">{tt("auth.newHere")}</Text>
          <Link href="/(auth)/register" className="text-sm font-semibold text-primary-700">
            {tt("auth.createShop")}
          </Link>
        </View>

        <View className="rounded-2xl bg-info-50 p-4">
          <Text className="text-xs leading-5 text-info">{tt("auth.demoHint")}</Text>
        </View>
      </View>
    </Screen>
  );
}