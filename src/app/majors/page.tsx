import { LibraryBig } from "lucide-react";
import { MajorDirectory } from "@/components/major-directory";
import { PageHeading } from "@/components/page-heading";

export default function MajorsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Danh sách mã ngành"
        title="Mã nhận diện khoa/ngành"
        description="Tra cứu các mẫu mã lớp và token đang được dùng để nhận diện khoa/ngành."
        icon={LibraryBig}
      />
      <MajorDirectory />
    </>
  );
}
