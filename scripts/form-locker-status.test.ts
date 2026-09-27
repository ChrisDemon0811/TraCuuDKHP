import assert from "node:assert/strict";
import lockers from "../src/data/form-lockers.json";
import { getLockerStatus, isSlotOpen } from "../src/lib/formLockerStatus";
import type { FormLocker } from "../src/types";

function vietnamTime(dayOfWeek: number, hour: number, minute: number): Date {
  // 2026-09-28 is a Monday; Vietnam is UTC+7.
  return new Date(Date.UTC(2026, 8, 27 + dayOfWeek, hour - 7, minute));
}

for (const locker of lockers as FormLocker[]) {
  for (const slot of locker.slots) {
    const morning = slot.session === "morning";
    assert.equal(slot.startTime, morning ? "07:30" : "13:00");
    assert.equal(slot.endTime, morning ? "11:30" : "17:00");
    assert.equal(isSlotOpen(slot, vietnamTime(slot.dayOfWeek, morning ? 7 : 12, morning ? 29 : 59)), false);
    assert.equal(isSlotOpen(slot, vietnamTime(slot.dayOfWeek, morning ? 7 : 13, morning ? 30 : 0)), true);
    assert.equal(isSlotOpen(slot, vietnamTime(slot.dayOfWeek, morning ? 11 : 17, morning ? 30 : 0)), true);
    assert.equal(isSlotOpen(slot, vietnamTime(slot.dayOfWeek, morning ? 11 : 17, morning ? 31 : 1)), false);
  }
}

const business = (lockers as FormLocker[]).find((locker) => locker.id === "quan-tri-kinh-doanh");
assert.ok(business);
assert.equal(getLockerStatus(business, vietnamTime(1, 12, 30)).isOpen, false);
console.log(`Locker boundaries: ${lockers.length} faculties, 18 slots passed.`);
