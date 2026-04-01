import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "遊漁船管理システム",
  description: "遊漁船向け LINE 業務システム",
  // LINE 内ブラウザのビューポートに最適化
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
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
