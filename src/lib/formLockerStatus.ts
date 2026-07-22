import type { FormLocker, LockerSlot, LockerStatus } from "@/types";

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

const vietnamDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: VIETNAM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

const DAY_LABELS: Record<number, string> = {
  1: "thứ 2",
  2: "thứ 3",
  3: "thứ 4",
  4: "thứ 5",
  5: "thứ 6",
  6: "thứ 7",
  7: "Chủ nhật"
};

const SESSION_LABELS = {
  morning: "Sáng",
  afternoon: "Chiều"
} as const;

export interface VietnamDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface NextOpenSlot {
  slot: LockerSlot;
  daysUntil: number;
  text: string;
}

export function getVietnamDateParts(date: Date = new Date()): VietnamDateParts {
  const parts = vietnamDateFormatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second
  };
}

export function getCurrentVietnamDayOfWeek(date: Date = new Date()): number {
  const { year, month, day } = getVietnamDateParts(date);
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return utcDay === 0 ? 7 : utcDay;
}

export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function isSlotOpen(slot: LockerSlot, now: Date = new Date()): boolean {
  if (slot.dayOfWeek !== getCurrentVietnamDayOfWeek(now)) {
    return false;
  }

  const { hour, minute } = getVietnamDateParts(now);
  const currentMinutes = hour * 60 + minute;

  return currentMinutes >= timeToMinutes(slot.startTime) && currentMinutes <= timeToMinutes(slot.endTime);
}

export function getNextOpenSlot(locker: FormLocker, now: Date = new Date()): NextOpenSlot | null {
  if (locker.slots.length === 0) {
    return null;
  }

  const currentDay = getCurrentVietnamDayOfWeek(now);
  const { hour, minute } = getVietnamDateParts(now);
  const currentMinutes = hour * 60 + minute;

  const upcomingSlots = locker.slots.map((slot) => {
    let daysUntil = (slot.dayOfWeek - currentDay + 7) % 7;

    // A slot that already started today belongs to the next weekly cycle.
    if (daysUntil === 0 && timeToMinutes(slot.startTime) <= currentMinutes) {
      daysUntil = 7;
    }

    return { slot, daysUntil };
  });

  upcomingSlots.sort((first, second) => {
    if (first.daysUntil !== second.daysUntil) {
      return first.daysUntil - second.daysUntil;
    }

    return timeToMinutes(first.slot.startTime) - timeToMinutes(second.slot.startTime);
  });

  const next = upcomingSlots[0];
  return {
    ...next,
    text: formatSlotLabel(next.slot)
  };
}

export function getLockerStatus(locker: FormLocker, now: Date = new Date()): LockerStatus {
  const activeSlot = locker.slots.find((slot) => isSlotOpen(slot, now)) ?? null;
  const nextOpenSlot = getNextOpenSlot(locker, now);

  return {
    isOpen: activeSlot !== null,
    statusText: activeSlot ? "Đang mở" : "Đã khóa",
    activeSlot,
    currentSessionText: activeSlot
      ? `Đang trong lịch mở buổi ${activeSlot.session === "morning" ? "sáng" : "chiều"}`
      : null,
    nextOpenText: nextOpenSlot?.text ?? "Chưa có lịch mở tiếp theo"
  };
}

export function formatSlotLabel(slot: LockerSlot): string {
  return `${SESSION_LABELS[slot.session]} ${DAY_LABELS[slot.dayOfWeek]}`;
}
