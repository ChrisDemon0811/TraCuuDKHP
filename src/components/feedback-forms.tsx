"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  ClipboardPlus,
  MessageSquareWarning,
  Search,
  Send
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { faculties } from "@/lib/data";
import type { Faculty } from "@/types";

type FeedbackType = "major_suggestion" | "bug_report";
type SubmitState = "idle" | "major_suggestion" | "bug_report";

interface NoticeState {
  tone: "success" | "error";
  message: string;
}

const initialMajorForm = {
  selectedFacultyId: "",
  newCodePattern: "",
  classCodeExample: "",
  note: "",
  honeypot: ""
};

const initialBugForm = {
  errorTitle: "",
  message: "",
  honeypot: ""
};

export function FeedbackForms() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<FeedbackType>("major_suggestion");
  const [majorForm, setMajorForm] = useState(initialMajorForm);
  const [bugForm, setBugForm] = useState(initialBugForm);
  const [submitting, setSubmitting] = useState<SubmitState>("idle");
  const [notice, setNotice] = useState<NoticeState | null>(null);

  useEffect(() => {
    const requestedType =
      searchParams.get("type") === "bug_report" ? "bug_report" : "major_suggestion";
    const classCode = searchParams.get("classCode") ?? "";
    const errorTitle = searchParams.get("errorTitle") ?? "";
    const message = searchParams.get("message") ?? "";

    setActiveTab(requestedType);

    if (classCode) {
      setMajorForm((current) => ({ ...current, classCodeExample: classCode }));
      setBugForm((current) => ({
        ...current,
        errorTitle: errorTitle || `Báo lỗi kết quả tra cứu ${classCode}`,
        message: message || `Mã lớp liên quan: ${classCode}\n`
      }));
    } else if (errorTitle || message) {
      setBugForm((current) => ({
        ...current,
        errorTitle: errorTitle || current.errorTitle,
        message: message || current.message
      }));
    }
  }, [searchParams]);

  const selectedFaculty = useMemo(
    () => faculties.find((faculty) => faculty.id === majorForm.selectedFacultyId) ?? null,
    [majorForm.selectedFacultyId]
  );

  const majorSubmitting = submitting === "major_suggestion";
  const bugSubmitting = submitting === "bug_report";

  const activeCopy =
    activeTab === "major_suggestion"
      ? {
          title: "Góp ý thêm mã ngành",
          description: "Chọn khoa/ngành có sẵn, sau đó nhập mã ngành mới mà hệ thống còn thiếu."
        }
      : {
          title: "Báo lỗi",
          description: "Gửi nhanh lỗi dữ liệu hoặc lỗi giao diện để đội quản trị kiểm tra."
        };

  async function submitMajorSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!majorForm.selectedFacultyId) {
      setNotice({ tone: "error", message: "Vui lòng chọn khoa/ngành." });
      return;
    }

    await submitFeedback("major_suggestion", {
      type: "major_suggestion",
      selectedFacultyId: majorForm.selectedFacultyId,
      newCodePattern: normalizeCode(majorForm.newCodePattern),
      classCodeExample: normalizeCode(majorForm.classCodeExample),
      note: majorForm.note.trim(),
      honeypot: majorForm.honeypot
    });
  }

  async function submitBugReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitFeedback("bug_report", {
      type: "bug_report",
      errorTitle: bugForm.errorTitle.trim(),
      message: bugForm.message.trim(),
      honeypot: bugForm.honeypot
    });
  }

  async function submitFeedback(type: FeedbackType, payload: Record<string, string>) {
    setSubmitting(type);
    setNotice(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...payload,
          pageUrl: window.location.href
        })
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "Chưa gửi được góp ý. Vui lòng thử lại.");
      }

      setNotice({
        tone: "success",
        message:
          data.message ||
          (type === "major_suggestion"
            ? "Đã gửi góp ý. Cảm ơn bạn! Dữ liệu sẽ được kiểm tra trước khi cập nhật."
            : "Đã gửi báo lỗi. Cảm ơn bạn đã giúp hệ thống chính xác hơn!")
      });

      if (type === "major_suggestion") {
        setMajorForm(initialMajorForm);
      } else {
        setBugForm(initialBugForm);
      }
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại."
      });
    } finally {
      setSubmitting("idle");
    }
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="rounded-card border border-vaa-border bg-white p-5 shadow-soft sm:p-7">
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-[20px] bg-[#F8FAFC] p-2">
          <TabButton
            active={activeTab === "major_suggestion"}
            icon={ClipboardPlus}
            label="Góp ý mã ngành"
            onClick={() => {
              setActiveTab("major_suggestion");
              setNotice(null);
            }}
          />
          <TabButton
            active={activeTab === "bug_report"}
            icon={MessageSquareWarning}
            label="Báo lỗi"
            onClick={() => {
              setActiveTab("bug_report");
              setNotice(null);
            }}
          />
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-vaa-text">{activeCopy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-vaa-muted">{activeCopy.description}</p>
        </div>

        {notice ? <Notice notice={notice} /> : null}

        {activeTab === "major_suggestion" ? (
          <form className="mt-6 space-y-5" onSubmit={submitMajorSuggestion}>
            <Honeypot
              value={majorForm.honeypot}
              onChange={(value) => setMajorForm((current) => ({ ...current, honeypot: value }))}
            />

            <FacultyCombobox
              selectedFaculty={selectedFaculty}
              onSelect={(faculty) =>
                setMajorForm((current) => ({ ...current, selectedFacultyId: faculty.id }))
              }
            />

            {selectedFaculty ? <SelectedFacultyCard faculty={selectedFaculty} /> : null}

            <TextField
              required
              label="Mã ngành/mẫu mã mới"
              value={majorForm.newCodePattern}
              maxLength={80}
              placeholder="Ví dụ: xxĐHABCxx hoặc ĐHABC"
              onChange={(value) =>
                setMajorForm((current) => ({ ...current, newCodePattern: value }))
              }
            />

            <TextField
              label="Mã lớp ví dụ"
              value={majorForm.classCodeExample}
              maxLength={40}
              placeholder="Ví dụ: 24ĐHABC01"
              onChange={(value) =>
                setMajorForm((current) => ({ ...current, classCodeExample: value }))
              }
            />

            <TextArea
              label="Ghi chú thêm"
              value={majorForm.note}
              maxLength={1000}
              placeholder="Nguồn thông tin, lý do góp ý, hoặc màn hình tra cứu liên quan."
              onChange={(value) => setMajorForm((current) => ({ ...current, note: value }))}
            />

            <SubmitButton loading={majorSubmitting} label="Gửi góp ý" />
          </form>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={submitBugReport}>
            <Honeypot
              value={bugForm.honeypot}
              onChange={(value) => setBugForm((current) => ({ ...current, honeypot: value }))}
            />

            <TextField
              required
              label="Tiêu đề lỗi"
              value={bugForm.errorTitle}
              maxLength={160}
              placeholder="Ví dụ: Lịch khóa 2025 bị sai giờ"
              onChange={(value) => setBugForm((current) => ({ ...current, errorTitle: value }))}
            />

            <TextArea
              required
              label="Nội dung báo lỗi"
              value={bugForm.message}
              maxLength={1500}
              placeholder="Mô tả lỗi bạn gặp, lịch đúng nếu bạn biết, hoặc các bước khiến lỗi xuất hiện."
              onChange={(value) => setBugForm((current) => ({ ...current, message: value }))}
            />

            <SubmitButton loading={bugSubmitting} label="Gửi báo lỗi" />
          </form>
        )}
      </div>
    </section>
  );
}

