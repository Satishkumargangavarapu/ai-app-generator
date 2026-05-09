'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

import { translate } from '@/lib/i18n';
import type { AppConfig } from '@/lib/config-parser';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  read_at: string | null;
  mock_email_sent: boolean;
  created_at: string;
};

export function NotificationCenter({
  appId,
  config,
  locale,
}: {
  appId: string;
  config: AppConfig;
  locale: string;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    if (!config.notifications?.enabled) {
      return;
    }

    try {
      const res = await fetch(`/api/apps/${appId}/notifications`);
      const json = (await res.json()) as { notifications?: NotificationItem[]; error?: string };

      if (!res.ok) {
        throw new Error(json.error || 'Unable to load notifications');
      }

      setItems(json.notifications ?? []);
      setError('');
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to load notifications';
      setError(message);
    }
  }, [appId, config.notifications?.enabled]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadNotifications(), 0);

    const handleChange = () => void loadNotifications();
    window.addEventListener('dynamic-notifications-changed', handleChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('dynamic-notifications-changed', handleChange);
    };
  }, [loadNotifications]);

  if (!config.notifications?.enabled) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <Bell className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-black text-slate-950">{translate(config, locale, 'notifications')}</h2>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      {items.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-4 text-sm font-medium text-slate-600">
          {translate(config, locale, 'no_notifications')}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 5).map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{item.message}</p>
                </div>
                {item.mock_email_sent && (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold uppercase text-emerald-800">
                    Email
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
