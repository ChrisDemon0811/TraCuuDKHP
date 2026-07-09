import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Tra cứu đăng ký học phần VAA",
  description: "Tra cứu lịch đăng ký học phần theo mã lớp"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#062B49"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
