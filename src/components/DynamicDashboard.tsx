'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, Database } from 'lucide-react';

import { getModelConfig } from '@/lib/app-utils';
import type { AppConfig, ViewConfig } from '@/lib/config-parser';

type DynamicRow = Record<string, string | number | boolean | null> & {
  id: number;
};

function formatValue(value: DynamicRow[string]) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

export function DynamicDashboard({
  appId,
  config,
  view,
}: {
  appId: string;
  config: AppConfig;
  view: ViewConfig;
}) {
  const modelName = view.model ?? Object.keys(config.models)[0];
  const modelDef = getModelConfig(config, modelName);
  const [rows, setRows] = useState<DynamicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const widgets = useMemo(
    () =>
      view.widgets && view.widgets.length > 0
        ? view.widgets
        : [
            { type: 'count', model: modelName, title: `${modelName} Count` },
            { type: 'recent', model: modelName, title: `Recent ${modelName}` },
          ],
    [modelName, view.widgets]
  );

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/apps/${appId}/${modelName}`);
      const json = (await res.json()) as { data?: DynamicRow[]; error?: string };

      if (!res.ok) {
        throw new Error(json.error || 'Unable to load dashboard data');
      }

      setRows(json.data ?? []);
      setError('');
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to load dashboard data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [appId, modelName]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRows(), 0);

    const handleChange = () => void loadRows();
    window.addEventListener('dynamic-records-changed', handleChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('dynamic-records-changed', handleChange);
    };
  }, [loadRows]);

  if (!modelDef) {
    return (
      <div className="rounded-xl bg-red-50 p-5 text-base font-medium text-red-700">
        Model &apos;{modelName}&apos; not found in configuration.
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl bg-red-50 p-5 text-base font-semibold text-red-700">{error}</div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {widgets.map((widget, index) => {
        const widgetType = typeof widget.type === 'string' ? widget.type : 'count';
        const title = typeof widget.title === 'string' ? widget.title : `${modelName} Widget`;

        if (widgetType === 'recent') {
          return (
            <section key={`${widgetType}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm xl:col-span-2">
              <div className="mb-5 flex items-center gap-3">
                <Clock3 className="h-6 w-6 text-blue-700" />
                <h2 className="text-2xl font-black text-slate-950">{title}</h2>
              </div>
              {loading ? (
                <p className="font-medium text-slate-600">Loading dashboard...</p>
              ) : rows.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-5 font-medium text-slate-600">No records yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-left">
                    <thead className="bg-slate-100">
                      <tr>
                        {modelDef.fields.slice(0, 4).map((field) => (
                          <th key={field.name} className="px-5 py-3 text-sm font-bold uppercase text-slate-800">
                            {field.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row) => (
                        <tr key={row.id} className="border-t border-slate-200">
                          {modelDef.fields.slice(0, 4).map((field) => (
                            <td key={field.name} className="px-5 py-4 font-medium text-slate-900">
                              {formatValue(row[field.name])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        }

        return (
          <section key={`${widgetType}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
              {widgetType === 'fieldBreakdown' ? <BarChart3 className="h-7 w-7" /> : <Database className="h-7 w-7" />}
            </div>
            <p className="text-base font-bold text-slate-600">{title}</p>
            <p className="mt-4 text-5xl font-black text-slate-950">{loading ? '--' : rows.length}</p>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Live count from the generated {modelName} API.
            </p>
          </section>
        );
      })}
    </div>
  );
}
