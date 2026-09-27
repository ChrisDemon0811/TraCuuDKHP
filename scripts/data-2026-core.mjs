import { readFile } from "node:fs/promises";
import { join } from "node:path";
import registrationData from "../src/data/registration-schedule.json" with { type: "json" };
import ownerData from "./data-2026-major-owners.json" with { type: "json" };
import facultyPrefixData from "./data-2026-faculty-prefixes.json" with { type: "json" };
import { RAW_ROOT, readJson } from "./data-2026-sources.mjs";

const REVIEW_PREFIXES = new Map([
  // PDT currently lists 26LA classes under construction courses while its
  // separate landscape-architecture filter has no records.
  ["LA", "PDT has no landscape-architecture records; construction-course overlap is insufficient."]
]);

export function normalizeText(value) {
  const original = String(value ?? "");
  const normalized = original.normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  return { original, normalized, comparison: normalized.toLocaleUpperCase("vi-VN") };
}

export function normalizeCode(value) {
  const original = String(value ?? "");
  const normalized = original.normalize("NFC").toLocaleUpperCase("vi-VN")
    .replace(/\s+/gu, "");
  return { original, normalized };
}

export function normalizeRoom(value) {
  // Keep punctuation: A101, A-101 and A 101 are not assumed identical.
  return normalizeText(value);
}

export function normalizeDate(value) {
  const original = String(value ?? "");
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(original.trim());
  if (!match) return { original, iso: null };
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const iso = date.toISOString().slice(0, 10);
  return {
    original,
    iso: iso === `${year}-${month}-${day}` ? iso : null
  };
}

export function splitClassCodes(value) {
  return String(value ?? "").split(/[\s,;\/]+/u).map((item) => normalizeCode(item).normalized).filter(Boolean);
}

export function normalizedSourceRecords(svRows, pdtRows) {
  const common = (row) => ({
    courseClassCode: normalizeCode(row.courseClassCode),
    courseCode: row.courseCode ? normalizeCode(row.courseCode) : null,
    courseName: normalizeText(row.courseName),
    lecturer: normalizeText(row.lecturer),
    room: normalizeRoom(row.room),
    periods: normalizeText(row.periods),
    dayOfWeek: row.dayOfWeek ?? null,
    startPeriod: row.startPeriod ?? null,
    endPeriod: row.endPeriod ?? null
  });
  return {
    sv: svRows.map((row) => ({
      ...common(row),
      classCode: {
        original: row.classCode ?? null,
        normalizedCodes: splitClassCodes(row.classCode)
      },
      startDate: normalizeDate(row.startDate),
      endDate: normalizeDate(row.endDate),
      teachingFaculty: normalizeText(row.teachingFaculty)
    })),
    pdt: pdtRows.map((row) => ({
      ...common(row),
      majorId: row.majorId,
      majorName: row.majorName,
      session: row.session ?? null,
      date: normalizeDate(row.date)
    }))
  };
}

function recordKey(record) {
  return [
    normalizeText(record.courseName).comparison,
    normalizeText(record.lecturer).comparison,
    normalizeRoom(record.room).comparison,
    normalizeText(record.periods).comparison
  ].join("|");
}

function recordDateKey(record) {
  const date = normalizeDate(record.date).iso;
  return date ? `${recordKey(record)}|${date}` : null;
}

function hasCompositeFields(record) {
  return Boolean(record.courseName && record.lecturer && record.room && record.periods);
}

export function matchRecords(svRows, pdtRows) {
  const byLhp = new Map();
  const byComposite = new Map();
  const byCompositeDate = new Map();
  for (const record of pdtRows) {
    const code = normalizeCode(record.courseClassCode).normalized;
    if (code) {
      if (!byLhp.has(code)) byLhp.set(code, []);
      byLhp.get(code).push(record);
    }
    if (hasCompositeFields(record)) {
      const key = recordKey(record);
      if (!byComposite.has(key)) byComposite.set(key, []);
      byComposite.get(key).push(record);
      const dateKey = recordDateKey(record);
      if (dateKey) {
        if (!byCompositeDate.has(dateKey)) byCompositeDate.set(dateKey, []);
        byCompositeDate.get(dateKey).push(record);
      }
    }
  }

  return svRows.map((record) => {
    const code = normalizeCode(record.courseClassCode).normalized;
    const exact = code ? byLhp.get(code) ?? [] : [];
    if (exact.length) {
      return {
        sv: record,
        confidence: "exact",
        candidates: exact,
        matchedCourseClassCodes: [code]
      };
    }
    if (hasCompositeFields(record)) {
      const dateKey = recordDateKey(record);
      const dated = dateKey ? byCompositeDate.get(dateKey) ?? [] : [];
      const datedCodes = [...new Set(dated.map((item) => normalizeCode(item.courseClassCode).normalized))];
      if (datedCodes.length === 1) {
        return { sv: record, confidence: "high", candidates: dated, matchedCourseClassCodes: datedCodes };
      }
      if (datedCodes.length > 1) {
        return { sv: record, confidence: "ambiguous", candidates: dated, matchedCourseClassCodes: datedCodes };
      }
      const candidates = byComposite.get(recordKey(record)) ?? [];
      const codes = [...new Set(candidates.map((item) => normalizeCode(item.courseClassCode).normalized))];
      if (codes.length === 1) {
        return { sv: record, confidence: "medium", candidates, matchedCourseClassCodes: codes };
      }
      if (codes.length > 1) {
        return { sv: record, confidence: "ambiguous", candidates, matchedCourseClassCodes: codes };
      }
    }
    return { sv: record, confidence: "unmatched", candidates: [], matchedCourseClassCodes: [] };
  });
}

