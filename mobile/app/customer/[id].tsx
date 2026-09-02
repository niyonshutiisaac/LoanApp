import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { MoneyText } from "@/components/ui/MoneyText";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SuccessOverlay } from "@/components/ui/SuccessOverlay";
import { useArchiveCustomer, useCustomer, useCustomerLedger, useCreateReminder, useShop } from "@/features/hooks";
import { useT, useTpl } from "@/i18n";
import { dueLabel, dueStatusTone, formatDate } from "@/utils/date";
import { formatMoney } from "@/utils/money";
import { ApiClientError } from "@/services/api/httpClient";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tt = useT();
  const tpl = useTpl();
  const { data: customer, isLoading, isError, refetch } = useCustomer(id);
  const { data: ledger } = useCustomerLedger(id);
  const { data: shopData } = useShop();
  const currency = shopData?.currency ?? "RWF";
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const archiveCustomer = useArchiveCustomer();
  const createReminder = useCreateReminder();

  if (isLoading) return <Screen scroll={false}><LoadingState /></Screen>;
  if (isError || !customer) {
    return (
      <Screen scroll={false}>
        <ErrorState message={tt("cud.loadError")} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const status = dueStatusTone(customer.nextDueDate);
  const label = dueLabel(customer.nextDueDate);
  const hasBalance = Number(customer.balance) > 0;

  async function sendReminder() {
    setSending(true);
    setReminderError(null);
    try {
      await createReminder.mutateAsync({ customerId: customer!.id, amount: customer!.balance });
      setReminderSent(true);
    } catch (e) {
      setReminderError(e instanceof ApiClientError ? e.message : tt("cud.reminderError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Screen>
        <ScreenHeader
          title={customer.name}
          subtitle={customer.phone ?? tt("cud.noPhone")}
          right={
            <Pressable onPress={() => router.push(`/customer/new?editId=${customer.id}`)} hitSlop={8} accessibilityRole="button" accessibilityLabel={tt("cud.editAria")} className="h-11 w-11 items-center justify-center rounded-full active:bg-zinc-100">
              <Ionicons name="create-outline" size={22} color="#0F766E" />
            </Pressable>
          }
        />

        <Card className="gap-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-medium text-ink-soft">{hasBalance ? tt("cud.owesYou") : tt("cud.balanceSettled")}</Text>
              <MoneyText amount={customer.balance} currency={currency} size="xl" tone={hasBalance ? "danger" : "success"} className="mt-1" />
            </View>
            {label ? <Badge label={label} tone={status} /> : null}
          </View>
          <View className="flex-row border-t border-zinc-100 pt-3">
            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-wide text-ink-muted">{tt("cud.nextDue")}</Text>
              <Text className="mt-0.5 text-sm font-semibold text-ink">{formatDate(customer.nextDueDate)}</Text>
            </View>
            <View className="flex-1 border-l border-zinc-100 pl-3">
              <Text className="text-[11px] uppercase tracking-wide text-ink-muted">{tt("cud.boughtOnCredit")}</Text>
              <Text className="mt-0.5 text-sm font-semibold text-ink">{formatMoney(customer.totalBought, currency)}</Text>
            </View>
            <View className="flex-1 border-l border-zinc-100 pl-3">
              <Text className="text-[11px] uppercase tracking-wide text-ink-muted">{tt("cud.totalPaid")}</Text>
              <Text className="mt-0.5 text-sm font-semibold text-success">{formatMoney(customer.totalPaid, currency)}</Text>
            </View>
          </View>
        </Card>

        <Card className="flex-row gap-2">
          <View className="flex-1">
            <Button
              title={tt("cud.recordPayment")}
              size="sm"
              icon={<Ionicons name="cash-outline" size={16} color="white" />}
              onPress={() => router.push(`/payment/new?customerId=${customer.id}`)}
              disabled={!hasBalance}
            />
          </View>
          <View className="flex-1">
            <Button
              title={tt("cud.creditSale")}
              size="sm"
              variant="secondary"
              icon={<Ionicons name="book-outline" size={16} color="#0F766E" />}
              onPress={() => router.push(`/sale/new?customerId=${customer.id}`)}
            />
          </View>
        </Card>

        <View className="gap-2">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-sm font-semibold text-ink-soft">{tt("cud.smsReminder")}</Text>
          </View>
          <Card className="flex-row items-center gap-2">
            <View className="flex-1">
              <Text className="text-sm text-ink-soft">
                {customer.phone ? tpl("cud.sendSms", { p: customer.phone.split(" ").slice(-1)[0] ?? tt("cud.thisCustomer") }) : tt("cud.addPhoneSms")}
              </Text>
              {reminderError ? <Text className="mt-1 text-xs text-danger">{reminderError}</Text> : null}
            </View>
            <Button
              title={sending ? tt("cud.sending") : tt("cud.send")}
              size="sm"
              variant="outline"
              disabled={!customer.phone || sending}
              loading={sending}
              onPress={sendReminder}
            />
          </Card>
        </View>

        <View className="gap-2">
          <Text className="px-1 text-sm font-semibold text-ink-soft">{tt("cud.transactionHistory")}</Text>
          <Card>
            {ledger && ledger.length > 0 ? (
              ledger.map((entry) => {
                const isOwed = entry.direction === "IN";
                return (
                  <View key={entry.id} className="flex-row items-center gap-3 border-b border-zinc-100 py-2.5 last:border-0">
                    <View className={`h-9 w-9 items-center justify-center rounded-full ${isOwed ? "bg-danger-100" : "bg-success-100"}`}>
                      <Ionicons name={isOwed ? "arrow-down" : "arrow-up"} size={16} color={isOwed ? "#DC2626" : "#16A34A"} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-ink">{entry.description}</Text>
                      <Text className="text-xs text-ink-muted">{formatDate(entry.createdAt)}</Text>
                    </View>
                    <Text className={`text-[15px] font-bold ${isOwed ? "text-danger" : "text-success"}`}>
                      {isOwed ? "+" : "-"}{formatMoney(entry.amount, currency)}
                    </Text>
                  </View>
                );
              })
            ) : (
              <EmptyState icon="receipt-outline" title={tt("cud.noTransactions")} />
            )}
          </Card>
          <Badge label={tt("cud.balanceFromRecords")} tone="neutral" className="self-center" />
        </View>
      </Screen>

      <ConfirmDialog
        visible={confirmArchive}
        title={tt("cud.archiveTitle")}
        message={tt("cud.archiveMessage")}
        confirmLabel={tt("cud.archive")}
        destructive
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          archiveCustomer.mutate(customer.id);
          setConfirmArchive(false);
          router.back();
        }}
      />

      <SuccessOverlay
        visible={reminderSent}
        title={tt("cud.reminderSent")}
        subtitle={tt("cud.reminderSentSub")}
        buttonLabel={tt("common.done")}
        onDone={() => setReminderSent(false)}
      />
    </>
  );
}