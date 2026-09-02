import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { BottomSheet, SheetRow } from "@/components/ui/BottomSheet";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useShop, useUpdateShop } from "@/features/hooks";
import { useAuthStore } from "@/store/auth";
import { CURRENCIES, TIMEZONES } from "@/constants/api";
import type { Shop } from "@/types/api";
import { useT } from "@/i18n";

export default function ShopSettingsScreen() {
  const tt = useT();
  const { data: shop, isLoading, isError } = useShop();
  const updateShop = useUpdateShop();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [showCurrency, setShowCurrency] = useState(false);
  const [showTimezone, setShowTimezone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastLoadedShop, setLastLoadedShop] = useState<Shop | null>(null);
  if (shop && shop !== lastLoadedShop) {
    setLastLoadedShop(shop);
    setName(shop.name);
    setPhone(shop.phone ?? "");
    setAddress(shop.address ?? "");
  }

  if (isLoading) return <Screen scroll={false}><LoadingState /></Screen>;
  if (isError || !shop) {
    return <Screen scroll={false}><ErrorState message={tt("shop.loadError")} onRetry={() => {}} /></Screen>;
  }

  async function save() {
    if (!name.trim() || !shop) return;
    await updateShop.mutateAsync({ name: name.trim(), phone: phone.trim() || null, address: address.trim() || null });
    useAuthStore.setState({
      shop: { ...shop, name: name.trim(), phone: phone.trim() || null, address: address.trim() || null },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <Screen keyboard>
        <ScreenHeader title={tt("shop.title")} subtitle={tt("shop.subtitle")} />
        <View className="gap-4 px-1">
          <Input label={tt("shop.name")} placeholder={tt("shop.namePh")} value={name} onChangeText={setName} />
          <Input label={tt("common.phone")} placeholder={tt("shop.phonePh")} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Input label={tt("common.address")} placeholder={tt("shop.addressPh")} value={address} onChangeText={setAddress} />

          <View className="gap-2">
            <Text className="px-1 text-sm font-medium text-ink-soft">{tt("shop.currency")}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowCurrency(true)}
              className="flex-row items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3.5"
            >
              <Text className="text-base font-semibold text-ink">{shop.currency}</Text>
              <Ionicons name="chevron-down" size={18} color="#94A3B8" />
            </Pressable>
          </View>

          <View className="gap-2">
            <Text className="px-1 text-sm font-medium text-ink-soft">{tt("shop.timezone")}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowTimezone(true)}
              className="flex-row items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3.5"
            >
              <Text className="text-base font-semibold text-ink">{shop.timezone}</Text>
              <Ionicons name="chevron-down" size={18} color="#94A3B8" />
            </Pressable>
          </View>

          {saved ? (
            <View className="flex-row items-center gap-2 rounded-2xl bg-success-50 p-3">
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text className="text-xs font-medium text-success">{tt("shop.saved")}</Text>
            </View>
          ) : null}

          <Button title={tt("shop.save")} onPress={save} loading={updateShop.isPending} disabled={!name.trim()} fullWidth />
        </View>
      </Screen>

      <BottomSheet visible={showCurrency} onClose={() => setShowCurrency(false)} title={tt("shop.chooseCurrency")}>
        {CURRENCIES.map((c) => (
          <SheetRow
            key={c.code}
            label={c.label}
            value={c.symbol}
            selected={c.code === shop.currency}
            onPress={async () => {
              await updateShop.mutateAsync({ currency: c.code });
              useAuthStore.setState({ shop: { ...shop, currency: c.code } });
              setShowCurrency(false);
            }}
          />
        ))}
      </BottomSheet>

      <BottomSheet visible={showTimezone} onClose={() => setShowTimezone(false)} title={tt("shop.chooseTimezone")}>
        {TIMEZONES.map((tz) => (
          <SheetRow
            key={tz}
            label={tz}
            selected={tz === shop.timezone}
            onPress={async () => {
              await updateShop.mutateAsync({ timezone: tz });
              useAuthStore.setState({ shop: { ...shop, timezone: tz } });
              setShowTimezone(false);
            }}
          />
        ))}
      </BottomSheet>
    </>
  );
}