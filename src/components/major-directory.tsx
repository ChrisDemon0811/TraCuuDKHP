"use client";

import { useMemo, useState } from "react";
import { ChevronDown, LibraryBig, Search } from "lucide-react";
import { faculties } from "@/lib/data";

const palette = [
  "bg-[#DBEAFE] text-[#1D4ED8]",
  "bg-[#DCFCE7] text-[#15803D]",
  "bg-[#FEF3C7] text-[#B45309]",
  "bg-[#FCE7F3] text-[#BE185D]",
  "bg-[#E0E7FF] text-[#4338CA]"
];

export function MajorDirectory() {
  const [query, setQuery] = useState("");
  const [openFacultyIds, setOpenFacultyIds] = useState<Set<string>>(() => new Set());

  const normalizedQuery = query.trim().toLocaleUpperCase("vi-VN");
  const filteredFaculties = useMemo(() => {
    if (!normalizedQuery) {
      return faculties;
    }

    return faculties.filter((faculty) => {
      const searchable = [
        faculty.name,
        faculty.shortName,
        ...faculty.patterns,
        ...faculty.tokens
      ]
        .join(" ")
        .toLocaleUpperCase("vi-VN");

      return searchable.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  function toggleFaculty(facultyId: string) {
    setOpenFacultyIds((current) => {
      const next = new Set(current);
      if (next.has(facultyId)) {
        next.delete(facultyId);
      } else {
        next.add(facultyId);
      }

      return next;
    });
  }

  return (
    <section className="space-y-5">
      <div className="rounded-card border border-vaa-border bg-white p-5 shadow-soft">
        <label htmlFor="majorSearch" className="text-sm font-bold text-vaa-text">
          Tìm theo tên khoa hoặc mã
        </label>
        <div className="relative mt-3">
          <Search
            size={20}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-vaa-muted"
          />
          <input
            id="majorSearch"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ví dụ: Công nghệ thông tin, ĐHTT, ĐHKL..."
            className="h-14 w-full rounded-2xl border border-vaa-border bg-[#F8FAFC] pl-12 pr-4 text-base font-semibold text-vaa-text outline-none transition placeholder:text-slate-400 focus:border-vaa-gold focus:bg-white focus:ring-4 focus:ring-vaa-gold/20"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredFaculties.map((faculty, index) => {
          const open = openFacultyIds.has(faculty.id);
          const colorClass = palette[index % palette.length];

          return (
            <article key={faculty.id} className="rounded-card border border-vaa-border bg-white shadow-soft">
              <button
                type="button"
                onClick={() => toggleFaculty(faculty.id)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
                aria-expanded={open}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colorClass}`}>
                    <LibraryBig size={22} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-vaa-text">{faculty.name}</h2>
                    <p className="mt-1 text-sm text-vaa-muted">
                      {faculty.patterns.length} mẫu mã, {faculty.tokens.length} token
                    </p>
                  </div>
                </div>
                <ChevronDown
                  size={22}
                  className={`shrink-0 text-vaa-muted transition ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open ? (
                <div className="border-t border-vaa-border px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <p className="mb-3 text-sm font-bold text-vaa-text">Mẫu mã ngành</p>
                      <div className="flex flex-wrap gap-2">
                        {faculty.patterns.map((pattern) => (
                          <span
                            key={pattern}
                            className="rounded-full border border-vaa-border bg-[#F8FAFC] px-3 py-1.5 text-sm font-semibold text-vaa-text"
                          >
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-bold text-vaa-text">Token dự phòng</p>
                      <div className="flex flex-wrap gap-2">
                        {faculty.tokens.map((token) => (
                          <span
                            key={token}
                            className="rounded-full bg-vaa-navy/[0.08] px-3 py-1.5 text-sm font-semibold text-vaa-navy"
                          >
                            {token}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {filteredFaculties.length === 0 ? (
        <div className="rounded-card border border-dashed border-vaa-border bg-white p-8 text-center text-vaa-muted">
          Không tìm thấy mã ngành phù hợp.
        </div>
      ) : null}
    </section>
  );
}
