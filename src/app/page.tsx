import { Search } from "lucide-react";
import { LookupForm } from "@/components/lookup-form";
import { PageHeading } from "@/components/page-heading";

export default function HomePage() {
  return (
    <>
      <PageHeading
        eyebrow="Tra cứu theo mã lớp"
        title="Tìm lịch đăng ký học phần"
        description="Nhập mã lớp để nhận diện khóa, khoa/ngành và lịch đăng ký tương ứng từ dữ liệu hiện có."
        icon={Search}
      />
      <LookupForm />
    </>
  );
}
