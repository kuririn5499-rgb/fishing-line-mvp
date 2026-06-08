import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "遊漁船管理システム",
  description: "遊漁船向け LINE 業務システム",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased text-gray-900 bg-gray-50">
        {children}
      </body>
    </html>
  );
}
