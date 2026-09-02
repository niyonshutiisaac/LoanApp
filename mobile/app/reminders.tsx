import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PaginatedList } from "@/components/features/PaginatedList";
import { Badge } from "@/components/ui/Badge";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useSendReminder, useReminders } from "@/features/hooks";
import { usePagination } from "@/hooks/usePagination";
import { formatDateTime } from "@/utils/date";
import { ApiClientError } from "@/services/api/httpClient";
import { remindersApi } from "@/services/api";
import { queryClient } from "@/lib/queryClient";
import type { Reminder } from "@/types/api";
import { useT, useTpl, type TranslationKey } from "@/i18n";
import { useState } from "react";

const statusTone = (s: Reminder["status"]) =>
  s === "SENT" ? "success" : s === "FAILED" ? "danger" : s === "CANCELLED" ? "neutral" : "warning";

const statusLabel: Record<Reminder["status"], TranslationKey> = {
  PENDING: "rem.statusPending",
  SENT: "rem.statusSent",
  FAILED: "rem.statusFailed",
  CANCELLED: "rem.statusCancelled",
};

export default function RemindersScreen() {
  const router = useRouter();
  const tt = useT();
  const tpl = useTpl();
  const { page, nextPage, hasMore } = usePagination({ limit: 20 });
  const [errorFor, setErrorFor] = useState<string | null>(null);
  const sendReminder = useSendReminder();
  const { data, isLoading, isError, isFetching, refetch } = useReminders({ page, limit: 20 });

  return (
    <Screen scroll={false}>
      <ScreenHeader title={tt("rem.title")} subtitle={tt("rem.subtitle")} />
      <PaginatedList
        className="flex-1 px-4"
        isLoading={isLoading}
        isError={isError}
        data={data?.items ?? []}
        keyExtractor={(item: Reminder) => item.id}
        onRetry={() => refetch()}
        hasMore={hasMore(data)}
        loadingMore={isFetching}
        onEndReached={nextPage}
        empty={{
          title: tt("rem.emptyTitle"),
          message: tt("rem.emptyMessage"),
        }}
        renderItem={({ item }: { item: Reminder }) => (
          <View className="rounded-2xl border border-zinc-200/80 bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Pressable onPress={() => router.push(`/customer/${item.customerId}`)} className="flex-1">
                <Text className="text-[15px] font-semibold text-ink">{item.customerName}</Text>
              </Pressable>
              <Badge label={tt(statusLabel[item.status])} tone={statusTone(item.status)} />
            </View>
            <Text className="mt-1.5 text-xs leading-5 text-ink-soft" numberOfLines={2}>
              {item.message}
            </Text>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-[11px] text-ink-muted">
                {item.channel} · {tpl("rem.scheduled", { d: formatDateTime(item.scheduledFor) })}
                {item.sentAt ? tpl("rem.sent", { d: formatDateTime(item.sentAt) }) : ""}
              </Text>
              {item.status === "PENDING" ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={async () => {
                    setErrorFor(null);
                    try {
                      await sendReminder.mutateAsync(item.id);
                      await remindersApi.list({ page, limit: 20 }).then(() =>
                        queryClient.invalidateQueries({ queryKey: ["reminders"] }),
                      );
                    } catch (e) {
                      setErrorFor(e instanceof ApiClientError ? e.message : tt("rem.sendFailed"));
                    }
                  }}
                  className="rounded-full bg-primary px-3 py-1.5 active:bg-primary-800"
                >
                  <Text className="text-xs font-semibold text-white">{tt("rem.sendNow")}</Text>
                </Pressable>
              ) : null}
            </View>
            {errorFor && item.status === "PENDING" ? (
              <Text className="mt-1 text-xs text-danger">{errorFor}</Text>
            ) : null}
          </View>
        )}
      />
      <View className="flex-row items-center gap-1.5 px-4 pb-4">
        <Ionicons name="information-circle-outline" size={14} color="#94A3B8" />
        <Text className="flex-1 text-[11px] text-ink-muted">
          {tt("rem.info")}
        </Text>
      </View>
    </Screen>
  );
}