'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { RoomProfile } from '@/lib/kaguera';

type Status = 'idle' | 'loading' | 'done' | 'error';

type AnalyzeRoomResult = {
  roomType?: string;
  areaTatami?: number;
  area?: number;
  size?: string;
  shape?: string;
  window?: string;
  windowDirection?: string;
  notes?: string;
};

const RESULT_LABELS: Record<keyof RoomProfile, string> = {
  roomType: '部屋タイプ',
  sizeLabel: '広さ',
  shape: '形状',
  windowDirection: '窓',
  area: '面積',
  notes: '備考',
};

function normalizeRoomProfile(raw: AnalyzeRoomResult): RoomProfile {
  const area = raw.area ?? (typeof raw.areaTatami === 'number' ? Number((raw.areaTatami * 1.65).toFixed(1)) : 9.9);
  const sizeLabel = raw.size ?? (typeof raw.areaTatami === 'number' ? `${raw.areaTatami}畳` : '6畳');

  return {
    roomType: raw.roomType ?? '1K',
    sizeLabel,
    shape: raw.shape ?? '長方形',
    windowDirection: raw.windowDirection ?? raw.window ?? '南側',
    area,
    notes: raw.notes,
  };
}

type Props = {
  onAnalysisChange?: (profile: RoomProfile | null) => void;
};

export default function RoomUpload({ onAnalysisChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>('image/jpeg');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<RoomProfile | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaType(file.type || 'image/jpeg');
    setResult(null);
    setStatus('idle');
    onAnalysisChange?.(null);

    // プレビュー用
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // base64変換
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // "data:image/jpeg;base64,XXXX" → "XXXX" だけ取り出す
      const base64 = dataUrl.split(',')[1] ?? '';
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!imageBase64) return;
    setStatus('loading');
    setResult(null);

    try {
      const res = await fetch('/api/analyze-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mediaType }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error('API error');
      const normalized = normalizeRoomProfile(data.result as AnalyzeRoomResult);
      setResult(normalized);
      onAnalysisChange?.(normalized);
      setIsFallback(data.fallback ?? false);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="kaguera-card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold text-[#1F160E]">部屋の登録</h2>

      <div
        onClick={() => inputRef.current?.click()}
        className={`relative flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-all ${
          previewUrl
            ? 'border-[#E8933A] bg-[#FAF6F2] shadow-sm'
            : 'border-[#D8D0C8] bg-[#FFF8F0] hover:border-[#E8933A] hover:bg-[#FAF6F2]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {previewUrl ? (
          <div className="relative w-full h-40 rounded-lg overflow-hidden">
            <Image src={previewUrl} alt="間取りプレビュー" fill className="object-contain" />
          </div>
        ) : (
          <>
            <Upload size={28} className="text-[#E8933A]" />
            <p className="text-sm font-medium text-[#3D3020]">間取り画像をアップロード</p>
            <p className="text-xs text-[#B09070]">PNG / JPG / HEIC など</p>
          </>
        )}
      </div>

      {imageBase64 && status !== 'done' && (
        <button
          onClick={handleAnalyze}
          disabled={status === 'loading'}
          className="kaguera-button-primary w-full"
        >
          {status === 'loading' ? (
            <><Loader2 size={16} className="animate-spin" />解析中…</>
          ) : (
            'AIで解析する'
          )}
        </button>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={15} />
          解析に失敗しました。もう一度お試しください。
        </div>
      )}

      {status === 'done' && result && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-[#44AA77] font-bold">
            <CheckCircle size={15} />
            解析完了
            {isFallback && (
              <span className="text-xs text-[#B09070] font-normal ml-1">
                （フォールバック値）
              </span>
            )}
          </div>
          <div className="bg-[#FAF6F2] rounded-xl border border-[#F0DFC8] overflow-hidden text-sm">
            {(Object.entries(result).filter(([, value]) => value !== undefined && value !== '') as [keyof RoomProfile, string | number][]).map(([key, value]) => (
              <div key={key} className="flex border-b border-[#F0DFC8] last:border-b-0">
                <span className="w-28 shrink-0 px-4 py-2 bg-white text-[#E8933A] font-semibold">
                  {RESULT_LABELS[key]}
                </span>
                <span className="px-4 py-2 text-[#1F160E]">
                  {key === 'area' ? `${value} ㎡` : String(value)}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setPreviewUrl(null);
              setImageBase64(null);
              setResult(null);
              setStatus('idle');
              onAnalysisChange?.(null);
            }}
            className="text-xs text-[#B09070] hover:text-[#E8933A] underline text-center"
          >
            別の画像をアップロード
          </button>
        </div>
      )}
    </div>
  );
}
