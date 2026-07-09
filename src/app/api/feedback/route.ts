import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { faculties } from "@/lib/data";
import { appendBugReport, appendMajorSuggestion } from "@/lib/googleSheets";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const codePatternRegex = /^[\p{L}\p{N}_]+$/u;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const facultyIds = new Set(faculties.map((faculty) => faculty.id));

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength, `Tối đa ${maxLength} ký tự.`).optional().default("");

const majorSuggestionSchema = z.object({
  type: z.literal("major_suggestion"),
  selectedFacultyId: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn khoa/ngành.")
    .refine((value) => facultyIds.has(value), "Khoa/ngành đã chọn không tồn tại."),
  newCodePattern: z
    .string()
    .transform(normalizeCode)
    .pipe(
      z
        .string()
        .min(2, "Mã ngành/mẫu mã tối thiểu 2 ký tự.")
        .max(80, "Tối đa 80 ký tự.")
        .regex(codePatternRegex, "Chỉ dùng chữ cái, số, dấu gạch dưới và ký tự x/X wildcard.")
    ),
  classCodeExample: z.string().transform(normalizeCode).pipe(z.string().max(40, "Tối đa 40 ký tự.")).optional().default(""),
  note: optionalText(1000),
  honeypot: optionalText(200),
  pageUrl: optionalText(500)
});

const bugReportSchema = z.object({
  type: z.literal("bug_report"),
  errorTitle: z
    .string()
    .trim()
    .min(3, "Tiêu đề lỗi tối thiểu 3 ký tự.")
    .max(160, "Tối đa 160 ký tự."),
  message: z
    .string()
    .trim()
    .min(5, "Nội dung báo lỗi tối thiểu 5 ký tự.")
    .max(1500, "Tối đa 1500 ký tự."),
  honeypot: optionalText(200),
  pageUrl: optionalText(500)
});

const feedbackSchema = z.discriminatedUnion("type", [majorSuggestionSchema, bugReportSchema]);

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) {
    return originError;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Dữ liệu gửi lên không đúng định dạng JSON.", 400);
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Dữ liệu góp ý chưa hợp lệ.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Honeypot catches simple bots while returning a harmless fake success.
  if (data.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const rawIp = getClientIp(request);
  const ipHash = hashIp(rawIp);

  // Lightweight in-memory limiter; use Turnstile/reCAPTCHA for heavier production traffic.
  if (!checkRateLimit(ipHash)) {
    return jsonError("Bạn gửi hơi nhanh. Vui lòng thử lại sau ít phút.", 429);
  }

  const createdAt = new Date().toISOString();
  const userAgent = truncate(request.headers.get("user-agent") ?? "", 500);
  const pageUrl = truncate(data.pageUrl || request.headers.get("referer") || "", 500);

  try {
    if (data.type === "major_suggestion") {
      const selectedFaculty = faculties.find((faculty) => faculty.id === data.selectedFacultyId);

      if (!selectedFaculty) {
        return jsonError("Khoa/ngành đã chọn không tồn tại.", 400);
      }

      await appendMajorSuggestion({
        id: randomUUID(),
        createdAt,
        type: data.type,
        selectedFacultyId: selectedFaculty.id,
        selectedFacultyName: selectedFaculty.name,
        newCodePattern: data.newCodePattern,
        classCodeExample: data.classCodeExample,
        note: data.note,
        existingPatternsSnapshot: selectedFaculty.patterns.join(", "),
        pageUrl,
        userAgent,
        ipHash
      });

      return NextResponse.json({
        ok: true,
        message: "Đã gửi góp ý. Cảm ơn bạn! Dữ liệu sẽ được kiểm tra trước khi cập nhật."
      });
    }

    await appendBugReport({
      id: randomUUID(),
      createdAt,
      type: data.type,
      errorTitle: data.errorTitle,
      message: data.message,
      pageUrl,
      userAgent,
      ipHash
    });

    return NextResponse.json({
      ok: true,
      message: "Đã gửi báo lỗi. Cảm ơn bạn đã giúp hệ thống chính xác hơn!"
    });
  } catch (error) {
    console.error("Feedback append failed", error);
    return jsonError("Chưa gửi được góp ý. Vui lòng thử lại sau.", 500);
  }
}

function validateOrigin(request: NextRequest) {
  const allowedOrigin = process.env.FEEDBACK_ALLOWED_ORIGIN;

  if (!allowedOrigin) {
    return null;
  }

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin !== allowedOrigin) {
    return jsonError("Nguồn gửi góp ý không được phép.", 403);
  }

  return null;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  current.count += 1;
  return true;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}

function hashIp(ip: string): string {
  const salt = process.env.FEEDBACK_HASH_SALT || process.env.GOOGLE_SHEET_ID || "feedback";

  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function normalizeCode(value: string): string {
  return value.trim().normalize("NFC").toLocaleUpperCase("vi-VN").replace(/\s+/g, "");
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}
