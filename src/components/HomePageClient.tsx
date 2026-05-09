'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  FolderKanban,
  LayoutDashboard,
  PlusCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

type AppSummary = {
  id: string;
  name: string;
};

export type HomeAuthUser = {
  id: number;
  email: string;
};

const sampleConfig = `{
  "name": "Employee Directory",
  "auth": {
    "required": true
  },
  "localization": {
    "defaultLocale": "en",
    "locales": {
      "en": {
        "save": "Save",
        "update": "Update",
        "import_csv": "Import CSV",
        "notifications": "Notifications"
      },
      "hi": {
        "save": "सेव करें",
        "update": "अपडेट करें",
        "import_csv": "CSV आयात करें",
        "notifications": "सूचनाएं",
        "language": "भाषा"
      }
    }
  },
  "notifications": {
    "enabled": true,
    "events": ["record.created", "record.updated", "record.deleted", "csv.imported"],
    "mockEmail": true
  },
  "models": {
    "employees": {
      "name": "employees",
      "fields": [
        { "name": "name", "type": "string", "required": true },
        { "name": "department", "type": "string" },
        { "name": "start_date", "type": "date" },
        { "name": "is_active", "type": "boolean" },
        { "name": "salary", "type": "number" }
      ]
    }
  },
  "views": [
    {
      "type": "dashboard",
      "model": "employees",
      "title": "Employee Dashboard",
      "path": "/",
      "widgets": [
        { "type": "count", "title": "Total Employees" },
        { "type": "recent", "title": "Recent Employees" }
      ]
    },
    { "type": "table", "model": "employees", "title": "Employees", "path": "/employees" }
  ]
}`;

