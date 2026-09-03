import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useChangePassword } from "@/features/hooks";
import { useAuthStore } from "@/store/auth";
import { useLocaleStore, useT, useTpl, type Locale } from "@/i18n";
import { formatDate } from "@/utils/date";

const LANGUAGE_OPTIONS: { label: string; value: Locale }[] = [
  { label: "English", value: "en" },
  { label: "Kinyarwanda", value: "rw" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const tt = useT();
  const tpl = useTpl();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const user = useAuthStore((s) => s.user);
  const changePasswordMutation = useChangePassword();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [languageSaved, setLanguageSaved] = useState(false);

  async function changePassword() {
    setMessage(null);
    if (!oldPassword) {
      setMessage({ tone: "error", text: tt("set.oldPasswordError") });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ tone: "error", text: tt("set.newPasswordError") });
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({ oldPassword, newPassword });
      setOldPassword("");
      setNewPassword("");
      setMessage({ tone: "success", text: tt("set.passwordChanged") });
    } catch {
      setMessage({ tone: "error", text: tt("set.passwordFailed") });
    }
  }

  return (
    <Screen>
      <ScreenHeader title={tt("set.title")} />
      <Card>
        <View className="flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-50">
            <Text className="text-xl font-bold text-primary-800">{(user?.name ?? "S").charAt(0).toUpperCase()}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-ink">{user?.name ?? tt("common.shopkeeper")}</Text>
            <Text className="text-sm text-ink-muted">{user?.email}</Text>
            <Text className="text-xs text-ink-muted">{tpl("set.joined", { d: formatDate(user?.createdAt) })}</Text>
          </View>
        </View>
      </Card>

      <View className="gap-2">
        <Text className="px-1 text-sm font-semibold text-ink-soft">{tt("set.changePassword")}</Text>
        <Card className="gap-3">
          <Input label={tt("set.oldPassword")} secureTextEntry value={oldPassword} onChangeText={setOldPassword} placeholder="••••••••" />
          <Input label={tt("set.newPassword")} secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholder={tt("auth.min6")} />
          {message ? (
            <Text className={`text-xs ${message.tone === "success" ? "text-success" : "text-danger"}`}>{message.text}</Text>
          ) : null}
          <Button
            title={tt("set.updatePassword")}
            variant="outline"
            size="md"
            onPress={changePassword}
            loading={changePasswordMutation.isPending}
          />
        </Card>
      </View>

      <View className="gap-2">
        <Text className="px-1 text-sm font-semibold text-ink-soft">{tt("set.language")}</Text>
        <Card className="p-1.5">
          {LANGUAGE_OPTIONS.map((option, index) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              onPress={() => {
                setLocale(option.value);
                setLanguageSaved(true);
                setTimeout(() => setLanguageSaved(false), 2500);
              }}
              className={`flex h-14 flex-row items-center gap-3 rounded-xl px-3 active:bg-zinc-50 ${index > 0 ? "border-t border-zinc-100" : ""}`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
                <Ionicons name="language-outline" size={18} color="#0F766E" />
              </View>
              <Text className="flex-1 text-[15px] font-medium text-ink">{option.label}</Text>
              {locale === option.value ? <Ionicons name="checkmark" size={18} color="#0F766E" /> : null}
            </Pressable>
          ))}
        </Card>
        {languageSaved ? (
          <View className="flex-row items-center gap-2 rounded-2xl bg-success-50 p-3">
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text className="text-xs font-medium text-success">{tt("set.languageSaved")}</Text>
          </View>
        ) : null}
      </View>

      <View className="gap-2">
        <Text className="px-1 text-sm font-semibold text-ink-soft">{tt("set.session")}</Text>
        <Card className="p-1.5">
          <Pressable
            onPress={() => setConfirmLogout(true)}
            className="h-14 flex-row items-center gap-3 rounded-xl px-3 active:bg-danger-50"
            accessibilityRole="button"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-danger-100">
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </View>
            <Text className="flex-1 text-[15px] font-medium text-danger">{tt("more.logOut")}</Text>
          </Pressable>
        </Card>
      </View>

      <ConfirmDialog
        visible={confirmLogout}
        title={tt("more.logOutTitle")}
        message={tt("more.logOutMessage")}
        confirmLabel={tt("more.logOut")}
        cancelLabel={tt("common.stay")}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          useAuthStore.getState().logout().then(() => {
            router.replace("/(auth)/login");
          });
        }}
      />
    </Screen>
  );
}