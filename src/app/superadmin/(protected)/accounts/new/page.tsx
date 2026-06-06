"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAccountPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", slug: "", boat_name: "",
    liff_id_customer: "", liff_id_captain: "",
    line_channel_access_token: "", line_channel_secret: "",
    contact_email: "", contact_phone: "", prefecture: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/superadmin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push("/superadmin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成失敗");
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, k, placeholder, type = "text", required = false }: { label: string; k: string; placeholder?: string; type?: string; required?: boolean }) => (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}{required && " *"}</label>
      <input
        type={type}
        value={(form as Record<string, string>)[k]}
        onChange={(e) => set(k, e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-500">← 戻る</button>
        <h2 className="text-base font-bold text-gray-800">新規アカウント作成</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">基本情報</p>
        <Field label="屋号（表示名）" k="name" placeholder="長崎丸" required />
        <Field label="スラッグ（URL識別子）" k="slug" placeholder="nagasakimaru" required />
        <p className="text-xs text-gray-400">※ 英数字・ハイフンのみ。後から変更不可</p>
        <Field label="船名" k="boat_name" placeholder="長崎丸" />
        <Field label="都道府県" k="prefecture" placeholder="長崎県" />
        <Field label="連絡先メール" k="contact_email" type="email" placeholder="info@nagasakimaru.jp" />
        <Field label="連絡先電話" k="contact_phone" placeholder="090-1234-5678" />

        <hr className="border-gray-100" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">LINE / LIFF 設定</p>
        <Field label="LIFF ID（お客様用）" k="liff_id_customer" placeholder="2009669338-XxXxXxXx" />
        <Field label="LIFF ID（船長用）" k="liff_id_captain" placeholder="2009669374-XxXxXxXx" />
        <Field label="LINE Channel Access Token" k="line_channel_access_token" placeholder="チャンネルアクセストークン" />
        <Field label="LINE Channel Secret" k="line_channel_secret" placeholder="チャンネルシークレット" />

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "作成中..." : "アカウントを作成"}
        </button>
      </form>

      <div className="bg-blue-50 rounded-2xl p-4 text-xs text-blue-700 space-y-1">
        <p className="font-bold">作成後の設定手順</p>
        <p>1. LINE Developers で LINE Login チャンネルを作成</p>
        <p>2. LIFF アプリを2つ作成（customer / captain）</p>
        <p>3. LIFF エンドポイント URL を設定：</p>
        <p className="font-mono bg-blue-100 px-2 py-1 rounded break-all">
          https://fishing-line-mvp.vercel.app/customer?a=【スラッグ】
        </p>
        <p>4. 上記ページでアカウントの LIFF ID と LINE Token を入力</p>
      </div>
    </div>
  );
}
