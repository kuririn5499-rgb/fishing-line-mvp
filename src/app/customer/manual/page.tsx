import Link from "next/link";
import { Card } from "@/components/ui/Card";

const steps = [
  {
    icon: "📅",
    title: "予約する",
    desc: "出船情報一覧から乗りたい便を選んで予約します。空き状況をリアルタイムで確認できます。",
    href: "/customer/reservations",
    link: "予約ページへ",
  },
  {
    icon: "📋",
    title: "乗船名簿を記入する（前日まで）",
    desc: "予約後、出船前日までに乗船名簿を必ず提出してください。同乗者の分もまとめて記入できます。",
    href: "/customer/manifest",
    link: "乗船名簿へ",
  },
  {
    icon: "🚢",
    title: "出船情報を確認する",
    desc: "出船日の前日〜当日に、船長から出船の可否が通知されます。ホーム画面で確認してください。",
    href: "/customer",
    link: "ホームへ",
  },
  {
    icon: "🐟",
    title: "釣果・お知らせを見る",
    desc: "船長が投稿した釣果情報やお知らせをチェックできます。",
    href: "/customer/reports",
    link: "釣果・お知らせへ",
  },
  {
    icon: "🎟️",
    title: "クーポンを確認する",
    desc: "船長からクーポンが配布されたらホーム画面に通知が出ます。忘れずに確認してください。",
    href: "/customer/coupons",
    link: "クーポンへ",
  },
  {
    icon: "⭐",
    title: "ポイントを確認する",
    desc: "乗船するとポイントが貯まります。貯まったポイントは特典と交換できます。",
    href: "/customer/points",
    link: "ポイントへ",
  },
  {
    icon: "🙋",
    title: "便をリクエストする",
    desc: "希望日程を船長にリクエストできます。船長が承認すると便が作成され、予約できるようになります。",
    href: "/customer/request",
    link: "リクエストへ",
  },
];

export default function CustomerManualPage() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/customer" className="text-xs text-brand-600">← ホームに戻る</Link>
        <h1 className="text-xl font-bold text-sea-dark mt-1">使い方マニュアル</h1>
        <p className="text-xs text-gray-500 mt-0.5">ご利用ガイド</p>
      </div>

      <Card className="bg-brand-50 border-brand-200">
        <p className="text-sm font-semibold text-brand-800 mb-1">基本の流れ</p>
        <p className="text-xs text-brand-700">
          予約する → 乗船名簿を記入（前日まで）→ 出船情報を確認 → 乗船
        </p>
      </Card>

      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">ステップガイド</h2>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <Card key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{step.icon}</span>
                  <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
                <Link href={step.href} className="text-xs text-brand-600 mt-1 inline-block">
                  → {step.link}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">ホーム画面の「やること」について</h2>
        <Card>
          <ul className="space-y-2 text-xs text-gray-600">
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold shrink-0">黄</span>
              <span>乗船名簿がまだ未提出です。前日までに記入してください。</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">青</span>
              <span>新しいクーポンが届いています。確認してください。</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 font-bold shrink-0">緑</span>
              <span>やることはありません。次の便を楽しみに待ちましょう！</span>
            </li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
