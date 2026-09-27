import classMappings2026 from "@/data/class-mappings-2026.json";
import { faculties, facultyById, schedules } from "@/lib/data";
import type {
  FacultyDetection,
  LookupResult,
  RegistrationSchedule,
  ScheduleMatch
} from "@/types";

const QTKD_FACULTY_ID = "quan-tri-kinh-doanh";
const QTKD_2025_AMBIGUOUS_SCHEDULE_IDS = new Set(["2025-3f", "2025-3g"]);
const mapping2026 = classMappings2026 as {
  classMappings: Record<string, {
    facultyId: string;
    majorIds: string[];
    confidence: "high";
  }>;
  knownUnresolvedClassCodes: string[];
  safePrefixRules: Array<{ prefix: string; facultyId: string; observedClassCount: number }>;
  curatedFacultyPrefixRules: Array<{ prefix: string; facultyId: string; source: string }>;
  majors: Array<{ id: string; name: string; facultyId: string | null }>;
};
const unresolved2026 = new Set(mapping2026.knownUnresolvedClassCodes);
const safePrefixes2026 = new Map((mapping2026.safePrefixRules ?? []).map((rule) => [rule.prefix, rule]));
const curatedPrefixes2026 = new Map((mapping2026.curatedFacultyPrefixRules ?? []).map((rule) => [rule.prefix, rule]));
const majorNames2026 = new Map(mapping2026.majors.map((major) => [major.id, major.name]));

export function normalizeClassCode(input: string): string {
  return input.trim().normalize("NFC").toLocaleUpperCase("vi-VN").replace(/\s+/g, "");
}

export function patternToRegex(pattern: string): RegExp {
  const compactPattern = pattern.trim().normalize("NFC").replace(/\s+/g, "");
  const chars = Array.from(compactPattern);
  const wildcardIndexes = new Set<number>();

  // Wildcards in the source data are the leading/trailing x placeholders.
  for (let index = 0; index < chars.length && isWildcardChar(chars[index]); index += 1) {
    wildcardIndexes.add(index);
  }

  for (let index = chars.length - 1; index >= 0 && isWildcardChar(chars[index]); index -= 1) {
    wildcardIndexes.add(index);
  }

  const source = chars
    .map((char, index) => {
      if (wildcardIndexes.has(index)) {
        return "[\\p{L}\\p{N}_-]";
      }

      return escapeRegex(char.toLocaleUpperCase("vi-VN"));
    })
    .join("");

  return new RegExp(`^${source}$`, "u");
}

export function extractCohort(code: string): number | null {
  const normalizedCode = normalizeClassCode(code);
  const match = normalizedCode.match(/^(\d{2})/);

  if (!match) {
    return null;
  }

  return 2000 + Number(match[1]);
}

export function detectFaculty(code: string): FacultyDetection[] {
  const normalizedCode = normalizeClassCode(code);
  if (extractCohort(normalizedCode) === 2026) {
    const mapping = mapping2026.classMappings[normalizedCode];
    if (mapping) {
      const faculty = facultyById.get(mapping.facultyId);
      return faculty ? [{
        faculty,
        matchedPatterns: [],
        matchedTokens: [],
        matchKind: "class_mapping"
      }] : [];
    }

    // A validated 2026 prefix works with or without the optional class number.
    const prefix = normalizedCode.match(/^26([A-Z]{2})\d*$/u)?.[1];
    const safeRule = prefix && safePrefixes2026.get(prefix);
    const curatedRule = prefix && curatedPrefixes2026.get(prefix);
    const rule = safeRule || curatedRule;
    const faculty = rule && facultyById.get(rule.facultyId);
    return faculty ? [{
      faculty,
      matchedPatterns: [],
      matchedTokens: [prefix],
      matchKind: safeRule ? "cohort_prefix" : "curated_prefix"
    }] : [];
  }
  const detections = faculties
    .map((faculty) => {
      const matchedPatterns = faculty.patterns.filter((pattern) =>
        patternToRegex(pattern).test(normalizedCode)
      );
      const tokenMatches = findTokenMatches(normalizedCode, faculty.tokens);

      if (matchedPatterns.length === 0 && tokenMatches.length === 0) {
        return null;
      }

      return {
        faculty,
        matchedPatterns,
        matchedTokens: tokenMatches,
        matchKind: matchedPatterns.length > 0 ? "pattern" : "token"
      } satisfies FacultyDetection;
    })
    .filter((match): match is NonNullable<typeof match> => match !== null);

  const patternMatches = detections.filter((match) => match.matchedPatterns.length > 0);

  if (patternMatches.length > 0) {
    return patternMatches.sort(sortDetections);
  }

  const longestTokenLength = Math.max(
    0,
    ...detections.flatMap((match) => match.matchedTokens.map((token) => token.length))
  );

  return detections
    .map((match) => ({
      ...match,
      matchedTokens: match.matchedTokens.filter((token) => token.length === longestTokenLength)
    }))
    .filter((match) => match.matchedTokens.length > 0)
    .sort(sortDetections);
}

