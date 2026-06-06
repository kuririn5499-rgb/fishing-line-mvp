"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface Account {
  id: string; slug: string; name: string; boat_name: string | null;
  liff_id_customer: string | null; liff_id_captain: string | null;
  line_channel_access_token: string | null; line_channel_secret: string | null;
  contact_email: string | null; contact_phone: string | null;
  prefecture: string | null; is_active: boolean;
}

export default function EditAccountPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<Partial<Account>>({});

  useEffect(() => {
    fetch("/api/superadmin/accounts")
      .then((r) => r.json())
      .then((d) => {
        const acc = (d.accounts ?? []).find((a: Account) => a.id === id);
        if (acc) setForm(acc);
      });
  }, [id]);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess(false);
    try {
      const res = await fetch(`/api/superadmin/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, k, placeholder, type = "text" }: { label: string; k: keyof Account; placeholder?: string; type?: string }) => (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={(form[k] as string) ?? ""}
        onChange={(e) => set(k as string, e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-500">← 戻る</button>
        <h2 className="text-base font-bold text-gray-800">アカウント編集</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">基本情報</p>
        <Field label="屋号（表示名）" k="name" placeholder="長崎丸" />
        <div>
          <label className="text-xs font-medium text-gray-600">スラッグ</label>
          <p className="mt-1 font-mono text-sm bg-gray-100 px-3 py-2 rounded-xl text-gray-600">{form.slug}</p>
        </div>
        <Field label="船名" k="boat_name" placeholder="長崎丸" />
        <Field label="都道府県" k="prefecture" placeholder="長崎県" />
        <Field label="連絡先メール" k="contact_email" type="email" />
        <Field label="連絡先電話" k="contact_phone" />

        <hr className="border-gray-100" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">LINE / LIFF 設定</p>
        <Field label="LIFF ID（お客様用）" k="liff_id_customer" />
        <Field label="LIFF ID（船長用）" k="liff_id_captain" />
        <Field label="LINE Channel Access Token" k="line_channel_access_token" />
        <Field label="LINE Channel Secret" k="line_channel_secret" />

        <hr className="border-gray-100" />
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">稼働状態</label>
          <button
            type="button"
            onClick={() => set("is_active", !form.is_active)}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium ${form.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
          >
            {form.is_active ? "稼働中" : "停止中"}
          </button>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        {success && <p className="text-xs text-green-600">保存しました</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </form>

      {form.slug && form.liff_id_customer && (
        <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-600 space-y-1">
          <p className="font-bold text-gray-700">LINE LIFF エンドポイント URL</p>
          <p className="font-mono bg-white border border-gray-200 px-2 py-1.5 rounded break-all">
            https://fishing-line-mvp.vercel.app/customer?a={form.slug}
          </p>
          <p className="font-mono bg-white border border-gray-200 px-2 py-1.5 rounded break-all">
            https://fishing-line-mvp.vercel.app/captain?a={form.slug}
          </p>
        </div>
      )}
    </div>
  );
}
