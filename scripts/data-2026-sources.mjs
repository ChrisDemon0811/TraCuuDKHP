import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { load } from "cheerio";

export const RAW_ROOT = join("data", "raw", "2026");
const SV_ORIGIN = "https://sv.vau.edu.vn";
const PDT_ORIGIN = "https://pdt.vau.edu.vn";
const REQUEST_INTERVAL_MS = 850;
let lastRequestAt = 0;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(`Cached JSON is invalid: ${path}`, { cause: error });
  }
}

export async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", "utf8");
  await rename(temporary, path);
}

async function request(url, options = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const delay = REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
    if (delay > 0) await wait(delay);
    lastRequestAt = Date.now();

    try {
      const response = await fetch(url, {
        ...options,
        redirect: "follow",
        signal: AbortSignal.timeout(30_000)
      });
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await wait(1_500 * (attempt + 1));
        continue;
      }
      if (!response.ok) {
        throw new Error(`Endpoint changed or unavailable: ${new URL(url).pathname} (HTTP ${response.status})`);
      }
      return response;
    } catch (error) {
      if (attempt === 2 || /Endpoint changed/.test(error.message)) throw error;
      await wait(1_500 * (attempt + 1));
    }
  }
}

function assertSvSession(response, html) {
  if (new URL(response.url).pathname.includes("dang-nhap") || /<title>\s*Đăng nhập\s*<\/title>/i.test(html)) {
    throw new Error("ASC_AUTH expired or redirected to login. Update the ignored .env file.");
  }
}

async function getSvSession() {
  const credential = process.env.ASC_AUTH || process.env["ASC.AUTH"];
  if (!credential) throw new Error("ASC_AUTH missing. Set ASC_AUTH or ASC.AUTH in ignored .env.");
  const value = credential.startsWith("ASC.AUTH=") ? credential.slice("ASC.AUTH=".length) : credential;
  const response = await request(`${SV_ORIGIN}/lich-toan-truong.html`, {
    headers: { Cookie: `ASC.AUTH=${value}` }
  });
  const html = await response.text();
  assertSvSession(response, html);
  const token = load(html)("input[name=__RequestVerificationToken]").first().val();
  if (!token) throw new Error("SV response schema changed: request verification token not found.");

  // Session cookies stay in memory and never enter raw data or logs.
  const cookies = response.headers.getSetCookie().map((item) => item.split(";")[0]);
  return { cookie: [`ASC.AUTH=${value}`, ...cookies].join("; "), token };
}

async function svJson(path, session, params = {}) {
  const url = new URL(path, SV_ORIGIN);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await request(url, {
    headers: { Cookie: session.cookie, Accept: "application/json" }
  });
  const text = await response.text();
  assertSvSession(response, text);
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`SV response schema changed: ${path} is not JSON.`);
  }
  if (!Array.isArray(value)) throw new Error(`SV response schema changed: ${path} is not a list.`);
  return value;
}

async function getSvCatalog(session, refresh) {
  const path = join(RAW_ROOT, "sv", "catalog.json");
  const cached = !refresh && await readJson(path);
  if (cached) return cached;
  const semesters = (await svJson("/SinhVien/GetDotTheoSinhVien", session))
    .map(({ Id, TenDot }) => ({ id: Id, name: clean(TenDot) }));
  const semester = semesters.find(({ name }) => /^HK\s*1\s*\(2026-2027\)$/i.test(name));
  if (!semester) throw new Error("SV faculty/semester not found: HK 1 (2026-2027).");
  const faculties = (await svJson("/SinhVien/GetKhoaChuQuanLHPTheoDot", session, { id: semester.id }))
    .map(({ Id, TenKhoa }) => ({ id: Id, name: clean(TenKhoa) }));
  if (!faculties.length) throw new Error("SV faculty not found for 2026-2027 HK 1.");
  const catalog = { academicYear: "2026-2027", semester: 1, semesterId: semester.id, semesters, faculties };
  await writeJsonAtomic(path, catalog);
  return catalog;
}