export function findSchedulesForClassCode(input: string): LookupResult {
  const normalizedCode = normalizeClassCode(input);
  const cohort = extractCohort(normalizedCode);

  if (!normalizedCode) {
    return makeResult({
      status: "empty",
      input,
      normalizedCode,
      cohort,
      message: "Nhập mã lớp để bắt đầu tra cứu."
    });
  }

  const facultyMatches = detectFaculty(normalizedCode);

  if (!cohort) {
    return makeResult({
      status: "invalid",
      input,
      normalizedCode,
      cohort,
      facultyMatches,
      message: "Chưa đọc được khóa từ 2 chữ số đầu của mã lớp."
    });
  }

  if (facultyMatches.length === 0) {
    return makeResult({
      status: "not_found",
      input,
      normalizedCode,
      cohort,
      message: cohort === 2026 && unresolved2026.has(normalizedCode)
        ? "Mã lớp 2026 đã có trong nguồn lịch, nhưng chưa đủ bằng chứng để xác định khoa/ngành chính xác."
        : "Chưa nhận diện được khoa/ngành từ mã lớp này."
    });
  }

  if (facultyMatches.length > 1) {
    return makeResult({
      status: "ambiguous_faculty",
      input,
      normalizedCode,
      cohort,
      facultyMatches,
      message: "Mã lớp có thể thuộc nhiều khoa/ngành. Vui lòng kiểm tra lại mã ngành."
    });
  }

  const selectedFaculty = facultyMatches[0];
  const majorNames = cohort === 2026
    ? mapping2026.classMappings[normalizedCode]?.majorIds
      .map((id) => majorNames2026.get(id))
      .filter((name): name is string => Boolean(name))
    : undefined;
  const { matches, warnings } = findSchedulesForFaculty(cohort, selectedFaculty);

  if (matches.length === 0) {
    return makeResult({
      status: "faculty_without_schedule",
      input,
      normalizedCode,
      cohort,
      facultyMatches,
      selectedFaculty,
      majorNames,
      message: cohort === 2026
        ? selectedFaculty.matchKind === "curated_prefix"
          ? "Đã nhận diện khoa theo bảng đối chiếu tiền tố khóa 2026. Chưa xác định ngành cụ thể hoặc lịch đăng ký trong dữ liệu hiện tại."
          : selectedFaculty.matchKind === "cohort_prefix"
          ? "Đã nhận diện khoa từ tiền tố mã lớp 2026 đã kiểm chứng. Chưa có lịch đăng ký khóa 2026 trong dữ liệu hiện tại."
          : "Đã nhận diện được khoa/ngành, nhưng chưa có lịch đăng ký học phần khóa 2026 trong dữ liệu hiện tại."
        : "Đã nhận diện được khoa/ngành nhưng chưa có lịch đăng ký trong dữ liệu hiện tại."
    });
  }

  return makeResult({
    status: "found",
    input,
    normalizedCode,
    cohort,
    facultyMatches,
    selectedFaculty,
    majorNames,
    schedules: matches,
    warnings,
    message: "Đã tìm thấy lịch đăng ký phù hợp."
  });
}

function findSchedulesForFaculty(
  cohort: number,
  selectedFaculty: FacultyDetection
): { matches: ScheduleMatch[]; warnings: string[] } {
  const warnings: string[] = [];
  const cohortSchedules = schedules.filter((schedule) => schedule.cohort === cohort);

  const directMatches = cohortSchedules
    .filter((schedule) => schedule.appliesToFacultyIds?.includes(selectedFaculty.faculty.id))
    .map((schedule) => ({
      schedule,
      reason: selectedFaculty.faculty.name
    }));

  const tokenMatches = cohortSchedules
    .map((schedule) => {
      const tokenRule = schedule.appliesToTokenRules?.find(
        (rule) =>
          rule.facultyId === selectedFaculty.faculty.id &&
          rule.tokens.some((token) => selectedFaculty.matchedTokens.includes(normalizeClassCode(token)))
      );

      if (!tokenRule) {
        return null;
      }

      return {
        schedule,
        reason: tokenRule.label
      } satisfies ScheduleMatch;
    })
    .filter((match): match is ScheduleMatch => Boolean(match));

  const uniqueMatches = uniqueScheduleMatches([...directMatches, ...tokenMatches]);

  if (uniqueMatches.length > 0) {
    return { matches: uniqueMatches, warnings };
  }

  if (cohort === 2025 && selectedFaculty.faculty.id === QTKD_FACULTY_ID) {
    warnings.push(
      "Mã này thuộc Khoa Quản trị kinh doanh, cần đối chiếu chuyên ngành để chọn lịch chính xác."
    );

    const possibleMatches = cohortSchedules
      .filter((schedule) => QTKD_2025_AMBIGUOUS_SCHEDULE_IDS.has(schedule.id))
      .map((schedule) => ({
        schedule,
        reason: "Lịch khả dĩ cho Khoa Quản trị kinh doanh"
      }));

    return { matches: possibleMatches, warnings };
  }

  return { matches: [], warnings };
}

function findTokenMatches(code: string, tokens: string[]): string[] {
  return tokens
    .map(normalizeClassCode)
    .filter((token) => token.length > 0 && code.includes(token))
    .sort((a, b) => b.length - a.length || a.localeCompare(b, "vi"));
}

function uniqueScheduleMatches(matches: ScheduleMatch[]): ScheduleMatch[] {
  const seen = new Set<string>();

  return matches.filter((match) => {
    if (seen.has(match.schedule.id)) {
      return false;
    }

    seen.add(match.schedule.id);
    return true;
  });
}

function sortDetections(a: FacultyDetection, b: FacultyDetection): number {
  const aBestToken = Math.max(0, ...a.matchedTokens.map((token) => token.length));
  const bBestToken = Math.max(0, ...b.matchedTokens.map((token) => token.length));

  return bBestToken - aBestToken || a.faculty.name.localeCompare(b.faculty.name, "vi");
}

function isWildcardChar(char: string): boolean {
  return char === "x" || char === "X";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeResult(
  result: Partial<LookupResult> &
    Pick<LookupResult, "status" | "input" | "normalizedCode" | "cohort" | "message">
): LookupResult {
  return {
    facultyMatches: [],
    schedules: [],
    warnings: [],
    ...result
  };
}
