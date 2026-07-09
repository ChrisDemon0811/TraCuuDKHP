import { Suspense } from "react";
import { MessageSquareWarning } from "lucide-react";
import { FeedbackForms } from "@/components/feedback-forms";
import { PageHeading } from "@/components/page-heading";

export default function FeedbackPage() {
  return (
    <>
      <PageHeading
        eyebrow="Góp ý dữ liệu"
        title="Góp ý / Báo lỗi"
        description="Góp ý của bạn giúp dữ liệu tra cứu chính xác hơn."
        icon={MessageSquareWarning}
      />
      <Suspense fallback={<FeedbackLoading />}>
        <FeedbackForms />
      </Suspense>
    </>
  );
}

function FeedbackLoading() {
  return (
    <div className="rounded-card border border-vaa-border bg-white p-6 text-sm font-semibold text-vaa-muted shadow-soft">
      Đang tải biểu mẫu...
    </div>
  );
}
