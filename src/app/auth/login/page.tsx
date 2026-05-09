'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Unable to reach the server right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_48%,_#e8f7f4_100%)] px-5 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_28px_80px_rgba(15,23,42,0.12)] sm:p-10">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-blue-700">Workspace Access</p>
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-950">Sign In</h2>
        </div>
        {error && <div className="mb-5 rounded-xl bg-red-50 p-4 font-medium text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-base font-bold text-slate-900">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="min-h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-5 text-lg font-medium text-slate-950 placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-base font-bold text-slate-900">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="min-h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-5 text-lg font-medium text-slate-950 placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
          <button type="submit" disabled={loading} className="min-h-14 w-full rounded-xl bg-blue-700 px-5 text-base font-bold text-white transition-colors hover:bg-blue-800 disabled:bg-blue-400">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-6 text-center text-base font-medium text-slate-700">
          Don&apos;t have an account? <Link href="/auth/register" className="font-bold text-blue-700 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
