/**
 * 釣果投稿フォーム（captain 用）
 * 便選択 → 写真選択 → テキスト入力 → 送信 → 完了画面
 */

"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { compressImage } from "@/lib/compress-image";

const FishingReportSchema = z.object({
  trip_id: z.string().uuid("便を選択してください"),
  catch_summary: z.string().min(1, "釣果内容を入力してください").max(500),
});

type FishingReportFormData = z.infer<typeof FishingReportSchema>;

interface Trip {
  id: string;
  trip_date: string;
  departure_time: string | null;
  target_species: string | null;
  boats?: { name: string } | null;
}

interface FishingReportFormProps {
  trips: Trip[];
  boatName: string;
}

const MAX_IMAGES = 2;

export function FishingReportForm({ trips }: FishingReportFormProps) {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "compressing" | "uploading" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_CHARS = 500;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FishingReportFormData>({
    resolver: zodResolver(FishingReportSchema),
    defaultValues: {
      trip_id: trips[0]?.id ?? "",
    },
  });

  const catchSummary = watch("catch_summary") ?? "";
  const remaining = MAX_CHARS - catchSummary.length;
  const isLoading = status !== "idle" && status !== "done" && status !== "error";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_IMAGES - imageFiles.length;
    const toAdd = files.slice(0, remaining);
    if (fileInputRef.current) fileInputRef.current.value = "";

    for (const file of toAdd) {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    }
    setImageFiles((prev) => [...prev, ...toAdd]);
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FishingReportFormData) => {
    setErrorMsg("");
    try {
      // 1. 画像圧縮
      let compressed: File[] = [];
      if (imageFiles.length > 0) {
        setStatus("compressing");
        compressed = await Promise.all(imageFiles.map((f) => compressImage(f)));
      }

      // 2. API 経由でサーバーサイドアップロード（RLS 回避）
      const imageUrls: string[] = [];
      if (compressed.length > 0) {
        setStatus("uploading");
        for (const file of compressed) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("trip_id", data.trip_id);
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const json = await res.json();
          if (!res.ok) throw new Error(`アップロード失敗: ${json.error}`);
          imageUrls.push(json.url);
        }
      }

      // 3. API へ送信
      setStatus("sending");
      const res = await fetch("/api/fishing-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, has_vacancy: false, image_urls: imageUrls }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "配信に失敗しました");

      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "エラーが発生しました");
      setStatus("error");
    }
  };

  const handleReset = () => {
    reset();
    setImageFiles([]);
    setPreviews([]);
    setStatus("idle");
    setErrorMsg("");
  };

  // 送信完了画面
  if (status === "done") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-4">
        <div className="text-5xl">🐟</div>
        <p className="text-lg font-bold text-green-800">送信完了しました</p>
        <p className="text-sm text-green-700">
          釣果情報を LINE フォロワーへ配信しました
        </p>
        <Button variant="secondary" onClick={handleReset} className="w-full">
          続けて投稿する
        </Button>
      </div>
    );
  }

  const statusLabel = {
    compressing: "画像を圧縮中...",
    uploading: "画像をアップロード中...",
    sending: "配信中...",
  }[status as "compressing" | "uploading" | "sending"];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">

        {/* 便選択 */}
        <FormField label="① 便を選択" error={errors.trip_id} required>
          <Select {...register("trip_id")} hasError={!!errors.trip_id}>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.trip_date}
                {t.departure_time ? ` ${t.departure_time.slice(0, 5)}〜` : ""}
                {t.boats?.name ? ` ${t.boats.name}` : ""}
                {t.target_species ? ` / ${t.target_species}` : ""}
              </option>
            ))}
          </Select>
        </FormField>

        {/* 写真選択 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            ② 写真を選択
            <span className="text-xs text-gray-400 ml-1">（最大{MAX_IMAGES}枚）</span>
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex gap-2 flex-wrap">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`写真 ${i + 1}`}
                  className="w-24 h-24 object-cover rounded-xl border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
            {imageFiles.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-brand-400 hover:text-brand-400 transition-colors gap-1"
              >
                <span className="text-2xl leading-none">📷</span>
                <span className="text-xs">写真を追加</span>
              </button>
            )}
          </div>
        </div>

        {/* テキスト入力 */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              ③ 釣果内容<span className="text-red-500 ml-1">*</span>
            </label>
            <span className={`text-xs tabular-nums ${remaining <= 50 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
              残り {remaining} 文字
            </span>
          </div>
          <textarea
            {...register("catch_summary")}
            rows={4}
            placeholder="釣行の様子や釣れた魚のサイズや数など、お客さんがワクワクするような内容を記入してください。"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {errors.catch_summary && (
            <p className="text-xs text-red-500">{errors.catch_summary.message}</p>
          )}
        </div>

      </div>

      {/* 送信情報 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-0.5">
        <p className="text-xs text-blue-700">
          📢 投稿すると LINE 公式アカウントの全フォロワーへ通知されます
        </p>
        {imageFiles.length > 0 && (
          <p className="text-xs text-blue-600">
            📷 写真 {imageFiles.length} 枚を送信します
          </p>
        )}
      </div>

      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      <Button
        type="submit"
        loading={isLoading}
        size="lg"
        className="w-full"
        disabled={isLoading}
      >
        {statusLabel ?? "釣果を配信する"}
      </Button>
    </form>
  );
}
