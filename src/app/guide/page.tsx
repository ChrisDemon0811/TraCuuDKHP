import { ArrowRight, CircleHelp } from "lucide-react";
import { PageHeading } from "@/components/page-heading";

export default function GuidePage() {
  return (
    <>
      <PageHeading
        eyebrow="Hướng dẫn"
        title="Cách đọc mã lớp"
        description="Mã lớp được chuẩn hóa rồi so khớp với danh sách mã ngành/khoa trong file dữ liệu."
        icon={CircleHelp}
      />

      <div className="mx-auto max-w-4xl">
        <section className="rounded-card border border-vaa-border bg-white p-5 shadow-soft sm:p-7">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-center sm:text-left">
            <CodePiece value="24" label="Khóa 2024" tone="blue" />
            <ArrowRight size={18} className="text-vaa-muted" />
            <CodePiece value="ĐHTT" label="Công nghệ thông tin" tone="gold" />
            <ArrowRight size={18} className="text-vaa-muted" />
            <CodePiece value="02" label="Thứ tự lớp" tone="green" />
          </div>

          <div className="space-y-5 text-base leading-8 text-vaa-muted">
            <p>
              Với mã <strong className="text-vaa-text">24ĐHTT02</strong>, hệ thống đọc hai chữ số đầu
              là khóa <strong className="text-vaa-text">2024</strong>.
            </p>
            <p>
              Phần ở giữa, ví dụ <strong className="text-vaa-text">ĐHTT</strong>, được so với các mẫu
              như <strong className="text-vaa-text">xxĐHTTxx</strong> và token dự phòng trong JSON.
            </p>
            <p>
              Hai chữ số cuối như <strong className="text-vaa-text">01</strong>,{" "}
              <strong className="text-vaa-text">02</strong>,{" "}
              <strong className="text-vaa-text">03</strong> là thứ tự lớp và không dùng để chọn lịch.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function CodePiece({
  value,
  label,
  tone
}: {
  value: string;
  label: string;
  tone: "blue" | "gold" | "green";
}) {
  const styles = {
    blue: "bg-[#DBEAFE] text-[#1D4ED8]",
    gold: "bg-[#FEF3C7] text-[#B45309]",
    green: "bg-[#DCFCE7] text-[#15803D]"
  };

  return (
    <div className="min-w-[120px] rounded-2xl border border-vaa-border bg-[#F8FAFC] p-4">
      <p className={`mx-auto mb-2 inline-flex rounded-xl px-3 py-1 text-lg font-black ${styles[tone]}`}>
        {value}
      </p>
      <p className="text-sm font-semibold text-vaa-muted">{label}</p>
    </div>
  );
}