function distinctPdtRows(files) {
  const seen = new Set();
  const rows = [];
  for (const file of files) {
    for (const row of file.rows) {
      const key = [
        file.majorFilter.id,
        normalizeCode(row.courseClassCode).normalized,
        recordKey(row),
        row.dayOfWeek ?? ""
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        ...row,
        majorId: String(file.majorFilter.id),
        majorName: file.majorFilter.name,
        original: row
      });
    }
  }
  return rows;
}

export async function loadRawSources() {
  const manifest = await readJson(join(RAW_ROOT, "manifest.json"));
  if (!manifest || manifest.cohort !== 2026 || !manifest.svFiles?.length || !manifest.pdtFiles?.length) {
    throw new Error("Raw 2026 manifest missing or incomplete. Run data:2026:fetch first.");
  }
  const svCatalog = await readJson(join(RAW_ROOT, "sv", "catalog.json"));
  const pdtCatalog = await readJson(join(RAW_ROOT, "pdt", "catalog.json"));
  if (!svCatalog || !pdtCatalog) throw new Error("Source catalogs missing from raw cache.");
  const svFiles = await Promise.all(manifest.svFiles.map(async (file) => {
    const value = await readJson(join(RAW_ROOT, file));
    if (!value || !Array.isArray(value.rows)) throw new Error(`Raw SV cache invalid: ${file}`);
    return value;
  }));
  const pdtFiles = await Promise.all(manifest.pdtFiles.map(async (file) => {
    const value = await readJson(join(RAW_ROOT, file));
    if (!value || !Array.isArray(value.rows)) throw new Error(`Raw PDT cache invalid: ${file}`);
    return value;
  }));
  const svRows = svFiles.flatMap((file) => file.rows);
  const pdtRawRows = pdtFiles.flatMap((file) => file.rows);
  if (!svRows.length || !pdtRawRows.length) throw new Error("A source returned 0 records; production data is untouched.");
  if (svRows.length !== manifest.svRecords || pdtRawRows.length !== manifest.pdtRecords) {
    throw new Error("Raw cache counts differ from manifest; re-fetch before processing.");
  }
  return { manifest, svCatalog, pdtCatalog, svRows, pdtRawRows, pdtRows: distinctPdtRows(pdtFiles) };
}

function makeClassEvidence(matches) {
  const byClass = new Map();
  for (const match of matches) {
    for (const classCode of splitClassCodes(match.sv.classCode)) {
      if (!/^26/u.test(classCode)) continue;
      if (!byClass.has(classCode)) {
        byClass.set(classCode, {
          classCode,
          originalClassCodes: new Set(),
          courseClassCodes: new Set(),
          teachingFaculties: new Set(),
          matchCounts: { exact: 0, high: 0, medium: 0, ambiguous: 0, unmatched: 0 },
          majorLhp: new Map()
        });
      }
      const item = byClass.get(classCode);
      item.originalClassCodes.add(match.sv.classCode);
      if (match.sv.courseClassCode) item.courseClassCodes.add(normalizeCode(match.sv.courseClassCode).normalized);
      if (match.sv.teachingFaculty) item.teachingFaculties.add(match.sv.teachingFaculty);
      item.matchCounts[match.confidence] += 1;
      if (match.confidence === "ambiguous" || match.confidence === "unmatched") continue;
      for (const candidate of match.candidates) {
        if (!item.majorLhp.has(candidate.majorId)) item.majorLhp.set(candidate.majorId, new Set());
        item.majorLhp.get(candidate.majorId).add(
          normalizeCode(match.sv.courseClassCode || candidate.courseClassCode).normalized
        );
      }
    }
  }
  return byClass;
}

