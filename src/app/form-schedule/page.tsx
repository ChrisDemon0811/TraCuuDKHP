"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Inbox,
  LockKeyhole,
  Search,
  X
} from "lucide-react";
import formLockersData from "@/data/form-lockers.json";
import {
  formatSlotLabel,
  getLockerStatus
} from "@/lib/formLockerStatus";
import type { FormLocker, LockerStatus } from "@/types";

const formLockers = formLockersData as FormLocker[];
type StatusFilter = "all" | "open" | "closed";

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "open", label: "Đang mở" },
  { value: "closed", label: "Đã khóa" }
];

const pendingStatus: LockerStatus = {
  isOpen: false,
  statusText: "Đã khóa",
  activeSlot: null,
  currentSessionText: null,
  nextOpenText: "Đang cập nhật..."
};

export default function FormSchedulePage() {
  const [now, setNow] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    // Trạng thái được tính tại thời điểm tải trang; người dùng reload để cập nhật.
    setNow(new Date());
  }, []);

  const lockersWithStatus = useMemo(() => {
    return formLockers
      .map((locker) => ({ locker, status: now ? getLockerStatus(locker, now) : pendingStatus }))
      .sort((first, second) => Number(second.status.isOpen) - Number(first.status.isOpen));
  }, [now]);

  const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");

  const filteredLockers = lockersWithStatus.filter(({ locker, status }) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      `${locker.facultyName} ${locker.shortName} ${locker.lockerLabel}`
        .toLocaleLowerCase("vi-VN")
        .includes(normalizedQuery);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "open" && status.isOpen) ||
      (statusFilter === "closed" && !status.isOpen);

    return matchesQuery && matchesStatus;
  });

  return (
    <>
      <section className="mb-6 sm:mb-8">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-vaa-border bg-white px-3 py-1 text-sm font-semibold text-vaa-muted shadow-sm">
            <Archive size={16} className="text-vaa-gold" />
            Lịch theo tuần
          </div>
          <h1 className="text-3xl font-bold leading-tight text-vaa-text sm:text-4xl">Lịch nhận biểu mẫu</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-vaa-muted">
            Theo dõi lịch mở tủ nhận biểu mẫu của từng khoa theo buổi sáng và buổi chiều.
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <LockerFilters
          query={query}
          onQueryChange={setQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          resultCount={filteredLockers.length}
        />

        {filteredLockers.length > 0 ? (
          <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredLockers.map(({ locker, status }) => (
              <FormLockerCard key={locker.id} locker={locker} status={status} />
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-vaa-border bg-white px-5 py-12 text-center shadow-soft">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-vaa-muted">
              <Inbox size={23} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-vaa-text">Không tìm thấy tủ phù hợp</h2>
            <p className="mt-1 text-sm text-vaa-muted">Thử đổi tên khoa hoặc chọn lại trạng thái.</p>
          </div>
        )}
      </section>
    </>
  );
}

function LockerFilters({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  resultCount
}: {
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  resultCount: number;
}) {
  return (
    <div className="rounded-card border border-vaa-border bg-white p-4 shadow-soft sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="block min-w-0 flex-1 lg:max-w-xl">
          <span className="text-sm font-bold text-vaa-text">Tìm kiếm khoa</span>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-vaa-muted" size={19} />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Tìm theo tên khoa..."
              className="h-[52px] w-full rounded-2xl border border-vaa-border bg-[#F8FAFC] pl-11 pr-11 text-sm font-medium text-vaa-text outline-none transition placeholder:text-slate-400 focus:border-vaa-gold focus:bg-white focus:ring-4 focus:ring-vaa-gold/20"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                aria-label="Xóa nội dung tìm kiếm"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-vaa-muted transition hover:bg-slate-100 hover:text-vaa-text"
              >
                <X size={17} />
              </button>
            ) : null}
          </div>
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-vaa-text">Trạng thái</p>
            <p className="text-xs font-semibold text-vaa-muted">{resultCount} kết quả</p>
          </div>
          <div className="grid grid-cols-3 rounded-2xl bg-slate-100 p-1" aria-label="Lọc theo trạng thái">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => onStatusFilterChange(filter.value)}
                className={`min-h-10 whitespace-nowrap rounded-xl px-3 text-sm font-bold transition sm:px-4 ${
                  statusFilter === filter.value
                    ? "bg-vaa-navy text-white shadow-sm"
                    : "text-vaa-muted hover:text-vaa-text"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormLockerCard({ locker, status }: { locker: FormLocker; status: LockerStatus }) {
  return (
    <article
      className={`flex h-full min-w-0 flex-col rounded-card border p-5 shadow-soft transition sm:p-6 ${
        status.isOpen ? "border-emerald-500 bg-emerald-50" : "border-vaa-border bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${status.isOpen ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
          <Archive size={22} />
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-4 min-w-0">
        <h2 className="text-lg font-bold leading-7 text-vaa-text">{locker.facultyName}</h2>
        <p className="mt-1 text-sm font-semibold text-vaa-muted">{locker.lockerLabel}</p>
      </div>

      <div className="mt-5 border-t border-slate-200/80 pt-4">
        <p className="text-xs font-bold uppercase text-vaa-muted">Lịch nhận biểu mẫu</p>
        <p className="mt-1.5 text-sm font-bold leading-6 text-vaa-text">{locker.scheduleText}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {locker.slots.map((slot) => (
            <span
              key={`${slot.dayOfWeek}-${slot.session}`}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-vaa-muted"
            >
              {formatSlotLabel(slot)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-2 pt-5">
        {status.currentSessionText ? (
          <div className="flex items-start gap-2 rounded-2xl bg-white/80 px-3.5 py-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
            <span>{status.currentSessionText}</span>
          </div>
        ) : null}
        <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3.5 py-3 text-sm leading-5 text-vaa-muted">
          <CalendarDays size={17} className="mt-0.5 shrink-0 text-vaa-gold" />
          <span>
            <span className="font-bold text-vaa-text">Mở tiếp theo:</span> {status.nextOpenText}
          </span>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: LockerStatus }) {
  return (
    <span
      className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${
        status.isOpen ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
      }`}
    >
      {status.isOpen ? <CheckCircle2 size={14} /> : <LockKeyhole size={14} />}
      {status.statusText}
    </span>
  );
}
