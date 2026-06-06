"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

interface Account {
  id: string; slug: string; name: string; boat_name: string | null;
  liff_id_customer: string | null; liff_id_captain: string | null;
  line_channel_access_token: string | null; line_channel_secret: string | null;
  contact_email: string | null; contact_phone: string | null;
  prefecture: string | null; is_active: boolean;
  feature_points: boolean; feature_coupon: boolean;
  google_calendar_id: string | null;
  google_service_account_email: string | null;
  google_service_account_private_key: string | null;
}

interface Boat {
  id: string; name: string; registration_number: string | null; is_active: boolean;
}

export default function EditAccountPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<Partial<Account>>({});

  // 船舶
  const [boats, setBoats] = useState<Boat[]>([]);
  const [newBoatName, setNewBoatName] = useState("");
  const [newBoatReg, setNewBoatReg] = useState("");
  const [boatSaving, setBoatSaving] = useState(false);

  const loadBoats = useCallback(() => {
    fetch(`/api/superadmin/accounts/${id}/boats`)
      .then((r) => r.json())
      .then((d) => setBoats(d.boats ?? []));
  }, [id]);

  useEffect(() => {
    fetch("/api/superadmin/accounts")
      .then((r) => r.json())
      .then((d) => {
        const acc = (d.accounts ?? []).find((a: Account) => a.id === id);
        if (acc) setForm(acc);
      });
    loadBoats();
  }, [id, loadBoats]);

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

  const addBoat = async () => {
    if (!newBoatName.trim()) return;
    setBoatSaving(true);
    await fetch(`/api/superadmin/accounts/${id}/boats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBoatName, registration_number: newBoatReg }),
    });
    setNewBoatName(""); setNewBoatReg("");
    setBoatSaving(false);
    loadBoats();
  };

  const toggleBoat = async (boatId: string, current: boolean) => {
    await fetch(`/api/superadmin/accounts/${id}/boats/${boatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    loadBoats();
  };

  const deleteBoat = async (boatId: string) => {
    if (!confirm("この船を削除しますか？")) return;
    await fetch(`/api/superadmin/accounts/${id}/boats/${boatId}`, { method: "DELETE" });
    loadBoats();
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

      {/* ─── アカウント設定フォーム ─── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">

        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">基本情報</p>
        <Field label="屋号（表示名）" k="name" placeholder="長崎丸" />
        <div>
          <label className="text-xs font-medium text-gray-600">スラッグ</label>
          <p className="mt-1 font-mono text-sm bg-gray-100 px-3 py-2 rounded-xl text-gray-600">{form.slug}</p>
        </div>
        <Field label="船名（メイン）" k="boat_name" placeholder="長崎丸" />
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
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Google カレンダー設定</p>
        <Field label="カレンダー ID" k="google_calendar_id" placeholder="xxx@group.calendar.google.com" />
        <Field label="サービスアカウント Email" k="google_service_account_email" placeholder="xxx@xxx.iam.gserviceaccount.com" />
        <div>
          <label className="text-xs font-medium text-gray-600">サービスアカウント 秘密鍵（Private Key）</label>
          <textarea
            value={(form.google_service_account_private_key as string) ?? ""}
            onChange={(e) => set("google_service_account_private_key", e.target.value)}
            placeholder={"-----BEGIN RSA PRIVATE KEY-----\n..."}
            rows={4}
            className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </div>
        {form.google_service_account_email && (
          <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700">
            <p className="font-medium mb-1">Google カレンダー共有設定</p>
            <p>下記のメールアドレスに「予定の変更権限」を付与してください：</p>
            <p className="font-mono bg-blue-100 px-2 py-1 rounded mt-1 break-all">{form.google_service_account_email}</p>
          </div>
        )}

        <hr className="border-gray-100" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">機能設定</p>
        {(["feature_points", "feature_coupon"] as const).map((k) => {
          const labels: Record<string, string> = { feature_points: "ポイント機能", feature_coupon: "クーポン機能" };
          return (
            <div key={k} className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{labels[k]}</label>
              <button
                type="button"
                onClick={() => set(k, !(form[k] ?? true))}
                className={`px-4 py-1.5 rounded-xl text-xs font-medium ${(form[k] ?? true) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}
              >
                {(form[k] ?? true) ? "ON" : "OFF"}
              </button>
            </div>
          );
        })}

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

      {/* ─── 船舶管理 ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">船舶管理</p>

        {boats.length === 0 ? (
          <p className="text-sm text-gray-400">登録された船舶がありません</p>
        ) : (
          <ul className="space-y-2">
            {boats.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{b.name}</p>
                  {b.registration_number && (
                    <p className="text-xs text-gray-400">登録番号: {b.registration_number}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleBoat(b.id, b.is_active)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium ${b.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {b.is_active ? "有効" : "停止"}
                  </button>
                  <button
                    onClick={() => deleteBoat(b.id)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-500 font-medium"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-medium text-gray-600">船を追加</p>
          <input
            type="text"
            value={newBoatName}
            onChange={(e) => setNewBoatName(e.target.value)}
            placeholder="船名"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            value={newBoatReg}
            onChange={(e) => setNewBoatReg(e.target.value)}
            placeholder="登録番号（任意）"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={addBoat}
            disabled={boatSaving || !newBoatName.trim()}
            className="w-full bg-gray-700 text-white font-medium py-2 rounded-xl text-sm hover:bg-gray-800 disabled:opacity-40"
          >
            {boatSaving ? "追加中..." : "船を追加"}
          </button>
        </div>
      </div>

      {/* ─── LIFF エンドポイント ─── */}
      {form.slug && (
        <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-600 space-y-1">
          <p className="font-bold text-gray-700">LINE LIFF エンドポイント URL</p>
          <p className="text-gray-500">お客様用 LIFF のエンドポイントにこの URL を設定してください</p>
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
