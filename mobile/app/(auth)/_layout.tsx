import { Redirect, Stack } from "expo-router";
import { useT, useTpl } from "@/i18n";
import { useAuthStore } from "@/store/auth";

export default function AuthLayout() {
  const tt = useT();
  const accessToken = useAuthStore((s) => s.accessToken);
  if (accessToken) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}