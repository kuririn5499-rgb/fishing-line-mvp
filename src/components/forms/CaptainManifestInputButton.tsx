"use client";

import { useState } from "react";

interface Companion {
  full_name: string;
  age: string;
  phone: string;
  address: string;
  emergency_phone: string;
  notes: string;
}

interface Props {
  reservationId: string;
  customerName: string | null;
  passengersCount: number;
  onSubmitted?: () => void;
}

const emptyCompanion = (): Companion => ({
  full_name: "", age: "", phone: "", address: "", emergency_phone: "", notes: "",
});

const inputCls = "w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";
const labelCls = "text-xs font-medium text-gray-600";

// ── コンポーネント外に定義して再マウントを防ぐ ──────────────────────────
interface PersonBlockProps {
  label: string;
  required?: boolean;
  full_name: string; age: string; phone: string;
  address: string; emergency_phone: string; notes: string;
  onChange: (k: string, v: string) => void;
}

function PersonBlock({ label, required, full_name, age, phone, address, emergency_phone, notes, onChange }: PersonBlockProps) {
  return (
    <div className="space-y-2 border border-gray-100 rounded-xl p-3">
      <p className="text-xs font-bold text-gray-600">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className={labelCls}>氏名{required && " *"}</label>
          <input className={inputCls} value={full_name} onChange={(e) => onChange("full_name", e.target.value)} placeholder="山田 太郎" />
        </div>
        <div>
          <label className={labelCls}>年齢</label>
          <input className={inputCls} type="number" min={0} max={120} value={age} onChange={(e) => onChange("age", e.target.value)} placeholder="60" />
        </div>
      </div>
      <div>
        <label className={labelCls}>電話番号{required && " *"}</label>
        <input className={inputCls} type="tel" value={phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="090-0000-0000" />
      </div>
      <div>
        <label className={labelCls}>住所{required && " *"}</label>
        <input className={inputCls} value={address} onChange={(e) => onChange("address", e.target.value)} placeholder="東京都○○区..." />
      </div>
      <div>
        <label className={labelCls}>緊急連絡先{required && " *"}</label>
        <input className={inputCls} type="tel" value={emergency_phone} onChange={(e) => onChange("emergency_phone", e.target.value)} placeholder="080-0000-0000" />
      </div>
      <div>
        <label className={labelCls}>備考</label>
        <input className={inputCls} value={notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="船酔いしやすいなど" />
      </div>
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────────────────────
export function CaptainManifestInputButton({ reservationId, customerName, passengersCount, onSubmitted }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState(customerName ?? "");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [companions, setCompanions] = useState<Companion[]>([]);

  const maxCompanions = Math.max(0, passengersCount - 1);

  const handleRepChange = (k: string, v: string) => {
    if (k === "full_name") setFullName(v);
    else if (k === "age") setAge(v);
    else if (k === "phone") setPhone(v);
    else if (k === "address") setAddress(v);
    else if (k === "emergency_phone") setEmergencyPhone(v);
    else if (k === "notes") setNotes(v);
  };

  const handleCompChange = (i: number, k: string, v: string) => {
    setCompanions((prev) => prev.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) { setError("氏名は必須です"); return; }
    if (!phone.trim()) { setError("電話番号は必須です"); return; }
    if (!address.trim()) { setError("住所は必須です"); return; }
    if (!emergencyPhone.trim()) { setError("緊急連絡先は必須です"); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/captain/manifests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservation_id: reservationId,
          full_name: fullName.trim(),
          age: age ? parseInt(age, 10) : undefined,
          phone: phone.trim(),
          address: address.trim(),
          emergency_name: "",
          emergency_phone: emergencyPhone.trim(),
          life_jacket_owned: false,
          rental_required: false,
          notes: notes.trim() || undefined,
          companions: companions
            .filter((c) => c.full_name.trim())
            .map((c) => ({
              full_name: c.full_name.trim(),
              age: c.age ? parseInt(c.age, 10) : undefined,
              phone: c.phone.trim(),
              address: c.address.trim(),
              emergency_phone: c.emergency_phone.trim(),
              notes: c.notes.trim() || undefined,
            })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "提出に失敗しました");
      setDone(true);
      setOpen(false);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラー");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return <span className="text-xs text-green-600 font-medium">✓ 入力済み</span>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 font-medium border border-blue-200 hover:bg-blue-100 transition"
      >
        📝 直接入力
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
      <p className="text-xs font-bold text-gray-700">📝 乗船名簿 直接入力</p>

      <PersonBlock
        label="代表者"
        required
        full_name={fullName}
        age={age}
        phone={phone}
        address={address}
        emergency_phone={emergencyPhone}
        notes={notes}
        onChange={handleRepChange}
      />

      {maxCompanions > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600">同行者（任意）</span>
            {companions.length < maxCompanions && (
              <button
                type="button"
                onClick={() => setCompanions((p) => [...p, emptyCompanion()])}
                className="text-xs text-brand-600 border border-brand-200 rounded-lg px-2 py-0.5"
              >
                ＋ 追加
              </button>
            )}
          </div>
          {companions.map((c, i) => (
            <div key={i} className="relative">
              <PersonBlock
                label={`同行者 ${i + 1}`}
                full_name={c.full_name}
                age={c.age}
                phone={c.phone}
                address={c.address}
                emergency_phone={c.emergency_phone}
                notes={c.notes}
                onChange={(k, v) => handleCompChange(i, k, v)}
              />
              <button
                type="button"
                onClick={() => setCompanions((p) => p.filter((_, idx) => idx !== i))}
                className="absolute top-2 right-3 text-xs text-red-500"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-brand-600 text-white text-sm font-medium py-2 rounded-xl disabled:opacity-50"
        >
          {submitting ? "提出中..." : "名簿を提出する"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
