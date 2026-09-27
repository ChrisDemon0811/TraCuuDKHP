import assert from "node:assert/strict";
import classMappings from "../src/data/class-mappings-2026.json";
import curatedPrefixes from "./data-2026-faculty-prefixes.json";
import { findSchedulesForClassCode } from "../src/lib/lookup";

const majorNames = new Map(classMappings.majors.map((major) => [major.id, major.name]));
assert.deepEqual(Object.fromEntries(curatedPrefixes.rules.map((rule) => [rule.prefix, rule.facultyId])), {
  AC: "dien-dien-tu",
  ET: "dien-dien-tu",
  AE: "ky-thuat-hang-khong",
  AT: "khai-thac-hang-khong",
  BA: "quan-tri-kinh-doanh",
  HR: "quan-tri-kinh-doanh",
  MK: "quan-tri-kinh-doanh",
  FT: "quan-tri-kinh-doanh",
  DE: "kinh-te-hang-khong",
  IB: "kinh-te-hang-khong",
  KO: "ngoai-ngu",
  LA: "xay-dung"
});
const curatedByPrefix = new Map(curatedPrefixes.rules.map((rule) => [rule.prefix, rule.facultyId]));
assert.deepEqual(
  classMappings.curatedFacultyPrefixRules.map(({ prefix, facultyId }) => ({ prefix, facultyId })),
  curatedPrefixes.rules
);

for (const [code, mapping] of Object.entries(classMappings.classMappings)) {
  const result = findSchedulesForClassCode(code);
  assert.equal(result.status, "faculty_without_schedule", code);
  assert.equal(result.selectedFaculty?.faculty.id, mapping.facultyId, code);
  assert.deepEqual(result.majorNames, mapping.majorIds.map((id) => majorNames.get(id)), code);
  assert.deepEqual(result.schedules, [], code);
}

for (const code of classMappings.knownUnresolvedClassCodes) {
  const result = findSchedulesForClassCode(code);
  const facultyId = curatedByPrefix.get(code.match(/^26([A-Z]{2})/u)?.[1] ?? "");
  assert.equal(result.status, facultyId ? "faculty_without_schedule" : "not_found", code);
  assert.equal(result.selectedFaculty?.faculty.id, facultyId, code);
  assert.deepEqual(result.schedules, [], code);
}

for (const rule of curatedPrefixes.rules) {
  for (const code of [`26${rule.prefix}`, `26${rule.prefix}999`]) {
    const result = findSchedulesForClassCode(code);
    assert.equal(result.status, "faculty_without_schedule", code);
    assert.equal(result.selectedFaculty?.faculty.id, rule.facultyId, code);
    assert.equal(result.selectedFaculty?.matchKind, "curated_prefix", code);
    assert.deepEqual(result.majorNames, undefined, code);
    assert.deepEqual(result.schedules, [], code);
  }
}

for (const rule of classMappings.safePrefixRules) {
  const prefixResult = findSchedulesForClassCode(`26${rule.prefix}`);
  assert.equal(prefixResult.status, "faculty_without_schedule", rule.prefix);
  assert.equal(prefixResult.selectedFaculty?.faculty.id, rule.facultyId, rule.prefix);
  assert.equal(prefixResult.selectedFaculty?.matchKind, "cohort_prefix", rule.prefix);

  const code = `26${rule.prefix}999`;
  const result = findSchedulesForClassCode(code);
  assert.equal(result.status, "faculty_without_schedule", code);
  assert.equal(result.selectedFaculty?.faculty.id, rule.facultyId, code);
  assert.equal(result.selectedFaculty?.matchKind, "cohort_prefix", code);
  assert.deepEqual(result.schedules, [], code);
}

assert.equal(findSchedulesForClassCode("26IT301").selectedFaculty?.faculty.id, "cong-nghe-thong-tin");
assert.equal(findSchedulesForClassCode("26it").selectedFaculty?.faculty.id, "cong-nghe-thong-tin");
assert.equal(findSchedulesForClassCode("26IT999").selectedFaculty?.faculty.id, "cong-nghe-thong-tin");
assert.equal(findSchedulesForClassCode("26BA").selectedFaculty?.faculty.id, "quan-tri-kinh-doanh");
assert.equal(findSchedulesForClassCode("26FT999").selectedFaculty?.faculty.id, "quan-tri-kinh-doanh");
assert.equal(findSchedulesForClassCode("26KO999").selectedFaculty?.faculty.id, "ngoai-ngu");
assert.equal(findSchedulesForClassCode("26ITXYZ").status, "not_found");
assert.equal(findSchedulesForClassCode("26ĐHTT02").status, "not_found");
console.log(
  `2026 lookup: ${Object.keys(classMappings.classMappings).length} mapped, ` +
  `${classMappings.knownUnresolvedClassCodes.length} classes without confirmed majors, ` +
  `${curatedPrefixes.rules.length} curated faculty prefixes, no guessed registration schedule.`
);