function classifyClass(item, majorCatalog) {
  const observedMajorIds = [...item.majorLhp.keys()].sort((a, b) => Number(a) - Number(b));
  const specialists = observedMajorIds.filter((id) => id !== "19")
    .map((id) => ({ id, uniqueCourseClasses: item.majorLhp.get(id).size }))
    .sort((a, b) => b.uniqueCourseClasses - a.uniqueCourseClasses || Number(a.id) - Number(b.id));
  const top = specialists[0];
  const second = specialists[1];
  const prefix = item.classCode.match(/^26([A-Z]+)/u)?.[1] ?? null;
  const reviewReason = prefix && REVIEW_PREFIXES.get(prefix);
  const decisive = top &&
    ((specialists.length === 1 && top.uniqueCourseClasses >= 2) ||
      (top.uniqueCourseClasses >= 3 && top.uniqueCourseClasses - (second?.uniqueCourseClasses ?? 0) >= 2));
  const owner = top ? ownerData[top.id] : null;
  let classification = "unmatched";
  if (reviewReason) classification = "needs_review";
  else if (decisive && owner?.facultyId) classification = "high";
  else if (specialists.length > 1) classification = "ambiguous";
  else if (top) classification = "medium";

  const acceptedMajorId = classification === "high" ? top.id : null;
  const acceptedFacultyId = acceptedMajorId ? owner.facultyId : null;
  return {
    classCode: item.classCode,
    prefix,
    classification,
    facultyId: acceptedFacultyId,
    majorIds: acceptedMajorId ? [`pdt-${acceptedMajorId}`] : [],
    possibleMajorIds: specialists.map(({ id }) => `pdt-${id}`),
    observedMajorIds: observedMajorIds.map((id) => `pdt-${id}`),
    majorEvidence: specialists.map(({ id, uniqueCourseClasses }) => ({
      majorId: `pdt-${id}`,
      majorName: majorCatalog.get(id)?.name ?? null,
      uniqueCourseClasses,
      courseClassCodes: [...item.majorLhp.get(id)].sort()
    })),
    supportingCourseClassCodes: acceptedMajorId ? [...item.majorLhp.get(acceptedMajorId)].sort() : [],
    courseClassCodes: [...item.courseClassCodes].sort(),
    originalClassCodes: [...item.originalClassCodes].sort(),
    teachingFaculties: [...item.teachingFaculties].sort(),
    matchCounts: item.matchCounts,
    reviewReason: reviewReason ?? null
  };
}

export function analyzeTokens(classes) {
  const byToken = new Map();
  for (const item of classes) {
    if (!item.prefix) continue;
    if (!byToken.has(item.prefix)) byToken.set(item.prefix, []);
    byToken.get(item.prefix).push(item);
  }
  return [...byToken].sort(([a], [b]) => a.localeCompare(b)).map(([token, items]) => {
    const accepted = items.filter((item) => item.classification === "high");
    const majorIds = [...new Set(accepted.flatMap((item) => item.majorIds))].sort();
    const unresolved = items.length - accepted.length;
    return {
      token,
      totalClasses: items.length,
      acceptedClasses: accepted.length,
      unresolvedClasses: unresolved,
      majorIds,
      collision: majorIds.length > 1,
      safeInObservedData: items.length >= 2 && unresolved === 0 && majorIds.length === 1
    };
  });
}

function majorCatalogFromSource(pdtCatalog) {
  const ids = new Set();
  const majors = pdtCatalog.majors.map(({ id, name }) => {
    const majorId = String(id);
    if (ids.has(majorId)) throw new Error(`Duplicate majorId from PDT: ${majorId}`);
    ids.add(majorId);
    const owner = ownerData[majorId];
    if (!owner || normalizeText(owner.name).comparison !== normalizeText(name).comparison) {
      throw new Error(`PDT major changed or not mapped: ${majorId} / ${name}`);
    }
    if (owner.facultyId && !registrationData.faculties.some((faculty) => faculty.id === owner.facultyId)) {
      throw new Error(`Unknown facultyId in major ownership: ${owner.facultyId}`);
    }
    return {
      id: `pdt-${majorId}`,
      name,
      facultyId: owner.facultyId,
      source: owner.source
    };
  });
  return majors;
}

