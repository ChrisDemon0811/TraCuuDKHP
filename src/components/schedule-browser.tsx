"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Filter, GraduationCap } from "lucide-react";
import { faculties, schedules } from "@/lib/data";
import type { RegistrationSchedule } from "@/types";

const cohorts = [2023, 2024, 2025];

export function ScheduleBrowser() {
  const [cohort, setCohort] = useState("all");
  const [facultyId, setFacultyId] = useState("all");

  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      const cohortMatches = cohort === "all" || schedule.cohort === Number(cohort);
      const facultyMatches = facultyId === "all" || scheduleIncludesFaculty(schedule, facultyId);

      return cohortMatches && facultyMatches;
    });
  }, [cohort, facultyId]);

  return (
    <section className="space-y-5">
      <div className="rounded-card border border-vaa-border bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E0E7FF] text-[#4338CA]">
            <Filter size={21} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-vaa-text">Bộ lọc</h2>
            <p className="text-sm text-vaa-muted">{filteredSchedules.length} lịch đang hiển thị</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-vaa-text">Khóa</span>
            <select
              value={cohort}
              onChange={(event) => setCohort(event.target.value)}
              className="mt-2 h-[52px] w-full rounded-2xl border border-vaa-border bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-vaa-text outline-none transition focus:border-vaa-gold focus:bg-white focus:ring-4 focus:ring-vaa-gold/20"
            >
              <option value="all">Tất cả khóa</option>
              {cohorts.map((item) => (
                <option key={item} value={item}>
                  Khóa {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-vaa-text">Khoa/ngành</span>
            <select
              value={facultyId}
              onChange={(event) => setFacultyId(event.target.value)}
              className="mt-2 h-[52px] w-full rounded-2xl border border-vaa-border bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-vaa-text outline-none transition focus:border-vaa-gold focus:bg-white focus:ring-4 focus:ring-vaa-gold/20"
            >
              <option value="all">Tất cả khoa/ngành</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredSchedules.map((schedule) => (
          <ScheduleCard key={schedule.id} schedule={schedule} />
        ))}
      </div>

      {filteredSchedules.length === 0 ? (
        <div className="rounded-card border border-dashed border-vaa-border bg-white p-8 text-center text-vaa-muted">
          Không có lịch phù hợp với bộ lọc hiện tại.
        </div>
      ) : null}
    </section>
  );
}

function ScheduleCard({ schedule }: { schedule: RegistrationSchedule }) {
  return (
    <article className="rounded-card border border-vaa-border bg-white p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#DBEAFE] text-[#1D4ED8]">
            <CalendarDays size={22} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-vaa-gold">
              Nhóm {schedule.group}
            </p>
            <h2 className="mt-1 text-xl font-bold leading-snug text-vaa-text">{schedule.title}</h2>
          </div>
        </div>
        <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-sm font-bold text-[#15803D]">
          {schedule.cohort}
        </span>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {schedule.appliesToDescriptions.map((description) => (
          <span
            key={description}
            className="rounded-full border border-vaa-border bg-[#F8FAFC] px-3 py-1.5 text-sm font-semibold text-vaa-muted"
          >
            {description}
          </span>
        ))}
      </div>

      <div className="grid gap-3">
        <ScheduleFact label="Bắt đầu đăng ký" value={schedule.display.start} />
        <ScheduleFact label="LHP chuyển trạng thái “Chỉ đăng ký”" value={schedule.display.transition} />
        <ScheduleFact label="Kết thúc đăng ký / “Khóa lớp”" value={schedule.display.close} />
      </div>

      {schedule.appliesToTokenRules?.length ? (
        <div className="mt-5 rounded-2xl bg-[#F8FAFC] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-vaa-text">
            <GraduationCap size={17} className="text-vaa-gold" />
            Quy tắc theo token
          </div>
          <div className="space-y-2 text-sm leading-6 text-vaa-muted">
            {schedule.appliesToTokenRules.map((rule) => (
              <p key={`${rule.facultyId}-${rule.label}`}>
                {rule.label}: <span className="font-semibold text-vaa-text">{rule.tokens.join(", ")}</span>
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {schedule.note ? <p className="mt-4 text-sm leading-6 text-vaa-muted">{schedule.note}</p> : null}
    </article>
  );
}

function ScheduleFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-vaa-border bg-[#F8FAFC] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-vaa-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-vaa-text">{value}</p>
    </div>
  );
}

function scheduleIncludesFaculty(schedule: RegistrationSchedule, facultyId: string) {
  return (
    schedule.appliesToFacultyIds?.includes(facultyId) ||
    schedule.appliesToTokenRules?.some((rule) => rule.facultyId === facultyId)
  );
}
