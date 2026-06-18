'use client';

import { useState } from 'react';
import { RotateCcw, CheckCircle } from 'lucide-react';
import type { TasteAnswers } from '@/lib/kaguera';

const QUESTIONS = [
  {
    key: 'mood' as const,
    text: 'どんな雰囲気の部屋にしたいですか？',
    options: ['ナチュラル', 'モダン', 'ミニマル', 'コージー', 'インダストリアル'],
  },
  {
    key: 'budget' as const,
    text: '予算感を教えてください',
    options: ['〜10万', '10〜20万', '20〜30万', '30万〜'],
  },
  {
    key: 'priority' as const,
    text: '一番こだわりたいのは？',
    options: ['ベッド', 'ソファ', '机', 'こだわりなし'],
  },
];

type Props = {
  onChange?: (answers: Partial<TasteAnswers>) => void;
};

export default function TasteQuiz({ onChange }: Props) {
  const [step, setStep] = useState(0); // 0〜2: 質問中、3: 完了
  const [answers, setAnswers] = useState<Partial<TasteAnswers>>({});

  function handleSelect(option: string) {
    const key = QUESTIONS[step].key;
    const next = { ...answers, [key]: option };
    setAnswers(next);
    onChange?.(next);
    setStep((s) => s + 1);
  }

  function reset() {
    setStep(0);
    setAnswers({});
    onChange?.({});
  }

  const isDone = step >= QUESTIONS.length;

  return (
    <div className="kaguera-card flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#1F160E]">好み診断</h2>
        {isDone && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-[#B09070] hover:text-[#E8933A] transition-colors"
          >
            <RotateCcw size={12} />
            やり直す
          </button>
        )}
      </div>

      {!isDone ? (
        <div>
          {/* 進捗 */}
          <div className="flex gap-1 mb-4">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-[#E8933A]' : 'bg-[#F0DFC8]'
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-[#B09070] mb-1">{step + 1} / {QUESTIONS.length}</p>
          <p className="mb-4 text-base font-semibold text-[#1F160E]">
            {QUESTIONS[step].text}
          </p>
          <div className="flex flex-wrap gap-2">
            {QUESTIONS[step].options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className="rounded-full border border-[#D8D0C8] bg-white px-4 py-2 text-sm text-[#1F160E] transition-all hover:-translate-y-0.5 hover:border-[#E8933A] hover:bg-[#FAF6F2] hover:text-[#E8933A] hover:shadow-sm"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#44AA77]">
            <CheckCircle size={18} />
            <span className="text-sm font-bold">診断完了！</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUESTIONS.map((q) => (
              <span
                key={q.key}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EDF5F0] border border-[#B8DECA] rounded-full text-xs font-semibold text-[#2A7A50]"
              >
                {q.text.replace(/[？。]/g, '').slice(0, 8)}：
                {answers[q.key]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
