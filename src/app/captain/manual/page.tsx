import Link from "next/link";
import { Card } from "@/components/ui/Card";

const steps = [
  {
    icon: "📆",
    title: "便を作成する",
    desc: "出船日・時間・定員・ターゲット魚種を登録します。作成した便は自動でお客様に表示されます。",
    href: "/captain/trips",
    link: "便管理ページへ",
  },
  {
    icon: "📋",
    title: "予約・リクエストを確認する",
    desc: "新しい予約やリクエストが来たら通知が届きます。予約一覧で確認・承認してください。",
    href: "/captain/reservations",
    link: "予約一覧へ",
  },
  {
    icon: "👥",
    title: "乗船名簿を確認する（前日まで）",
    desc: "お客様が乗船名簿を提出しているか確認します。未提出のお客様にはリマインダーを送れます。出船前日までに完了してください。",
    href: "/captain/manifests",
    link: "乗船名簿へ",
  },
  {
    icon: "✅",
    title: "出船前検査・出船情報を登録する（前日まで）",
    desc: "出船の可否（Go / 中止）を判断し、お客様へ通知します。安全確認チェックリストも入力してください。",
    href: "/captain/pre-departure",
    link: "出船前検査へ",
  },
  {
    icon: "📝",
    title: "乗務記録を入力する（出船後）",
    desc: "帰港後に乗務記録（出港・帰港時刻、釣果など）を入力します。",
    href: "/captain/duty-log",
    link: "乗務記録へ",
  },
  {
    icon: "🐟",
    title: "釣果・お知らせを投稿する",
    desc: "釣果写真やコメントを投稿するとお客様のホーム画面に表示されます。",
    href: "/captain/fishing-report",
    link: "釣果投稿へ",
  },
  {
    icon: "🎟️",
    title: "クーポン・ポイントを管理する",
    desc: "クーポンを発行したり、ポイント申請を承認します。",
    href: "/captain/coupons",
    link: "クーポン管理へ",
  },
];

export default function CaptainManualPage() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/captain" className="text-xs text-brand-600">← ホームに戻る</Link>
        <h1 className="text-xl font-bold text-sea-dark mt-1">使い方マニュアル</h1>
        <p className="text-xs text-gray-500 mt-0.5">船長・スタッフ向け</p>
      </div>

      <Card className="bg-brand-50 border-brand-200">
        <p className="text-sm font-semibold text-brand-800 mb-1">基本の流れ</p>
        <p className="text-xs text-brand-700">
          便を作成 → 予約確認 → 名簿確認（前日まで）→ 出船前検査（前日まで）→ 乗務記録（当日）
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
              <span className="text-red-500 font-bold shrink-0">赤</span>
              <span>新しい予約・リクエスト・ポイント申請が届いています。すぐに確認してください。</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold shrink-0">黄</span>
              <span>近日中の便で名簿確認・出船前情報の登録が必要です。前日までに完了してください。</span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-500 font-bold shrink-0">緑</span>
              <span>やることはありません。お疲れ様です！</span>
            </li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
