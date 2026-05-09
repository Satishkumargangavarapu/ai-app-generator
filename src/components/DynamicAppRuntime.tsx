'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Home, Languages } from 'lucide-react';

import { DynamicDashboard } from '@/components/DynamicDashboard';
import { DynamicForm } from '@/components/DynamicForm';
import { DynamicTable } from '@/components/DynamicTable';
import { NotificationCenter } from '@/components/NotificationCenter';
import { getDefaultLocale, getLocales, translate } from '@/lib/i18n';
import type { AppConfig } from '@/lib/config-parser';

export function DynamicAppRuntime({
  appId,
  config,
  path,
}: {
  appId: string;
  config: AppConfig;
  path: string;
}) {
  const locales = useMemo(() => getLocales(config), [config]);
  const [locale, setLocale] = useState(getDefaultLocale(config));
  const localeEntries = Object.keys(locales);
  const activeView = config.views.find((view) => view.path === path) ?? config.views[0];

  return (
    <div className="flex min-h-screen bg-[linear-gradient(135deg,_#f8fafc_0%,_#eef6ff_52%,_#f1f5f9_100%)] text-slate-950">
      <aside className="hidden w-80 flex-col border-r border-slate-200 bg-white p-8 shadow-[12px_0_40px_rgba(15,23,42,0.04)] md:flex">
        <h1 className="mb-10 text-3xl font-extrabold leading-tight text-slate-950">{config.name}</h1>
        <nav className="flex-1 space-y-3">
          {config.views.map((view) => (
            <Link
              key={view.path}
              href={`/${appId}${view.path}`}
              className={`block rounded-xl px-5 py-4 text-base font-bold transition-colors ${
                activeView?.path === view.path
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              {view.title}
            </Link>
          ))}
        </nav>
        <div className="space-y-4 border-t border-slate-200 pt-6">
          {localeEntries.length > 1 && (
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Languages className="h-4 w-4" />
                {translate(config, locale, 'language')}
              </span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-bold text-slate-900"
              >
                {localeEntries.map((localeName) => (
                  <option key={localeName} value={localeName}>
                    {localeName.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-800 hover:text-slate-950">
            <Home className="h-5 w-5" /> {translate(config, locale, 'back_home')}
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
        <header className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:hidden">
          <h1 className="text-2xl font-extrabold text-slate-950">{config.name}</h1>
          <div className="flex items-center gap-3">
            {localeEntries.length > 1 && (
              <select
                aria-label={translate(config, locale, 'language')}
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
                className="min-h-10 rounded-lg border border-slate-300 px-2 font-bold"
              >
                {localeEntries.map((localeName) => (
                  <option key={localeName} value={localeName}>
                    {localeName.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
            <Link href="/" className="rounded-xl bg-slate-100 p-3 text-slate-900">
              <Home className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {activeView ? (
          <div className="mx-auto grid max-w-[1500px] gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-blue-700">
                  {translate(config, locale, 'application_view')}
                </p>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">{activeView.title}</h1>
              </div>
              {activeView.type === 'table' && activeView.model && (
                <div className="space-y-9">
                  <DynamicForm appId={appId} modelName={activeView.model} config={config} locale={locale} />
                  <DynamicTable appId={appId} modelName={activeView.model} config={config} locale={locale} />
                </div>
              )}
              {activeView.type === 'form' && activeView.model && (
                <DynamicForm appId={appId} modelName={activeView.model} config={config} locale={locale} />
              )}
              {activeView.type === 'dashboard' && (
                <DynamicDashboard appId={appId} config={config} view={activeView} />
              )}
            </div>
            <aside className="space-y-8">
              <NotificationCenter appId={appId} config={config} locale={locale} />
            </aside>
          </div>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-lg font-medium text-slate-700">
            No views defined for this application.
          </div>
        )}
      </main>
    </div>
  );
}
