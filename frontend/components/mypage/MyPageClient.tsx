'use client';

import { useState } from 'react';
import TasteQuiz from '@/components/mypage/TasteQuiz';
import RoomUpload from '@/components/mypage/RoomUpload';
import RoomPlannerSection from '@/components/mypage/RoomPlannerSection';
import type { RoomProfile, TasteAnswers } from '@/lib/kaguera';

export default function MyPageClient() {
  const [tasteAnswers, setTasteAnswers] = useState<Partial<TasteAnswers>>({});
  const [roomProfile, setRoomProfile] = useState<RoomProfile | null>(null);

  return (
    <main className="kaguera-shell flex flex-col gap-6 py-8 sm:py-10">
      <div className="kaguera-card-soft p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E8933A]">
          My Room Planner
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#1F160E]">マイページ</h1>
        <p className="mt-2 text-sm text-[#B09070]">
          好み診断と部屋情報をもとに、AIレコメンドとレイアウト確認をまとめて進められます。
        </p>
      </div>

      <TasteQuiz onChange={setTasteAnswers} />
      <RoomUpload onAnalysisChange={setRoomProfile} />
      <RoomPlannerSection tasteAnswers={tasteAnswers} roomProfile={roomProfile} />
    </main>
  );
}
