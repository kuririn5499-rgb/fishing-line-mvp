"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface WaitlistButtonProps {
  tripId: string;
}

export function WaitlistButton({ tripId }: WaitlistButtonProps) {
  const [open, setOpen] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          passengers_count: passengers,
          customer_name: name,
          customer_phone: phone,
          waitlist: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "登録に失敗しました");
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p className="text-sm text-orange-600 font-medium text-center py-1">
        ✅ キャンセル待ちを登録しました
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2 rounded-xl border border-orange-300 text-orange-600 text-sm font-medium bg-orange-50 hover:bg-orange-100 transition-colors"
      >
        キャンセル待ちに登録する
      </button>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      <div>
        <label className="text-xs font-medium text-gray-600">乗船人数</label>
        <input
          type="number"
          min={1}
          max={10}
          value={passengers}
          onChange={(e) => setPassengers(Math.max(1, parseInt(e.target.value) || 1))}
          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">お名前 <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="山田太郎"
          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">電話番号 <span className="text-red-500">*</span></label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="090-0000-0000"
          className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={submit}
        disabled={loading || !name.trim() || !phone.trim()}
        className="w-full py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors"
      >
        {loading ? "登録中..." : "キャンセル待ちに登録する"}
      </button>
      <button
        onClick={() => { setOpen(false); setError(""); }}
        className="w-full text-xs text-gray-400 hover:text-gray-600"
      >
        キャンセル
      </button>
    </div>
  );
}
