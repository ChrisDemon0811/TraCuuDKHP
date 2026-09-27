import assert from "node:assert/strict";
import { findSchedulesForClassCode } from "../src/lib/lookup";

const legacyCases = [
  { code: "23ĐHĐT01", facultyId: "dien-dien-tu", schedules: ["2023-dai-hoc"] },
  { code: "23ĐHXD01", facultyId: "xay-dung", schedules: ["2023-dai-hoc"] },
  { code: "24ĐHTT02", facultyId: "cong-nghe-thong-tin", schedules: ["2024-2c"] },
  { code: "24ĐHDL01", facultyId: "du-lich-dich-vu-hang-khong", schedules: ["2024-2b"] },
  { code: "25ĐHTT02", facultyId: "cong-nghe-thong-tin", schedules: ["2025-3e"] },
  { code: "25ĐHKL01", facultyId: "khai-thac-hang-khong", schedules: ["2025-3b"] },
  { code: "25ĐHMK01", facultyId: "quan-tri-kinh-doanh", schedules: ["2025-3f"] },
  { code: "25ĐHQT01", facultyId: "quan-tri-kinh-doanh", schedules: ["2025-3g"] }
];

for (const testCase of legacyCases) {
  const result = findSchedulesForClassCode(testCase.code);
  assert.equal(result.status, "found", testCase.code);
  assert.equal(result.selectedFaculty?.faculty.id, testCase.facultyId, testCase.code);
  assert.deepEqual(result.schedules.map((item) => item.schedule.id), testCase.schedules, testCase.code);
}

console.log("2023, 2024, 2025 regression: 8 cases passed.");
