import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fetchSources, RAW_ROOT, readJson, writeJsonAtomic } from "./data-2026-sources.mjs";
import { loadRawSources, normalizedSourceRecords, processSources, validateOutput } from "./data-2026-core.mjs";

const command = process.argv[2];
const processedRoot = join("data", "processed", "2026");
const productionPath = join("src", "data", "class-mappings-2026.json");

function runLegacyRegression() {
  execFileSync(
    process.execPath,
    [join("node_modules", "tsx", "dist", "cli.mjs"), join("scripts", "data-2026-regression.ts")],
    { stdio: "inherit" }
  );
  execFileSync(
    process.execPath,
    [join("node_modules", "tsx", "dist", "cli.mjs"), join("scripts", "data-2026-calibration.mts")],
    { stdio: "inherit" }
  );
}

function runLiveRegression() {
  execFileSync(
    process.execPath,
    [join("node_modules", "tsx", "dist", "cli.mjs"), join("scripts", "data-2026-live-regression.ts")],
    { stdio: "inherit" }
  );
}

function report(processed) {
  const { diagnostics } = processed;
  console.log(JSON.stringify({
    svRecords: diagnostics.svRecords,
    pdtRecords: diagnostics.pdtRecords,
    exact: diagnostics.matchCounts.exact,
    high: diagnostics.matchCounts.high,
    medium: diagnostics.matchCounts.medium,
    ambiguous: diagnostics.matchCounts.ambiguous,
    unmatched: diagnostics.matchCounts.unmatched,
    unique2026ClassCodes: diagnostics.unique2026ClassCodes,
    classifications: diagnostics.classificationCounts,
    facultiesDetected: diagnostics.facultiesDetected.length,
    majorsDetected: diagnostics.majorsDetected.length,
    classesWithoutFaculty: diagnostics.classesWithoutFaculty,
    classesWithCuratedFaculty: diagnostics.classesWithCuratedFaculty,
    safeTokens: diagnostics.safeTokens,
    tokenCollisions: diagnostics.tokenCollisions
  }, null, 2));
}

async function processData() {
  const sources = await loadRawSources();
  const { processed, mapping } = processSources(sources);
  validateOutput(processed, mapping);
  const previous = await readJson(productionPath);
  if (previous && Object.keys(mapping.classMappings).length <
      Math.ceil(Object.keys(previous.classMappings).length * 0.7)) {
    throw new Error("Validated mapping shrank by over 30%; review source data before replacing production.");
  }
  await writeJsonAtomic(join(processedRoot, "classification.json"), processed);
  await writeJsonAtomic(join(processedRoot, "project-mapping.json"), mapping);
  await writeJsonAtomic(join(processedRoot, "validation.json"), processed.diagnostics);
  await writeJsonAtomic(join(processedRoot, "unresolved-summary.json"), {
    cohort: 2026,
    totalClassesWithoutConfirmedMajor: mapping.knownUnresolvedClassCodes.length,
    groups: processed.tokens.filter((token) => token.unresolvedClasses > 0).map((token) => {
      const classes = processed.classes.filter((item) =>
        item.prefix === token.token && item.classification !== "high");
      return {
        prefix: token.token,
        count: classes.length,
        facultyId: classes[0]?.resolvedFacultyId ?? null,
        facultySource: classes[0]?.facultySource ?? null,
        classCodes: classes.map((item) => item.classCode),
        classifications: [...new Set(classes.map((item) => item.classification))],
        unconfirmedPdtMajorCandidates: [...new Set(classes.flatMap((item) =>
          item.majorEvidence.map((evidence) => evidence.majorName).filter(Boolean)))].sort(),
        reviewReasons: [...new Set(classes.map((item) => item.reviewReason).filter(Boolean))]
      };
    })
  });
  const normalized = normalizedSourceRecords(sources.svRows, sources.pdtRows);
  await writeJsonAtomic(join(RAW_ROOT, "normalized", "sv.json"), normalized.sv);
  await writeJsonAtomic(join(RAW_ROOT, "normalized", "pdt.json"), normalized.pdt);
  runLegacyRegression();
  await writeJsonAtomic(productionPath, mapping);
  report(processed);
}

async function validate() {
  const processed = await readJson(join(processedRoot, "classification.json"));
  const proposed = await readJson(join(processedRoot, "project-mapping.json"));
  const production = await readJson(productionPath);
  if (!processed || !proposed || !production) {
    throw new Error("Processed or production 2026 data missing. Run data:2026:process.");
  }
  validateOutput(processed, proposed);
  if (JSON.stringify(proposed) !== JSON.stringify(production)) {
    throw new Error("Production mapping differs from validated processed mapping.");
  }
  runLegacyRegression();
  runLiveRegression();
  report(processed);
}

if (command === "fetch") {
  const manifest = await fetchSources({ refresh: process.argv.includes("--refresh") });
  console.log(`Raw cache ready: SV ${manifest.svRecords}, PDT ${manifest.pdtRecords}`);
} else if (command === "process") {
  await processData();
} else if (command === "validate") {
  await validate();
} else if (command === "all") {
  await fetchSources({ refresh: process.argv.includes("--refresh") });
  await processData();
  await validate();
} else {
  throw new Error("Usage: data-2026.mjs fetch|process|validate|all [--refresh]");
}