function FacultyCombobox({
  selectedFaculty,
  onSelect
}: {
  selectedFaculty: Faculty | null;
  onSelect: (faculty: Faculty) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleUpperCase("vi-VN");

  const filteredFaculties = useMemo(() => {
    if (!normalizedQuery) {
      return faculties;
    }

    return faculties.filter((faculty) =>
      [faculty.name, faculty.shortName, ...faculty.patterns, ...faculty.tokens]
        .join(" ")
        .toLocaleUpperCase("vi-VN")
        .includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  return (
    <div className="relative">
      <span className="text-sm font-bold text-vaa-text">
        Khoa/ngành <span className="text-rose-600">*</span>
      </span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="mt-2 flex min-h-[58px] w-full items-center justify-between gap-3 rounded-2xl border border-vaa-border bg-[#F8FAFC] px-4 text-left text-sm font-semibold text-vaa-text outline-none transition hover:bg-white focus:border-vaa-gold focus:bg-white focus:ring-4 focus:ring-vaa-gold/20"
      >
        <span className={selectedFaculty ? "text-vaa-text" : "text-slate-400"}>
          {selectedFaculty?.name ?? "Chọn khoa/ngành"}
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-vaa-muted transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[20px] border border-vaa-border bg-white shadow-soft">
          <div className="border-b border-vaa-border p-3">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-vaa-muted"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên khoa hoặc mã..."
                className="h-11 w-full rounded-2xl border border-vaa-border bg-[#F8FAFC] pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-vaa-gold focus:bg-white focus:ring-4 focus:ring-vaa-gold/20"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filteredFaculties.map((faculty) => {
              const active = selectedFaculty?.id === faculty.id;
              const previewPatterns = faculty.patterns.slice(0, 3);

              return (
                <button
                  key={faculty.id}
                  type="button"
                  onClick={() => {
                    onSelect(faculty);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-left transition ${
                    active ? "bg-vaa-navy text-white" : "hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-bold">{faculty.name}</span>
                    <span
                      className={`mt-1 block text-xs leading-5 ${
                        active ? "text-slate-200" : "text-vaa-muted"
                      }`}
                    >
                      {previewPatterns.join(", ")}
                    </span>
                  </span>
                  {active ? <Check size={18} className="mt-1 shrink-0 text-vaa-gold" /> : null}
                </button>
              );
            })}

            {filteredFaculties.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm font-semibold text-vaa-muted">
                Không tìm thấy khoa/ngành phù hợp.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SelectedFacultyCard({ faculty }: { faculty: Faculty }) {
  return (
    <div className="rounded-[20px] border border-vaa-border bg-[#F8FAFC] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-vaa-muted">Đã chọn</p>
      <h3 className="mt-1 text-lg font-bold text-vaa-text">{faculty.name}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {faculty.patterns.map((pattern) => (
          <span
            key={pattern}
            className="rounded-full border border-vaa-border bg-white px-3 py-1.5 text-sm font-semibold text-vaa-navy"
          >
            {pattern}
          </span>
        ))}
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold transition ${
        active ? "bg-vaa-navy text-vaa-gold shadow-sm" : "text-vaa-muted hover:bg-white"
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-vaa-text">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </span>
      <input
        required={required}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-[52px] w-full rounded-2xl border border-vaa-border bg-[#F8FAFC] px-4 text-sm font-semibold text-vaa-text outline-none transition placeholder:text-slate-400 focus:border-vaa-gold focus:bg-white focus:ring-4 focus:ring-vaa-gold/20"
      />
      <CharacterCount value={value} maxLength={maxLength} />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-vaa-text">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </span>
      <textarea
        required={required}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={6}
        className="mt-2 w-full resize-y rounded-2xl border border-vaa-border bg-[#F8FAFC] px-4 py-3 text-sm font-semibold leading-6 text-vaa-text outline-none transition placeholder:text-slate-400 focus:border-vaa-gold focus:bg-white focus:ring-4 focus:ring-vaa-gold/20"
      />
      <CharacterCount value={value} maxLength={maxLength} />
    </label>
  );
}

function CharacterCount({ value, maxLength }: { value: string; maxLength: number }) {
  return (
    <span className="mt-1 block text-right text-xs font-medium text-vaa-muted">
      {value.length}/{maxLength}
    </span>
  );
}

function Honeypot({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      Website
      <input
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-vaa-navy px-6 text-sm font-bold text-white shadow-lg shadow-vaa-navy/15 transition hover:bg-vaa-navyDeep focus:outline-none focus:ring-4 focus:ring-vaa-gold/30 disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
    >
      <Send size={18} />
      {loading ? "Đang gửi..." : label}
    </button>
  );
}

function Notice({ notice }: { notice: NoticeState }) {
  const success = notice.tone === "success";

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-900"
      }`}
      role="alert"
    >
      {notice.message}
    </div>
  );
}

function normalizeCode(value: string): string {
  return value.trim().normalize("NFC").toLocaleUpperCase("vi-VN").replace(/\s+/g, "");
}
