"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

interface Props {
  currentCalendarId: string;
  serviceAccountEmail: string | null;
}

export function GoogleCalendarSettingsForm({ currentCalendarId, serviceAccountEmail }: Props) {
  const [calendarId, setCalendarId] = useState(currentCalendarId);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_calendar_id: calendarId }),
      });
      setResult(res.ok ? "ok" : "error");
    } catch {
      setResult("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h2 className="text-sm font-bold text-gray-700 mb-3">Google カレンダー連携</h2>

      <div className="space-y-3">
        {/* サービスアカウント状態 */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 w-36 shrink-0">サービスアカウント</span>
          {serviceAccountEmail ? (
            <span className="text-green-600 font-medium">✅ 設定済</span>
          ) : (
            <span className="text-orange-500">⚠️ 未設定（管理者に依頼）</span>
          )}
        </div>

        {serviceAccountEmail && (
          <div className="flex items-start gap-2 text-xs">
            <span className="text-gray-500 w-36 shrink-0">アカウント</span>
            <span className="font-mono text-gray-600 break-all">{serviceAccountEmail}</span>
          </div>
        )}

        {/* カレンダー ID 入力 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">
            Google カレンダー ID
          </label>
          <input
            type="text"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            placeholder="xxxxxxxxx@group.calendar.google.com"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-400">
            Google カレンダー → 設定 → カレンダーの統合 → カレンダー ID
          </p>
        </div>

        {/* 共有設定の案内 */}
        {serviceAccountEmail && (
          <div className="bg-blue-50 rounded-xl px-3 py-2.5 text-xs text-blue-700 space-y-1">
            <p className="font-medium">カレンダーの共有設定</p>
            <p>Google カレンダーで対象カレンダーを開き、以下のメールアドレスに「予定の変更権限」を付与してください：</p>
            <p className="font-mono bg-blue-100 px-2 py-1 rounded break-all">{serviceAccountEmail}</p>
          </div>
        )}

        {result === "ok" && (
          <p className="text-xs text-green-600">保存しました</p>
        )}
        {result === "error" && (
          <p className="text-xs text-red-500">保存に失敗しました</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "カレンダー ID を保存"}
        </button>
      </div>
    </Card>
  );
}