export function processSources({ manifest, svCatalog, pdtCatalog, svRows, pdtRawRows, pdtRows }) {
  if (!manifest || !svRows.length || !pdtRows.length) {
    throw new Error("Input sources are empty; production data is untouched.");
  }
  const majors = majorCatalogFromSource(pdtCatalog);
  const matches = matchRecords(svRows, pdtRows);
  const byClass = makeClassEvidence(matches);
  if (!byClass.size) throw new Error("No 2026 class codes found; production data is untouched.");
  const majorCatalog = new Map(majors.map(({ id, name }) => [id.slice(4), { name }]));
  const curatedFacultyByPrefix = new Map(facultyPrefixData.rules.map((rule) => [rule.prefix, rule.facultyId]));
  const classes = [...byClass.values()].map((item) => {
    const classified = classifyClass(item, majorCatalog);
    const curatedFacultyId = curatedFacultyByPrefix.get(classified.prefix);
    return {
      ...classified,
      resolvedFacultyId: classified.facultyId ?? curatedFacultyId ?? null,
      facultySource: classified.facultyId ? "pdt_cross_reference" :
        curatedFacultyId ? facultyPrefixData.source : null
    };
  })
    .sort((a, b) => a.classCode.localeCompare(b.classCode, "vi"));
  const tokens = analyzeTokens(classes);
  const targetMatches = matches.filter((match) => splitClassCodes(match.sv.classCode).some((code) => /^26/u.test(code)));
  const counts = Object.fromEntries(
    ["exact", "high", "medium", "ambiguous", "unmatched"].map((key) =>
      [key, targetMatches.filter((match) => match.confidence === key).length])
  );
  const classificationCounts = Object.fromEntries(
    ["high", "medium", "ambiguous", "unmatched", "needs_review"].map((key) =>
      [key, classes.filter((item) => item.classification === key).length])
  );
  const matchedPdtCodes = new Set(targetMatches.flatMap((match) => match.matchedCourseClassCodes));
  const pdtCodes = new Set(pdtRows.map((row) => normalizeCode(row.courseClassCode).normalized).filter(Boolean));
  const diagnostics = {
    svRecords: svRows.length,
    pdtRecords: pdtRawRows.length,
    pdtDistinctRecords: pdtRows.length,
    sv2026Records: targetMatches.length,
    unique2026ClassCodes: classes.length,
    matchCounts: counts,
    classificationCounts,
    facultiesDetected: [...new Set(classes.map((item) => item.resolvedFacultyId).filter(Boolean))].sort(),
    majorsDetected: [...new Set(classes.flatMap((item) => item.majorIds))].sort(),
    safeTokens: tokens.filter((item) => item.safeInObservedData).map((item) => item.token),
    tokenCollisions: tokens.filter((item) => item.collision).map((item) => item.token),
    unresolvedTokens: tokens.filter((item) => item.unresolvedClasses > 0).map((item) => item.token),
    repeatedClassCodeRows: targetMatches.length - classes.length,
    duplicateClassCodeKeys: 0,
    duplicateMajorIds: 0,
    classesWithoutFaculty: classes.filter((item) => !item.resolvedFacultyId).length,
    classesWithoutSourceVerifiedFaculty: classes.filter((item) => !item.facultyId).length,
    classesWithCuratedFaculty: classes.filter((item) => item.facultySource === facultyPrefixData.source).length,
    classesWithoutMajor: classes.filter((item) => !item.majorIds.length).length,
    classesWithMultipleMajorEvidence: classes.filter((item) => item.possibleMajorIds.length > 1).length,
    svRecordsMissingCourseCode: svRows.filter((item) => !item.courseCode).length,
    svRecordsMissingClassCode: svRows.filter((item) => !item.classCode).length,
    svRecordsMissingCourseClassCode: svRows.filter((item) => !item.courseClassCode).length,
    pdtRecordsMissingCourseCode: pdtRawRows.filter((item) => !item.courseCode).length,
    pdtRecordsMissingStudentClassCode: pdtRawRows.filter((item) => !item.classCode).length,
    pdtRecordsMissingCourseClassCode: pdtRawRows.filter((item) => !item.courseClassCode).length,
    pdtUnmatchedCourseClassCodes: [...pdtCodes].filter((code) => !matchedPdtCodes.has(code)).length
  };
  const facultyNames = new Map(registrationData.faculties.map((item) => [item.id, item.name]));
  const faculties = [...new Set(classes.map((item) => item.resolvedFacultyId).filter(Boolean))]
    .sort().map((facultyId) => ({
      facultyId,
      facultyName: facultyNames.get(facultyId),
      facultyOnlyClasses: classes.filter((item) =>
        item.resolvedFacultyId === facultyId && !item.majorIds.length).map((item) => item.classCode),
      majors: majors.filter((major) => major.facultyId === facultyId)
        .map((major) => ({
          majorId: major.id,
          majorName: major.name,
          classes: classes.filter((item) =>
            item.facultyId === facultyId && item.majorIds.includes(major.id)).map((item) => item.classCode)
        })).filter((major) => major.classes.length)
    }));
  const processed = {
    cohort: 2026,
    academicYear: manifest.academicYear,
    semester: manifest.semester,
    sourceFetchedAt: manifest.fetchedAt,
    faculties,
    majors,
    classes,
    tokens,
    diagnostics
  };
  const mapping = {
    cohort: 2026,
    academicYear: manifest.academicYear,
    semester: manifest.semester,
    sourceFetchedAt: manifest.fetchedAt,
    majors: majors.filter((major) => classes.some((item) => item.majorIds.includes(major.id)))
      .map(({ id, name, facultyId }) => ({ id, name, facultyId })),
    classMappings: Object.fromEntries(classes.filter((item) => item.classification === "high")
      .map((item) => [item.classCode, {
        facultyId: item.facultyId,
        majorIds: item.majorIds,
        confidence: "high",
        supportingCourseClassCodes: item.supportingCourseClassCodes
      }])),
    knownUnresolvedClassCodes: classes.filter((item) => item.classification !== "high")
      .map((item) => item.classCode),
    safePrefixRules: tokens.filter((item) => item.safeInObservedData).map((item) => {
      const majorId = item.majorIds[0];
      return {
        prefix: item.token,
        facultyId: majors.find((major) => major.id === majorId).facultyId,
        observedClassCount: item.totalClasses
      };
    }),
    curatedFacultyPrefixRules: facultyPrefixData.rules.map((rule) => ({
      ...rule,
      source: facultyPrefixData.source
    })),
    safeTokensObserved: diagnostics.safeTokens
  };
  return { processed, mapping };
}

