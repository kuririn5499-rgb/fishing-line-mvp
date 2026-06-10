"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

// コンポーネント外に定義しないと入力のたびに再マウントされてフォーカスが外れる
function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}

function EndpointRow({ label, defaultUrl }: { label: string; defaultUrl: string }) {
  const [value, setValue] = useState(defaultUrl);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="space-y-1">
      <p className="font-medium text-gray-600">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 font-mono bg-white border border-gray-300 px-2 py-1.5 rounded text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={copy}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${copied ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
        >
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>
    </div>
  );
}

const COMMISSION_RANKS = [
  { value: "normal",   label: "ノーマル", rate: "5%" },
  { value: "bronze",   label: "ブロンズ", rate: "4%" },
  { value: "silver",   label: "シルバー", rate: "3%" },
  { value: "gold",     label: "ゴールド", rate: "2%" },
  { value: "platinum", label: "プラチナ", rate: "1%" },
] as const;

interface Account {
  id: string; slug: string; name: string; boat_name: string | null;
  liff_id_customer: string | null; liff_id_captain: string | null;
  line_channel_access_token: string | null; line_channel_secret: string | null;
  contact_email: string | null; contact_phone: string | null;
  prefecture: string | null; is_active: boolean;
  feature_points: boolean; feature_coupon: boolean; feature_customer_cancel: boolean;
  commission_rank: string;
  google_calendar_id: string | null;
  google_spreadsheet_id: string | null;
  google_service_account_email: string | null;
  google_service_account_private_key: string | null;
}

interface Boat {
  id: string; name: string; registration_number: string | null; is_active: boolean;
}

interface User {
  id: string; line_user_id: string; display_name: string | null;
  role: string; is_active: boolean; created_at: string;
}

