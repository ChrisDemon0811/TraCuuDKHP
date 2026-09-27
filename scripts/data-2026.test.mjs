import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeTokens,
  matchRecords,
  normalizeCode,
  normalizeDate,
  normalizeRoom,
  normalizeText,
  processSources,
  splitClassCodes
} from "./data-2026-core.mjs";

test("Vietnamese text keeps accents and normalizes whitespace", () => {
  assert.equal(normalizeText(" Nguyễn  Văn A ").comparison, "NGUYỄN VĂN A");
  assert.equal(normalizeText("NGUYỄN VĂN A").comparison, "NGUYỄN VĂN A");
  assert.equal(normalizeCode(" 26 đh a ").normalized, "26ĐHA");
  assert.notEqual(normalizeRoom("A101").comparison, normalizeRoom("A-101").comparison);
  assert.deepEqual(splitClassCodes("26IT101, 26IT102"), ["26IT101", "26IT102"]);
  assert.deepEqual(normalizeDate("15/09/2026"), { original: "15/09/2026", iso: "2026-09-15" });
  assert.equal(normalizeDate("31/02/2026").iso, null);
});

test("exact LHP match preserves every PDT major; course name alone never matches", () => {
  const sv = [
    { courseClassCode: "ABC1", courseName: "Toán", lecturer: "A", room: "A101", periods: "1 - 3" },
    { courseClassCode: "OTHER", courseName: "Toán" }
  ];
  const pdt = [
    { courseClassCode: "ABC1", majorId: "2", courseName: "Toán", lecturer: "A", room: "A101", periods: "1 - 3" },
    { courseClassCode: "ABC1", majorId: "7", courseName: "Toán", lecturer: "A", room: "A101", periods: "1 - 3" }
  ];
  const matches = matchRecords(sv, pdt);
  assert.equal(matches[0].confidence, "exact");
  assert.deepEqual(matches[0].candidates.map((item) => item.majorId), ["2", "7"]);
  assert.equal(matches[1].confidence, "unmatched");
});

test("token is unsafe if any observed class is unresolved or another major occurs", () => {
  const classes = [
    { classCode: "26IT101", prefix: "IT", classification: "high", majorIds: ["pdt-2"] },
    { classCode: "26IT102", prefix: "IT", classification: "medium", majorIds: [] },
    { classCode: "26CE101", prefix: "CE", classification: "high", majorIds: ["pdt-11"] },
    { classCode: "26CE102", prefix: "CE", classification: "high", majorIds: ["pdt-11"] }
  ];
  const tokens = analyzeTokens(classes);
  assert.equal(tokens.find((item) => item.token === "IT").safeInObservedData, false);
  assert.equal(tokens.find((item) => item.token === "CE").safeInObservedData, true);
});

test("zero source records stop before any mapping is generated", () => {
  assert.throws(() => processSources({
    manifest: { cohort: 2026 },
    svRows: [],
    pdtRows: []
  }), /Input sources are empty/);
});
