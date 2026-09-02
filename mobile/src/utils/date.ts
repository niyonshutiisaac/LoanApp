import dayjs from "dayjs";
import { t, tpl } from "@/i18n";

export type DueStatus = "overdue" | "due_today" | "due_soon" | "safe";

export function dueStatusTone(dueDate: string | null | undefined): "danger" | "warning" | "info" | "success" | "neutral" {
  const status = getDueStatus(dueDate);
  if (status === "overdue") return "danger";
  if (status === "due_today") return "warning";
  if (status === "due_soon") return "info";
  if (status === "safe") return "success";
  return "neutral";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dayjs(iso).format("MMM D, YYYY");
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dayjs(iso).format("MMM D");
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dayjs(iso).format("h:mm A");
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dayjs(iso).format("MMM D, YYYY · h:mm A");
}

export function getDueStatus(dueDate: string | null | undefined): DueStatus | null {
  if (!dueDate) return null;
  const diff = dayjs(dueDate).startOf("day").diff(dayjs().startOf("day"), "day");
  if (diff < 0) return "overdue";
  if (diff === 0) return "due_today";
  if (diff <= 5) return "due_soon";
  return "safe";
}

export function dueLabel(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null;
  const status = getDueStatus(dueDate);
  const diff = dayjs(dueDate).startOf("day").diff(dayjs().startOf("day"), "day");
  if (status === "overdue") {
    const days = Math.abs(diff);
    return days === 1 ? t("date.oneDayOverdue") : tpl("date.daysOverdue", { n: days });
  }
  if (status === "due_today") return t("date.dueToday");
  if (status === "due_soon") return diff === 1 ? t("date.dueTomorrow") : tpl("date.dueIn", { n: diff });
  return null;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return t("date.goodMorning");
  if (hour < 17) return t("date.goodDay");
  return t("date.goodEvening");
}

export function toIsoDate(date: Date): string {
  return dayjs(date).format("YYYY-MM-DD");
}

export function toIso(date: Date): string {
  return date.toISOString();
}