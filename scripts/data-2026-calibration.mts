import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { detectFaculty } from "../src/lib/lookup";
import { matchRecords, splitClassCodes } from "./data-2026-core.mjs";

const root = join("data", "raw", "2026");
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
const svRows = (await Promise.all(manifest.svFiles.map(async (file: string) =>
  JSON.parse(await readFile(join(root, file), "utf8")).rows))).flat();
const pdtFiles = await Promise.all(manifest.pdtFiles.map(async (file: string) =>
  JSON.parse(await readFile(join(root, file), "utf8"))));
const pdtRows = pdtFiles.flatMap((file: { majorFilter: { id: string }; rows: object[] }) =>
  file.rows.map((row) => ({ ...row, majorId: String(file.majorFilter.id) })));
const owners = JSON.parse(await readFile(join("scripts", "data-2026-major-owners.json"), "utf8"));
const byClass = new Map<string, Map<string, Set<string>>>();

for (const match of matchRecords(svRows, pdtRows)) {
  if (match.confidence !== "exact") continue;
  for (const code of splitClassCodes(match.sv.classCode)) {
    if (!/^(23|24|25)/u.test(code)) continue;
    if (!byClass.has(code)) byClass.set(code, new Map());
    const majors = byClass.get(code)!;
    for (const candidate of match.candidates) {
      if (candidate.majorId === "19") continue;
      if (!majors.has(candidate.majorId)) majors.set(candidate.majorId, new Set());
      majors.get(candidate.majorId)!.add(match.sv.courseClassCode);
    }
  }
}

let checked = 0;
const mismatches: string[] = [];
for (const [code, evidence] of byClass) {
  const ranked = [...evidence].map(([id, codes]) => ({ id, count: codes.size }))
    .sort((a, b) => b.count - a.count);
  const top = ranked[0];
  if (!top || !owners[top.id]?.facultyId) continue;
  const decisive = (ranked.length === 1 && top.count >= 2) ||
    (top.count >= 3 && top.count - (ranked[1]?.count ?? 0) >= 2);
  if (!decisive) continue;
  const old = detectFaculty(code);
  if (old.length !== 1) continue;
  checked += 1;
  if (old[0].faculty.id !== owners[top.id].facultyId) mismatches.push(code);
}

assert.ok(checked >= 50, "Too few legacy classes to calibrate classification.");
assert.deepEqual(mismatches, [], "PDT major evidence disagrees with legacy faculty labels.");
console.log(`SV/PDT class-level calibration: ${checked} legacy classes agree.`);