function parseSvRows(html, faculty) {
  const $ = load(html);
  if ($("[lang=lichhoctoantruong-notfound]").length &&
      clean($("[lang=lichhoctoantruong-notfound]").text()) === "Không có dữ liệu hiển thị") {
    return [];
  }
  const headers = $("table th").map((_, th) => clean($(th).text())).get();
  if (!headers.some((value) => value.includes("Mã lớp học phần")) ||
      !headers.some((value) => value.includes("Lớp học"))) {
    throw new Error("SV response schema changed: expected schedule table columns are missing.");
  }
  return $("table tr").toArray().flatMap((tr) => {
    const cells = $(tr).find("td").toArray().map((td) => clean($(td).text()));
    if (!cells.length) return [];
    if (cells.length < 13) {
      throw new Error(`SV response schema changed: ${cells.length} cells in a schedule row.`);
    }
    const periodRange = /^(\d+)\s*-\s*(\d+)$/u.exec(cells[6] ?? "");
    return [{
      courseClassCode: cells[1] || null,
      courseName: cells[2] || null,
      classCode: cells[3] || null,
      teachingFaculty: cells[4] || faculty.name,
      dayOfWeek: cells[5] || null,
      periods: cells[6] || null,
      startPeriod: periodRange ? Number(periodRange[1]) : null,
      endPeriod: periodRange ? Number(periodRange[2]) : null,
      credits: cells[7] || null,
      group: cells[8] || null,
      startDate: cells[9] || null,
      endDate: cells[10] || null,
      room: cells[11] || null,
      lecturer: cells[12] || null
    }];
  });
}

