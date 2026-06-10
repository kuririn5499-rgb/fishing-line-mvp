"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Tag = { id: string; tag_type: "method" | "location"; name: string };

export default function FishingTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMethod, setNewMethod] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = async () => {
    const res = await fetch("/api/captain/fishing-tags");
    const json = await res.json();
    setTags(json.tags ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const addTag = async (tag_type: "method" | "location", name: string, clear: () => void) => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/captain/fishing-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag_type, name: name.trim() }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "エラー"); }
    else { setTags((prev) => [...prev, json.tag]); clear(); }
    setSaving(false);
  };

  const deleteTag = async (id: string) => {
    await fetch(`/api/captain/fishing-tags/${id}`, { method: "DELETE" });
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  const methods   = tags.filter((t) => t.tag_type === "method");
  const locations = tags.filter((t) => t.tag_type === "location");

  if (loading) return <div className="p-4 text-sm text-gray-400">読み込み中...</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-gray-800">プラン・場所タグ管理</h1>
      <p className="text-xs text-gray-500">便作成時に選択肢として表示され、統計の集客セグメントにも使用されます。</p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* 釣り方 */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-2">プラン</h2>
        <Card className="space-y-2">
          <div className="flex gap-2">
            <input
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="例：ジギング・タイラバなど"
              value={newMethod}
              onChange={(e) => setNewMethod(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("method", newMethod, () => setNewMethod("")))}
            />
            <button
              onClick={() => addTag("method", newMethod, () => setNewMethod(""))}
              disabled={saving || !newMethod.trim()}
              className="px-3 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg disabled:opacity-40"
            >
              追加
            </button>
          </div>
          {methods.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">タグがありません</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {methods.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  {t.name}
                  <button onClick={() => deleteTag(t.id)} className="text-sky-400 hover:text-red-500 ml-0.5 leading-none">×</button>
                </span>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* 場所 */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-2">場所</h2>
        <Card className="space-y-2">
          <div className="flex gap-2">
            <input
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="例：近海、アジ曽根、沖合"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("location", newLocation, () => setNewLocation("")))}
            />
            <button
              onClick={() => addTag("location", newLocation, () => setNewLocation(""))}
              disabled={saving || !newLocation.trim()}
              className="px-3 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg disabled:opacity-40"
            >
              追加
            </button>
          </div>
          {locations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">タグがありません</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {locations.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  {t.name}
                  <button onClick={() => deleteTag(t.id)} className="text-green-400 hover:text-red-500 ml-0.5 leading-none">×</button>
                </span>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
