import { CalendarDays } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { ScheduleBrowser } from "@/components/schedule-browser";

export default function SchedulesPage() {
  return (
    <>
      <PageHeading
        eyebrow="Lịch theo ngành"
        title="Toàn bộ lịch đăng ký"
        description="Xem lịch theo khóa 2023, 2024, 2025 và lọc theo khoa/ngành từ dữ liệu JSON."
        icon={CalendarDays}
      />
      <ScheduleBrowser />
    </>
  );
}