export function validateOutput(processed, mapping) {
  const { diagnostics, classes, majors } = processed;
  if (diagnostics.svRecords < 100 || diagnostics.pdtRecords < 100 ||
      diagnostics.unique2026ClassCodes < 20 || diagnostics.matchCounts.exact < 20) {
    throw new Error("Validation failed: source or exact-match count is unexpectedly small.");
  }
  if (Object.keys(mapping.classMappings).length < 10) {
    throw new Error("Validation failed: too few high-confidence mappings; production data is untouched.");
  }
  if (new Set(classes.map((item) => item.classCode)).size !== classes.length ||
      new Set(majors.map((item) => item.id)).size !== majors.length) {
    throw new Error("Validation failed: duplicate classCode or majorId.");
  }
  for (const [classCode, value] of Object.entries(mapping.classMappings)) {
    if (!/^26/u.test(classCode) || !value.facultyId || value.majorIds.length !== 1 ||
        !majors.some((major) => major.id === value.majorIds[0] && major.facultyId === value.facultyId)) {
      throw new Error(`Validation failed: invalid mapping for ${classCode}.`);
    }
  }
  if (mapping.knownUnresolvedClassCodes.some((code) => mapping.classMappings[code])) {
    throw new Error("Validation failed: unresolved class entered production mappings.");
  }
  if (diagnostics.safeTokens.some((token) =>
    !processed.tokens.some((item) => item.token === token && item.safeInObservedData && !item.collision))) {
    throw new Error("Validation failed: token collision.");
  }
  if (mapping.safePrefixRules.length !== diagnostics.safeTokens.length ||
      mapping.safePrefixRules.some((rule) => {
        const observed = classes.filter((item) => item.prefix === rule.prefix);
        return !observed.length || observed.length !== rule.observedClassCount ||
          observed.some((item) => item.classification !== "high" || item.facultyId !== rule.facultyId);
      })) {
    throw new Error("Validation failed: unsafe cohort prefix rule.");
  }
  const curatedPrefixes = new Set();
  for (const rule of mapping.curatedFacultyPrefixRules) {
    const observed = classes.filter((item) => item.prefix === rule.prefix);
    if (!/^[A-Z]{2}$/u.test(rule.prefix) || curatedPrefixes.has(rule.prefix) ||
        mapping.safePrefixRules.some((safe) => safe.prefix === rule.prefix) ||
        !registrationData.faculties.some((faculty) => faculty.id === rule.facultyId) ||
        observed.length === 0 ||
        observed.some((item) => item.classification === "high" && item.facultyId !== rule.facultyId)) {
      throw new Error(`Validation failed: invalid curated faculty prefix ${rule.prefix}.`);
    }
    curatedPrefixes.add(rule.prefix);
  }
}