export function HomePageClient({ initialUser }: { initialUser: HomeAuthUser | null }) {
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [user, setUser] = useState<HomeAuthUser | null>(initialUser);
  const [configJson, setConfigJson] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(initialUser !== null);
  const [submitting, setSubmitting] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const fetchApps = async () => {
    const res = await fetch('/api/apps');
    const data = (await res.json()) as { apps?: AppSummary[]; error?: string };

    if (!res.ok) {
      throw new Error(data.error || 'Failed to load apps');
    }

    return data.apps ?? [];
  };

  useEffect(() => {
    if (!initialUser) {
      return;
    }

    let isActive = true;

    async function loadDashboardData() {
      try {
        const loadedApps = await fetchApps();
        if (!isActive) return;
        setApps(loadedApps);
        setUser(initialUser);
        setError('');
      } catch (fetchError) {
        if (!isActive) return;
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load apps';
        setError(message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      isActive = false;
    };
  }, [initialUser]);

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      const res = await fetch('/api/auth/logout', { method: 'POST' });

      if (!res.ok) {
        throw new Error('Unable to log out');
      }

      setUser(null);
      setApps([]);
      setConfigJson('');
      setError('');
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to log out';
      setError(message);
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const parsed = JSON.parse(configJson);
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: parsed }),
      });
      const data = (await res.json()) as { app?: AppSummary; error?: string };

      if (res.ok) {
        setApps((currentApps) => (data.app ? [data.app, ...currentApps] : currentApps));
        setConfigJson('');
        setError('');
      } else {
        setError(data.error || 'Failed to create app');
      }
    } catch (caughtError) {
      const message = caughtError instanceof SyntaxError ? 'Invalid JSON' : 'Unable to create application';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalApps = apps.length;
  const starterMode = user ? 'Signed-in workspace' : 'Guest workspace';
  const latestApp = apps[0];

  if (!user) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_42%,_#e8f7f4_100%)] p-5 font-sans text-slate-950 sm:p-8 lg:p-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center">
          <section className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_34px_90px_rgba(15,23,42,0.12)]">
            <div className="grid min-h-[680px] gap-0 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="flex flex-col justify-center space-y-8 p-8 sm:p-12 lg:p-16">
                <p className="text-sm font-black uppercase tracking-[0.24em] text-blue-700">
                  Welcome
                </p>
                <h1 className="max-w-3xl text-5xl font-black leading-[1.03] tracking-tight text-slate-950 md:text-6xl lg:text-7xl">
                  Build AI-powered apps from structured JSON.
                </h1>
                <p className="max-w-2xl text-lg font-medium leading-8 text-slate-700 md:text-xl">
                  Start with a simple introduction page, then sign in to enter your dashboard,
                  generate apps, and manage your workspace.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    href="/auth/login"
                    className="inline-flex min-h-14 items-center justify-center rounded-xl bg-slate-950 px-8 text-base font-black text-white shadow-lg shadow-slate-950/15 transition-colors hover:bg-slate-800"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="inline-flex min-h-14 items-center justify-center rounded-xl border border-slate-300 bg-white px-8 text-base font-black text-slate-900 transition-colors hover:border-blue-300 hover:bg-blue-50"
                  >
                    Register
                  </Link>
                </div>
              </div>

              <div className="flex items-center bg-slate-950 p-8 text-white sm:p-12 lg:p-14">
                <div className="w-full space-y-6 rounded-2xl border border-white/10 bg-white/5 p-7">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">
                    What You Get
                  </p>
                  <div className="space-y-5">
                    <div className="rounded-xl bg-white/10 p-6">
                      <p className="text-xl font-black text-white">Dashboard Access</p>
                      <p className="mt-3 text-base font-medium leading-7 text-slate-300">
                        Signed-in users land on a full workspace dashboard after login.
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-6">
                      <p className="text-xl font-black text-white">App Generator</p>
                      <p className="mt-3 text-base font-medium leading-7 text-slate-300">
                        Create structured apps, dynamic forms, and data views from JSON.
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-6">
                      <p className="text-xl font-black text-white">Protected Workspace</p>
                      <p className="mt-3 text-base font-medium leading-7 text-slate-300">
                        Authentication keeps personal app workflows tied to your session.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_45%,_#e8f7f4_100%)] p-5 font-sans text-slate-950 sm:p-8 lg:p-10">
      <div className="mx-auto max-w-[1500px] space-y-9">
        <header className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-blue-700">
              Workspace Dashboard
            </p>
            <h1 className="text-5xl font-black tracking-tight text-slate-950 md:text-6xl">
              AI App Generator
            </h1>
            <p className="mt-4 max-w-4xl text-lg font-medium leading-8 text-slate-700">
              Launch, shape, and manage generated apps from one place. Start with a template,
              review your recent apps, and keep your signed-in workspace organized.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signed in</p>
              <p className="text-base font-bold text-slate-900">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading}
              className="min-h-11 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-400"
            >
              {logoutLoading ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </header>

        <main className="space-y-8">
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                <LayoutDashboard className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-slate-600">Total Apps</p>
              <p className="mt-3 text-4xl font-black text-slate-950">{loading ? '--' : totalApps}</p>
              <p className="mt-3 text-base leading-7 text-slate-600">All generated workspaces available from this dashboard.</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-slate-600">Workspace Mode</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{starterMode}</p>
              <p className="mt-3 text-base leading-7 text-slate-600">
                {user ? 'You can create protected apps tied to your session.' : 'Sign in to keep apps associated with your account.'}
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
                <Sparkles className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-slate-600">Starter Template</p>
              <p className="mt-3 text-3xl font-black text-slate-950">Employee Directory</p>
              <p className="mt-3 text-base leading-7 text-slate-600">Use the built-in sample to create a table app in one click.</p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <FolderKanban className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-slate-600">Latest App</p>
              <p className="mt-3 text-3xl font-black text-slate-950">
                {loading ? '--' : latestApp ? latestApp.name : 'None yet'}
              </p>
              <p className="mt-3 text-base leading-7 text-slate-600">
                {latestApp ? `Open ${latestApp.id} from the recent apps panel.` : 'Create your first app to populate this space.'}
              </p>
            </article>
          </section>

          <section className="grid gap-9 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-8">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
                <div className="grid gap-9 p-8 md:grid-cols-[1.08fr_0.92fr] lg:p-10">
                  <div className="space-y-6">
                    <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">Launch Pad</p>
                    <h2 className="max-w-2xl text-4xl font-black leading-tight md:text-5xl">
                      Start every session from a dashboard instead of a plain form.
                    </h2>
                    <p className="max-w-2xl text-lg font-medium leading-8 text-slate-300">
                      Review recent apps, load a starter template, and create a new app from structured
                      JSON without leaving the control center.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setConfigJson(sampleConfig)}
                        className="inline-flex min-h-13 items-center gap-2 rounded-xl bg-cyan-400 px-6 text-base font-black text-slate-950 transition-colors hover:bg-cyan-300"
                      >
                        <PlusCircle className="h-5 w-5" />
                        Load sample dashboard app
                      </button>
                      {latestApp && (
                        <Link
                          href={`/${latestApp.id}`}
                          className="inline-flex min-h-13 items-center gap-2 rounded-xl border border-slate-700 px-6 text-base font-bold text-white transition-colors hover:border-slate-500 hover:bg-slate-900"
                        >
                          Open latest app
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-[1.5rem] border border-slate-800 bg-white/5 p-5">
                    <div className="rounded-xl bg-white/10 p-6">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">Quick Workflow</p>
                      <ol className="mt-4 space-y-4 text-base font-medium leading-7 text-slate-200">
                        <li>1. Load the sample config or paste your own JSON schema.</li>
                        <li>2. Generate the app and open it from Recent Apps.</li>
                        <li>3. Manage records, auth, and imports from the generated runtime.</li>
                      </ol>
                    </div>
                    <div className="rounded-xl bg-white/10 p-6">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-200">Current Session</p>
                      <p className="mt-4 text-xl font-black text-white">{user ? user.email : 'Guest mode active'}</p>
                      <p className="mt-3 text-base leading-7 text-slate-300">
                        {user ? 'Your profile is connected and ready for protected apps.' : 'Create public apps now or sign in for a personal workspace.'}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Create App</p>
                    <h2 className="mt-2 text-3xl font-black text-slate-950">Generator Workspace</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfigJson(sampleConfig)}
                    className="min-h-11 rounded-lg bg-blue-100 px-5 text-sm font-bold text-blue-800 transition-colors hover:bg-blue-200"
                  >
                    Use sample
                  </button>
                </div>
                <p className="text-base font-medium text-slate-600">
                  {user ? `Create apps as ${user.email}.` : 'Paste your structured JSON configuration below.'}
                </p>
                {error && <div className="rounded-xl bg-red-50 p-4 text-base font-semibold text-red-700">{error}</div>}
                <textarea
                  className="h-[430px] w-full resize-none rounded-xl border-2 border-slate-200 bg-slate-950 p-6 font-mono text-base font-medium leading-7 text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder={sampleConfig}
                  value={configJson}
                  onChange={(event) => setConfigJson(event.target.value)}
                />
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="min-h-14 w-full rounded-xl bg-blue-700 px-5 text-base font-black text-white transition-all hover:bg-blue-800 active:scale-[0.99] disabled:bg-blue-400"
                >
                  {submitting ? 'Creating dashboard app...' : 'Generate Application'}
                </button>
              </section>
            </div>

            <div className="space-y-8">
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Recent Apps</p>
                    <h2 className="mt-2 text-3xl font-black text-slate-950">Generated Apps</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                    {loading ? 'Loading' : `${totalApps} total`}
                  </span>
                </div>
                {loading ? (
                  <p className="text-base font-medium text-slate-600">Loading applications...</p>
                ) : apps.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-base font-medium leading-7 text-slate-600">
                    No apps generated yet. Load the sample and create your first dashboard app.
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {apps.map((app) => (
                      <li
                        key={app.id}
                        className="group rounded-xl border border-slate-200 bg-slate-50/70 p-5 transition-colors hover:border-blue-300 hover:bg-white"
                      >
                        <div className="space-y-3">
                          <div>
                            <h3 className="text-lg font-bold text-slate-950 group-hover:text-blue-700">{app.name}</h3>
                            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                              App ID: {app.id}
                            </p>
                          </div>
                          <Link
                            href={`/${app.id}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                          >
                            Launch View
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Quick Notes</p>
                <div className="space-y-3 rounded-xl bg-slate-50 p-5">
                  <p className="text-base font-semibold text-slate-900">What this dashboard is for</p>
                  <p className="text-base font-medium leading-7 text-slate-600">
                    This home screen is now the control center for your app generator. It gives you
                    visibility, quick starts, and recent app access before you dive into any single app.
                  </p>
                </div>
                <div className="space-y-3 rounded-xl bg-blue-50 p-5">
                  <p className="text-base font-semibold text-blue-950">Recommended next step</p>
                  <p className="text-base font-medium leading-7 text-blue-900">
                    Load the sample dashboard app, generate it, and open the latest app from the recent list.
                  </p>
                </div>
              </section>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
