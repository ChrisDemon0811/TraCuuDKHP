"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  MessageSquareWarning,
  Search
} from "lucide-react";
import { findSchedulesForClassCode, normalizeClassCode } from "@/lib/lookup";
import type { LookupResult, ScheduleMatch } from "@/types";

export function LookupForm() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);

  const normalizedPreview = useMemo(() => normalizeClassCode(query), [query]);

  function runLookup(value = query) {
    const nextResult = findSchedulesForClassCode(value);
    setResult(nextResult);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <section className="rounded-card border border-vaa-border bg-white p-4 shadow-soft sm:p-6 lg:p-7">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            runLookup();
          }}
        >
          <div>
            <label htmlFor="classCode" className="text-sm font-bold text-vaa-text">
              Mã lớp
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={20}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-vaa-muted"
                />
                <input
                  id="classCode"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ví dụ: 24ĐHTT02"
                  className="h-14 w-full rounded-2xl border border-vaa-border bg-[#F8FAFC] pl-12 pr-4 text-base font-semibold text-vaa-text outline-none transition placeholder:text-slate-400 focus:border-vaa-gold focus:bg-white focus:ring-4 focus:ring-vaa-gold/20"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-vaa-navy px-6 text-sm font-bold text-white shadow-lg shadow-vaa-navy/15 transition hover:bg-vaa-navyDeep focus:outline-none focus:ring-4 focus:ring-vaa-gold/30"
              >
                Tra cứu
                <ArrowRight size={18} />
              </button>
            </div>
            <div className="mt-3 min-h-5 text-sm text-vaa-muted">
              {normalizedPreview ? (
                <span>
                  Mã sau khi chuẩn hóa:{" "}
                  <strong className="font-bold text-vaa-text">{normalizedPreview}</strong>
                </span>
              ) : null}
            </div>
          </div>
        </form>

        {result ? (
          <div className="mt-7">
            <LookupResultPanel result={result} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function LookupResultPanel({ result }: { result: LookupResult }) {
  if (result.status === "found") {
    return <FoundResult result={result} />;
  }

  if (result.status === "ambiguous_faculty") {
    return (
      <NoticeCard tone="warning" title="Cần kiểm tra lại mã ngành" message={result.message}>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {result.facultyMatches.map((match) => (
            <div key={match.faculty.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-bold text-amber-950">{match.faculty.name}</p>
              <p className="mt-1 text-sm text-amber-800">
                Khớp: {formatMatchedCodes(match.matchedPatterns, match.matchedTokens)}
              </p>
            </div>
          ))}
        </div>
      </NoticeCard>
    );
  }

  if (result.status === "faculty_without_schedule") {
    return (
      <NoticeCard tone="warning" title="Chưa có lịch trong dữ liệu" message={result.message}>
        <ResultFacts result={result} />
      </NoticeCard>
    );
  }

  if (result.status === "not_found") {
    return (
      <NoticeCard
        tone="neutral"
        title="Chưa tìm thấy khoa/ngành"
        message="Bạn có thể mở mục Mã ngành để đối chiếu lại phần mã ở giữa mã lớp."
      />
    );
  }

  return <NoticeCard tone="neutral" title="Chưa thể tra cứu" message={result.message} />;
}

function FoundResult({ result }: { result: LookupResult }) {
  const feedbackHref = buildFeedbackHref(result);

  return (
    <div className="space-y-5">
      <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-emerald-950">{result.message}</h2>
            <ResultFacts result={result} />
          </div>
        </div>
      </div>

      {result.warnings.map((warning) => (
        <div key={warning} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {warning}
        </div>
      ))}

      <Link
        href={feedbackHref}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-vaa-border bg-white px-4 py-3 text-sm font-bold text-vaa-navy shadow-sm transition hover:border-vaa-gold hover:text-vaa-navyDeep"
      >
        <MessageSquareWarning size={18} />
        Báo lỗi kết quả này
      </Link>

      <div className="grid gap-4 lg:grid-cols-2">
        {result.schedules.map((match) => (
          <ScheduleResultCard key={match.schedule.id} match={match} />
        ))}
      </div>
    </div>
  );
}

function ResultFacts({ result }: { result: LookupResult }) {
  const selectedFaculty = result.selectedFaculty;

  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
      <Fact label="Mã lớp đã nhập" value={result.normalizedCode || "Chưa có"} />
      <Fact label="Khóa phát hiện được" value={result.cohort ? String(result.cohort) : "Chưa đọc được"} />
      <Fact label="Khoa/ngành phát hiện được" value={selectedFaculty?.faculty.name ?? "Chưa nhận diện"} />
      <Fact
        label="Mẫu mã ngành khớp"
        value={
          selectedFaculty
            ? formatMatchedCodes(selectedFaculty.matchedPatterns, selectedFaculty.matchedTokens)
            : "Chưa có"
        }
      />
    </dl>
  );
}

function ScheduleResultCard({ match }: { match: ScheduleMatch }) {
  const { schedule } = match;

  return (
    <article className="rounded-[20px] border border-vaa-border bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-vaa-gold">Nhóm {schedule.group}</p>
          <h3 className="mt-1 text-xl font-bold text-vaa-text">{schedule.title}</h3>
        </div>
        <span className="rounded-full bg-[#DBEAFE] px-3 py-1 text-sm font-bold text-[#1D4ED8]">
          {schedule.cohort}
        </span>
      </div>

      <div className="space-y-3">
        <TimeRow label="Bắt đầu đăng ký" value={schedule.display.start} />
        <TimeRow label="LHP chuyển trạng thái “Chỉ đăng ký”" value={schedule.display.transition} />
        <TimeRow label="Kết thúc đăng ký / “Khóa lớp”" value={schedule.display.close} />
      </div>

      <div className="mt-5 rounded-2xl bg-[#F8FAFC] p-4 text-sm text-vaa-muted">
        <p>
          <span className="font-semibold text-vaa-text">Căn cứ khớp:</span> {match.reason}
        </p>
        {schedule.note ? <p className="mt-2">{schedule.note}</p> : null}
      </div>
    </article>
  );
}

function NoticeCard({
  tone,
  title,
  message,
  children
}: {
  tone: "neutral" | "warning";
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  const styles =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-slate-200 bg-[#F8FAFC] text-vaa-text";

  return (
    <div className={`rounded-[20px] border p-5 ${styles}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700">
          <AlertCircle size={24} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm leading-6 opacity-85">{message}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-vaa-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold text-vaa-text">{value}</dd>
    </div>
  );
}

function TimeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-vaa-border bg-[#F8FAFC] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-vaa-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-vaa-text">{value}</p>
    </div>
  );
}

function formatMatchedCodes(patterns: string[], tokens: string[]) {
  const values = [...patterns, ...tokens];
  return values.length > 0 ? values.join(", ") : "Khớp token dự phòng";
}

function buildFeedbackHref(result: LookupResult) {
  const params = new URLSearchParams({
    type: "bug_report",
    classCode: result.normalizedCode,
    errorTitle: `Báo lỗi kết quả tra cứu ${result.normalizedCode}`,
    message: `Mã lớp liên quan: ${result.normalizedCode}\nKhoa/ngành hệ thống nhận diện: ${
      result.selectedFaculty?.faculty.name ?? "Chưa rõ"
    }\nNội dung cần kiểm tra: `
  });

  return `/feedback?${params.toString()}`;
}
