/**
 * 釣果投稿 / お知らせ フォーム（captain 用）
 * プルダウンでモード切替：釣果投稿 or お知らせ
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

const AnnouncementSchema = z.object({
  content: z.string().min(1, "お知らせ内容を入力してください").max(500),
});

type FishingReportFormData = z.infer<typeof FishingReportSchema>;
type AnnouncementFormData = z.infer<typeof AnnouncementSchema>;
type Mode = "fishing_report" | "announcement";
type Status = "idle" | "compressing" | "uploading" | "sending" | "done" | "error";

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
const MAX_CHARS = 500;

export function FishingReportForm({ trips }: FishingReportFormProps) {
  const [mode, setMode] = useState<Mode>("fishing_report");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fishingForm = useForm<FishingReportFormData>({
    resolver: zodResolver(FishingReportSchema),
    defaultValues: { trip_id: trips[0]?.id ?? "" },
  });

  const announcementForm = useForm<AnnouncementFormData>({
    resolver: zodResolver(AnnouncementSchema),
  });

  const fishingContent = fishingForm.watch("catch_summary") ?? "";
  const announcementContent = announcementForm.watch("content") ?? "";
  const activeContent =
    mode === "fishing_report" ? fishingContent : announcementContent;
  const remaining = MAX_CHARS - activeContent.length;
  const isLoading =
    status !== "idle" && status !== "done" && status !== "error";

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setImageFiles([]);
    setPreviews([]);
    setStatus("idle");
    setErrorMsg("");
    fishingForm.reset({ trip_id: trips[0]?.id ?? "" });
    announcementForm.reset();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const rem = MAX_IMAGES - imageFiles.length;
    const toAdd = files.slice(0, rem);
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

  const uploadImages = async (folder: string): Promise<string[]> => {
    if (imageFiles.length === 0) return [];
    setStatus("compressing");
    const compressed = await Promise.all(imageFiles.map((f) => compressImage(f)));
    setStatus("uploading");
    const urls: string[] = [];
    for (const file of compressed) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("trip_id", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(`アップロード失敗: ${json.error}`);
      urls.push(json.url);
    }
    return urls;
  };

  const onSubmitFishing = async (data: FishingReportFormData) => {
    setErrorMsg("");
    try {
      const imageUrls = await uploadImages(data.trip_id);
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

  const onSubmitAnnouncement = async (data: AnnouncementFormData) => {
    setErrorMsg("");
    try {
      const imageUrls = await uploadImages("announcements");
      setStatus("sending");
      const res = await fetch("/api/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: data.content, image_urls: imageUrls }),
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
    setImageFiles([]);
    setPreviews([]);
    setStatus("idle");
    setErrorMsg("");
    fishingForm.reset({ trip_id: trips[0]?.id ?? "" });
    announcementForm.reset();
  };

  if (status === "done") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-4">
        <div className="text-5xl">
          {mode === "fishing_report" ? "🐟" : "📢"}
        </div>
        <p className="text-lg font-bold text-green-800">送信完了しました</p>
        <p className="text-sm text-green-700">
          {mode === "fishing_report" ? "釣果情報" : "お知らせ"}を LINE フォロワーへ配信しました
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

  const imagePicker = (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">
        {mode === "fishing_report" ? "② " : "② "}写真を選択
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
  );

  return (
    <div className="space-y-4">
      {/* モード切替プルダウン */}
      <select
        value={mode}
        onChange={(e) => handleModeChange(e.target.value as Mode)}
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
      >
        <option value="fishing_report">🐟 釣果投稿</option>
        <option value="announcement">📢 お知らせ</option>
      </select>

      {/* 釣果投稿フォーム */}
      {mode === "fishing_report" && (
        <form
          onSubmit={fishingForm.handleSubmit(onSubmitFishing)}
          className="space-y-4"
        >
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <FormField
              label="① 便を選択"
              error={fishingForm.formState.errors.trip_id}
              required
            >
              <Select
                {...fishingForm.register("trip_id")}
                hasError={!!fishingForm.formState.errors.trip_id}
              >
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

            {imagePicker}

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  ③ 釣果内容<span className="text-red-500 ml-1">*</span>
                </label>
                <span
                  className={`text-xs tabular-nums ${
                    remaining <= 50 ? "text-red-500 font-semibold" : "text-gray-400"
                  }`}
                >
                  残り {remaining} 文字
                </span>
              </div>
              <textarea
                {...fishingForm.register("catch_summary")}
                rows={4}
                placeholder="釣行の様子や釣れた魚のサイズや数など、お客さんがワクワクするような内容を記入してください。"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {fishingForm.formState.errors.catch_summary && (
                <p className="text-xs text-red-500">
                  {fishingForm.formState.errors.catch_summary.message}
                </p>
              )}
            </div>
          </div>

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
      )}

      {/* お知らせフォーム */}
      {mode === "announcement" && (
        <form
          onSubmit={announcementForm.handleSubmit(onSubmitAnnouncement)}
          className="space-y-4"
        >
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  ① お知らせ内容<span className="text-red-500 ml-1">*</span>
                </label>
                <span
                  className={`text-xs tabular-nums ${
                    remaining <= 50 ? "text-red-500 font-semibold" : "text-gray-400"
                  }`}
                >
                  残り {remaining} 文字
                </span>
              </div>
              <textarea
                {...announcementForm.register("content")}
                rows={5}
                placeholder="お客様へのお知らせ内容を入力してください。"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {announcementForm.formState.errors.content && (
                <p className="text-xs text-red-500">
                  {announcementForm.formState.errors.content.message}
                </p>
              )}
            </div>

            {imagePicker}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-0.5">
            <p className="text-xs text-blue-700">
              📢 送信すると LINE 公式アカウントの全フォロワーへ通知されます
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
            {statusLabel ?? "お知らせを配信する"}
          </Button>
        </form>
      )}
    </div>
  );
}
