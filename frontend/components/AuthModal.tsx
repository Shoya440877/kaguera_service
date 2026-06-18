'use client';

import { useState } from 'react';
import { X, LogIn, UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isAuthModalOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      const result = login(email, password);
      if (!result.ok) setError(result.error || 'ログインに失敗しました');
    } else {
      if (!name.trim()) { setError('名前を入力してください'); return; }
      if (!email.trim()) { setError('メールアドレスを入力してください'); return; }
      if (password.length < 4) { setError('パスワードは4文字以上で入力してください'); return; }
      const result = register(name.trim(), email.trim(), password);
      if (!result.ok) setError(result.error || '登録に失敗しました');
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeAuthModal}
      />

      <div className="relative w-full max-w-md rounded-3xl border border-[#F0DFC8] bg-white p-8 shadow-2xl">
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute right-4 top-4 rounded-full p-2 text-[#7A6A5A] transition-colors hover:bg-[#FFF5EB] hover:text-[#1F160E]"
          aria-label="閉じる"
        >
          <X size={20} />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF5EB]">
            {mode === 'login' ? (
              <LogIn size={24} className="text-[#E8933A]" />
            ) : (
              <UserPlus size={24} className="text-[#E8933A]" />
            )}
          </div>
          <h2 className="text-xl font-bold text-[#1F160E]">
            {mode === 'login' ? 'ログイン' : 'アカウント登録'}
          </h2>
          <p className="mt-1 text-sm text-[#7A6A5A]">
            {mode === 'login'
              ? 'メールアドレスとパスワードでログイン'
              : '新しいアカウントを作成'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1F160E]">
                名前
              </label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B09070]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="山田 太郎"
                  className="w-full rounded-xl border border-[#F0DFC8] bg-white py-3 pl-10 pr-4 text-sm text-[#1F160E] outline-none transition-all focus:border-[#E8933A] focus:shadow-[0_0_0_3px_rgba(232,147,58,0.1)]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#1F160E]">
              メールアドレス
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B09070]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@kaguera.jp"
                className="w-full rounded-xl border border-[#F0DFC8] bg-white py-3 pl-10 pr-4 text-sm text-[#1F160E] outline-none transition-all focus:border-[#E8933A] focus:shadow-[0_0_0_3px_rgba(232,147,58,0.1)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#1F160E]">
              パスワード
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B09070]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '4文字以上' : '••••••••'}
                className="w-full rounded-xl border border-[#F0DFC8] bg-white py-3 pl-10 pr-4 text-sm text-[#1F160E] outline-none transition-all focus:border-[#E8933A] focus:shadow-[0_0_0_3px_rgba(232,147,58,0.1)]"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 w-full rounded-xl bg-[#E8933A] py-3.5 text-sm font-bold text-white transition-all hover:bg-[#D47B1F] hover:shadow-md"
          >
            {mode === 'login' ? 'ログイン' : 'アカウントを作成'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={switchMode}
            className="text-sm text-[#7A6A5A] transition-colors hover:text-[#E8933A]"
          >
            {mode === 'login' ? (
              <>アカウントをお持ちでない方は<span className="font-semibold text-[#E8933A]">新規登録</span></>
            ) : (
              <>既にアカウントをお持ちの方は<span className="font-semibold text-[#E8933A]">ログイン</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