const ROLES = ["customer", "captain", "staff", "operator", "admin"] as const;

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
  const [sheetsSetup, setSheetsSetup] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [sheetsSetupMsg, setSheetsSetupMsg] = useState("");

  // ユーザー
  const [users, setUsers] = useState<User[]>([]);
  const [roleChanging, setRoleChanging] = useState<string | null>(null);

  const loadBoats = useCallback(() => {
    fetch(`/api/superadmin/accounts/${id}/boats`)
      .then((r) => r.json())
      .then((d) => setBoats(d.boats ?? []));
  }, [id]);

  const loadUsers = useCallback(() => {
    fetch(`/api/superadmin/accounts/${id}/users`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []));
  }, [id]);

  useEffect(() => {
    fetch("/api/superadmin/accounts")
      .then((r) => r.json())
      .then((d) => {
        const acc = (d.accounts ?? []).find((a: Account) => a.id === id);
        if (acc) setForm(acc);
      });
    loadBoats();
    loadUsers();
  }, [id, loadBoats, loadUsers]);

  const changeRole = async (userId: string, role: string) => {
    setRoleChanging(userId);
    await fetch(`/api/superadmin/accounts/${id}/users`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    setRoleChanging(null);
    loadUsers();
  };

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

  const handleSheetsSetup = async () => {
    setSheetsSetup("loading");
    setSheetsSetupMsg("");
    try {
      const res = await fetch(`/api/superadmin/accounts/${id}/setup-sheets`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "失敗");
      setSheetsSetup("ok");
      setSheetsSetupMsg(json.message ?? "完了");
    } catch (err) {
      setSheetsSetup("error");
      setSheetsSetupMsg(err instanceof Error ? err.message : "エラー");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-500">← 戻る</button>
        <h2 className="text-base font-bold text-gray-800">アカウント編集</h2>
      </div>

      {/* ─── アカウント設定フォーム ─── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">

        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">基本情報</p>
        <Field label="屋号（表示名）" value={(form.name as string) ?? ""} onChange={(v) => set("name", v)} placeholder="長崎丸" />
        <div>
          <label className="text-xs font-medium text-gray-600">スラッグ</label>
          <p className="mt-1 font-mono text-sm bg-gray-100 px-3 py-2 rounded-xl text-gray-600">{form.slug}</p>
        </div>
        <Field label="船名（メイン）" value={(form.boat_name as string) ?? ""} onChange={(v) => set("boat_name", v)} placeholder="長崎丸" />
        <Field label="都道府県" value={(form.prefecture as string) ?? ""} onChange={(v) => set("prefecture", v)} placeholder="長崎県" />
        <Field label="連絡先メール" value={(form.contact_email as string) ?? ""} onChange={(v) => set("contact_email", v)} type="email" />
        <Field label="連絡先電話" value={(form.contact_phone as string) ?? ""} onChange={(v) => set("contact_phone", v)} />

        <hr className="border-gray-100" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">LINE / LIFF 設定</p>
        <Field label="LIFF ID（お客様用）" value={(form.liff_id_customer as string) ?? ""} onChange={(v) => set("liff_id_customer", v)} />
        <Field label="LIFF ID（船長用）" value={(form.liff_id_captain as string) ?? ""} onChange={(v) => set("liff_id_captain", v)} />
        <Field label="LINE Channel Access Token" value={(form.line_channel_access_token as string) ?? ""} onChange={(v) => set("line_channel_access_token", v)} />
        <Field label="LINE Channel Secret" value={(form.line_channel_secret as string) ?? ""} onChange={(v) => set("line_channel_secret", v)} />

        <hr className="border-gray-100" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Google 連携設定</p>
        <Field label="カレンダー ID" value={(form.google_calendar_id as string) ?? ""} onChange={(v) => set("google_calendar_id", v)} placeholder="xxx@group.calendar.google.com" />
        <Field label="スプレッドシート ID" value={(form.google_spreadsheet_id as string) ?? ""} onChange={(v) => set("google_spreadsheet_id", v)} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSheetsSetup}
            disabled={sheetsSetup === "loading" || !form.google_spreadsheet_id}
            className="flex-1 bg-green-600 text-white font-medium py-2 rounded-xl text-sm hover:bg-green-700 disabled:opacity-40"
          >
            {sheetsSetup === "loading" ? "設定中..." : "📊 シート初期設定（タブ＋ヘッダー作成）"}
          </button>
        </div>
        {sheetsSetupMsg && (
          <p className={`text-xs ${sheetsSetup === "ok" ? "text-green-600" : "text-red-500"}`}>
            {sheetsSetup === "ok" ? "✅ " : "❌ "}{sheetsSetupMsg}
          </p>
        )}
        <Field label="サービスアカウント Email" value={(form.google_service_account_email as string) ?? ""} onChange={(v) => set("google_service_account_email", v)} placeholder="xxx@xxx.iam.gserviceaccount.com" />
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
          <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700 space-y-2">
            <p className="font-medium">サービスアカウント共有設定</p>
            <p>下記アドレスをGoogleカレンダーに「予定の変更権限」、スプレッドシートに「編集者」として追加してください：</p>
            <p className="font-mono bg-blue-100 px-2 py-1 rounded break-all">{form.google_service_account_email}</p>
            {form.google_spreadsheet_id && (
              <p className="text-blue-600">スプレッドシートID: <span className="font-mono">{form.google_spreadsheet_id}</span></p>
            )}
          </div>
        )}

        <hr className="border-gray-100" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">機能設定</p>
        {(
          [
            { key: "feature_points",         label: "ポイント機能" },
            { key: "feature_coupon",          label: "クーポン機能" },
            { key: "feature_customer_cancel", label: "顧客キャンセル機能" },
          ] as { key: keyof Account; label: string }[]
        ).map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <button
              type="button"
              onClick={() => set(key, !(form[key] ?? true))}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium ${(form[key] ?? true) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}
            >
              {(form[key] ?? true) ? "ON" : "OFF"}
            </button>
          </div>
        ))}

        <hr className="border-gray-100" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">船ナビ手数料ランク</p>
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-1.5">
            {COMMISSION_RANKS.map((rank) => (
              <button
                key={rank.value}
                type="button"
                onClick={() => set("commission_rank", rank.value)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl border text-xs font-medium transition-colors ${
                  (form.commission_rank ?? "normal") === rank.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}
              >
                <span className="font-bold">{rank.rate}</span>
                <span className="mt-0.5 text-[10px] opacity-80">{rank.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            ※ 紹介数に応じてランクを設定します。ランクは月次精算の手数料計算に使用されます。
          </p>
        </div>

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

      {/* ─── ユーザー管理 ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">ユーザー管理（ロール変更）</p>
        {users.length === 0 ? (
          <p className="text-sm text-gray-400">ユーザーがいません</p>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {u.display_name ?? "（名前なし）"}
                  </p>
                  <p className="text-xs text-gray-400 font-mono truncate">{u.line_user_id}</p>
                </div>
                <select
                  value={u.role}
                  disabled={roleChanging === u.id}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ─── LIFF エンドポイント ─── */}
      {form.slug && (
        <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-600 space-y-3">
          <div>
            <p className="font-bold text-gray-700 text-sm">LINE LIFF エンドポイント URL</p>
            <p className="text-gray-500 mt-0.5">LINE Developers の各 LIFF アプリのエンドポイント URL に設定してください。直接編集してコピーできます。</p>
          </div>
          <EndpointRow
            label="お客様用"
            defaultUrl={`${typeof window !== "undefined" ? window.location.origin : "https://fishing-line-mvp.vercel.app"}/customer?a=${form.slug}`}
          />
          <EndpointRow
            label="船長用"
            defaultUrl={`${typeof window !== "undefined" ? window.location.origin : "https://fishing-line-mvp.vercel.app"}/captain?a=${form.slug}`}
          />
        </div>
      )}
    </div>
  );
}