async function getSvFaculty(session, catalog, faculty, refresh) {
  const path = join(RAW_ROOT, "sv", String(catalog.semesterId), `${faculty.id}.json`);
  const cached = !refresh && await readJson(path);
  if (cached) {
    if (cached.schemaVersion === 2) return cached;
    const upgraded = {
      ...cached,
      schemaVersion: 2,
      rows: cached.rows.map((row) => {
        const periodRange = /^(\d+)\s*-\s*(\d+)$/u.exec(row.periods ?? "");
        return {
          ...row,
          startPeriod: periodRange ? Number(periodRange[1]) : null,
          endPeriod: periodRange ? Number(periodRange[2]) : null
        };
      })
    };
    await writeJsonAtomic(path, upgraded);
    return upgraded;
  }
  const body = new URLSearchParams();
  body.set("__RequestVerificationToken", session.token);
  for (const [key, value] of Object.entries({
    IDDot: catalog.semesterId,
    IDKhoaChuQuanLHP: faculty.id,
    IDHeDaoTao: 1,
    LopHoc: "",
    MonHoc: "",
    LoaiLich: 1
  })) body.set(`paramTK[${key}]`, String(value));
  const response = await request(`${SV_ORIGIN}/SinhVien/GetDanhSachLichToanTruong`, {
    method: "POST",
    headers: {
      Cookie: session.cookie,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${SV_ORIGIN}/lich-toan-truong.html`
    },
    body
  });
  const html = await response.text();
  assertSvSession(response, html);
  const rows = parseSvRows(html, faculty);
  const result = {
    schemaVersion: 2,
    source: "sv.vau.edu.vn",
    endpoint: "/SinhVien/GetDanhSachLichToanTruong",
    academicYear: catalog.academicYear,
    semester: catalog.semester,
    teachingFacultyFilter: faculty,
    fetchedAt: new Date().toISOString(),
    rows
  };
  await writeJsonAtomic(path, result);
  return result;
}

function selectOptions($, selector) {
  return $(selector).find("option").toArray().map((option) => ({
    id: $(option).attr("value"),
    name: clean($(option).text()),
    schoolYearId: $(option).attr("data-school-year") ?? null
  })).filter(({ id }) => id);
}

async function getPdtCatalog(refresh) {
  const path = join(RAW_ROOT, "pdt", "catalog.json");
  const cached = !refresh && await readJson(path);
  if (cached) return cached;
  const response = await request(`${PDT_ORIGIN}/tra-cuu-thoi-khoa-bieu`);
  const $ = load(await response.text());
  const schoolYears = selectOptions($, "#filter_school_year");
  const year = schoolYears.find(({ name }) => name.includes("2026-2027"));
  if (!year) throw new Error("PDT faculty/academic year not found: 2026-2027.");
  const semesters = selectOptions($, "#filter_semester");
  const semester = semesters.find(({ name, schoolYearId }) =>
    schoolYearId === year.id && /Học kỳ\s*1\b/i.test(name));
  if (!semester) throw new Error("PDT semester not found: 2026-2027 Học kỳ 1.");
  const departments = selectOptions($, "#filter_department");
  const majors = selectOptions($, "#filter_major");
  if (!departments.length || !majors.length) throw new Error("PDT response schema changed: faculty or major filter empty.");
  const catalog = {
    academicYear: "2026-2027", semester: 1,
    schoolYearId: year.id, semesterId: semester.id,
    schoolYears, semesters, departments, majors
  };
  await writeJsonAtomic(path, catalog);
  return catalog;
}

function parsePdtRows(html) {
  const $ = load(html);
  if (!$("#badge_matrix_count").length || !$("#tab_content_matrix").length) {
    throw new Error("PDT response schema changed: schedule matrix not found.");
  }
  const countText = clean($("#badge_matrix_count").text());
  const declaredCount = Number(countText.match(/\d+/)?.[0] ?? NaN);
  if (!Number.isFinite(declaredCount)) throw new Error("PDT response schema changed: count missing.");
  const rows = $("#tab_content_matrix span.text-blue-800.font-mono").toArray().map((span) => {
    const card = $(span).closest("div.p-2");
    const cell = $(span).closest("td");
    const dayOfWeek = cell.index();
    const session = clean(cell.closest("tr").children("td").first().find(".uppercase").first().text());
    const courseClassCode = clean($(span).text()).replace(/^\[|\]$/g, "");
    const title = clean(card.find("div.font-bold.text-navy").first().text());
    const courseName = title.replace(/^\[[^\]]+\]\s*-\s*/, "") || null;
    const periodText = clean(card.find(".fa-clock").parent().text()).replace(/^Tiết:\s*/, "");
    const periodRange = /^(\d+)\s*-\s*(\d+)$/u.exec(periodText);
    const room = clean(card.find(".fa-map-marker-alt").parent().text()).replace(/^Địa điểm:\s*/, "");
    const lecturer = clean(card.find(".fa-user-tie").parent().text()).replace(/^GV:\s*/, "");
    return {
      courseClassCode: courseClassCode || null,
      courseName,
      dayOfWeek: dayOfWeek >= 1 && dayOfWeek <= 7 ? dayOfWeek : null,
      session: session || null,
      periods: periodText || null,
      startPeriod: periodRange ? Number(periodRange[1]) : null,
      endPeriod: periodRange ? Number(periodRange[2]) : null,
      room: room || null,
      lecturer: lecturer || null
    };
  });
  if (declaredCount > 0 && rows.length === 0) {
    throw new Error("PDT response schema changed: nonzero count but no parsed records.");
  }
  return { declaredCount, rows };
}

async function getPdtMajorMonth(catalog, major, month, refresh) {
  const path = join(RAW_ROOT, "pdt", String(catalog.semesterId), month, `${major.id}.json`);
  const cached = !refresh && await readJson(path);
  if (cached?.schemaVersion === 2) return cached;
  const url = new URL("/tra-cuu-thoi-khoa-bieu", PDT_ORIGIN);
  for (const [key, value] of Object.entries({
    school_year_id: catalog.schoolYearId,
    semester_id: catalog.semesterId,
    major_id: major.id,
    time_type: "month",
    selected_month: month,
    filter_applied: 1
  })) url.searchParams.set(key, String(value));
  const response = await request(url);
  const html = await response.text();
  const $ = load(html);
  if ($("#filter_school_year option:selected").val() !== catalog.schoolYearId ||
      $("#filter_semester option:selected").val() !== catalog.semesterId) {
    throw new Error("PDT response schema changed: requested academic year or semester was not selected.");
  }
  const { declaredCount, rows } = parsePdtRows(html);
  const result = {
    schemaVersion: 2,
    source: "pdt.vau.edu.vn",
    endpoint: "/tra-cuu-thoi-khoa-bieu",
    academicYear: catalog.academicYear,
    semester: catalog.semester,
    majorFilter: { id: major.id, name: major.name },
    month,
    fetchedAt: new Date().toISOString(),
    declaredCount,
    rows
  };
  await writeJsonAtomic(path, result);
  return result;
}

function monthsForCohort(rows) {
  const months = new Set();
  for (const row of rows) {
    if (!/(?:^|[\s,;])26[^\s,;]*/u.test(row.classCode ?? "")) continue;
    const dates = [row.startDate, row.endDate].map((value) => {
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? "");
      return match ? new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, 1)) : null;
    });
    if (!dates[0] || !dates[1]) continue;
    const cursor = new Date(dates[0]);
    for (let step = 0; cursor <= dates[1] && step < 9; step += 1) {
      months.add(cursor.toISOString().slice(0, 7));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }
  if (months.size === 0) throw new Error("No 2026 class dates found in SV records; stopping before production output.");
  if (months.size > 8) throw new Error("Unexpected 2026 month range; inspect SV raw data before fetching PDT.");
  return [...months].sort();
}

export async function fetchSources({ refresh = false } = {}) {
  const session = await getSvSession();
  const svCatalog = await getSvCatalog(session, refresh);
  const pdtCatalog = await getPdtCatalog(refresh);
  const svFiles = [];
  const svRows = [];
  const fetchedAtValues = [];

  for (const faculty of svCatalog.faculties) {
    const result = await getSvFaculty(session, svCatalog, faculty, refresh);
    console.log(`SV ${faculty.name}: ${result.rows.length} records`);
    svRows.push(...result.rows);
    fetchedAtValues.push(result.fetchedAt);
    svFiles.push(join("sv", String(svCatalog.semesterId), `${faculty.id}.json`));
  }
  if (!svRows.length) throw new Error("SV returned 0 records; production data is untouched.");
  const months = monthsForCohort(svRows);
  console.log(`PDT months: ${months.join(", ")}`);
  const pdtFiles = [];
  let pdtRecordCount = 0;

  for (const month of months) {
    for (const major of pdtCatalog.majors) {
      const result = await getPdtMajorMonth(pdtCatalog, major, month, refresh);
      console.log(`PDT ${month} / ${major.name}: ${result.rows.length} records`);
      pdtRecordCount += result.rows.length;
      fetchedAtValues.push(result.fetchedAt);
      pdtFiles.push(join("pdt", String(pdtCatalog.semesterId), month, `${major.id}.json`));
    }
  }
  if (!pdtRecordCount) throw new Error("PDT returned 0 records; production data is untouched.");

  const manifest = {
    cohort: 2026,
    academicYear: svCatalog.academicYear,
    semester: svCatalog.semester,
    svSemesterId: svCatalog.semesterId,
    pdtSchoolYearId: pdtCatalog.schoolYearId,
    pdtSemesterId: pdtCatalog.semesterId,
    months,
    svFiles,
    pdtFiles,
    svRecords: svRows.length,
    pdtRecords: pdtRecordCount,
    fetchedAt: fetchedAtValues.sort().at(-1)
  };
  await writeJsonAtomic(join(RAW_ROOT, "manifest.json"), manifest);
  return manifest;
}
