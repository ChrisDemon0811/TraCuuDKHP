"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CircleHelp,
  HeartHandshake,
  GraduationCap,
  LibraryBig,
  MessageSquareWarning,
  Search,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navItems: Array<{
  href: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
}> = [
  { href: "/", label: "Tra cứu lịch", mobileLabel: "Tra cứu", icon: Search },
  { href: "/majors", label: "Mã ngành", icon: LibraryBig },
  { href: "/schedules", label: "Lịch theo ngành", mobileLabel: "Lịch", icon: CalendarDays },
  {
    href: "/feedback",
    label: "Góp ý / Báo lỗi",
    mobileLabel: "Góp ý",
    icon: MessageSquareWarning
  },
  { href: "/guide", label: "Hướng dẫn", icon: CircleHelp }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [donateOpen, setDonateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-vaa-bg text-vaa-text">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col bg-vaa-navy text-white shadow-2xl md:flex">
        <div className="px-7 pb-6 pt-7">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-vaa-gold ring-1 ring-white/15">
              <GraduationCap size={26} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase leading-5 tracking-wide">
                Học viện Hàng không Việt Nam
              </p>
              <p className="mt-1 text-xs text-slate-300">Tra cứu đăng ký học phần</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-2 px-5 pb-6">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-vaa-gold text-vaa-navy shadow-lg shadow-black/10"
                    : "text-slate-200 hover:bg-white/[0.09] hover:text-white"
                }`}
              >
                <Icon size={20} strokeWidth={1.9} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </aside>

      <div className="min-h-screen md:pl-[280px]">
        <header className="sticky top-0 z-30 border-b border-vaa-border/70 bg-vaa-bg/[0.85] backdrop-blur-xl">
          <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="flex min-w-0 flex-1 items-center gap-3 md:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-vaa-navy text-vaa-gold">
                <GraduationCap size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase leading-4 text-vaa-navy">
                  Học viện Hàng không
                </p>
                <p className="truncate text-xs text-vaa-muted">Tra cứu đăng ký học phần</p>
              </div>
            </Link>

            <div className="hidden min-w-0 flex-1 md:block">
              <p className="text-sm font-medium text-vaa-muted">Cổng tra cứu nội bộ</p>
              <p className="text-lg font-bold text-vaa-text">Lịch đăng ký học phần</p>
            </div>

            <button
              type="button"
              onClick={() => setDonateOpen(true)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-vaa-navy px-3 text-sm font-bold text-vaa-gold shadow-lg shadow-vaa-navy/10 transition hover:bg-vaa-navyDeep focus:outline-none focus:ring-4 focus:ring-vaa-gold/25 sm:px-5"
            >
              <HeartHandshake size={18} />
              <span>Donate for me</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 md:pb-10">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-vaa-border bg-white/95 px-2 py-2 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-semibold transition ${
                  active ? "bg-vaa-navy text-vaa-gold" : "text-vaa-muted hover:bg-slate-50"
                }`}
              >
                <Icon size={20} strokeWidth={1.9} />
                <span className="leading-tight">{item.mobileLabel ?? item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {donateOpen ? <DonateModal onClose={() => setDonateOpen(false)} /> : null}
    </div>
  );
}

function DonateModal({ onClose }: { onClose: () => void }) {
  const [qrFailed, setQrFailed] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-title"
    >
      <div className="w-full max-w-[430px] overflow-hidden rounded-card border border-white/20 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-vaa-border px-5 py-4">
          <div>
            <h2 id="donate-title" className="text-lg font-bold text-vaa-text">
              Donate for me
            </h2>
            <p className="text-sm text-vaa-muted">Quét QR ngân hàng để ủng hộ.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-vaa-border bg-white text-vaa-muted transition hover:text-vaa-navy"
          >
            <X size={19} />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4 rounded-2xl bg-[#F8FAFC] p-4 text-center">
            <p className="text-sm font-bold text-vaa-text">Cảm ơn bạn đã sử dụng website.</p>
            <p className="mt-1 text-sm leading-6 text-vaa-muted">
              Nếu thấy công cụ hữu ích, bạn có thể ủng hộ mình một ly cà phê để mình tiếp tục cải thiện nhé.
            </p>
          </div>
          <div className="overflow-hidden rounded-[18px] border border-vaa-border bg-[#F8FAFC]">
            {qrFailed ? (
              <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 p-6 text-center">
                <HeartHandshake size={38} className="text-vaa-gold" />
                <p className="text-sm font-bold text-vaa-text">Chưa có ảnh QR trong project</p>
                <p className="text-xs leading-5 text-vaa-muted">
                  Đặt ảnh QR bạn gửi vào <span className="font-semibold">public/donate-qr.jpg</span>.
                </p>
              </div>
            ) : (
              <img
                src="/donate-qr.jpg"
                alt="QR ngân hàng Techcombank để donate"
                onError={() => setQrFailed(true)}
                className="mx-auto aspect-square w-full max-w-[360px] object-contain"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
