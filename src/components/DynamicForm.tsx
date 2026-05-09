'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { getModelConfig } from '@/lib/app-utils';
import { translate } from '@/lib/i18n';
import type { AppConfig, FieldConfig } from '@/lib/config-parser';

type FormValue = string | number | boolean;

function formatLabel(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getInitialValue(field: FieldConfig): FormValue | undefined {
  if (field.type === 'boolean') {
    return false;
  }

  return undefined;
}

export function DynamicForm({
  appId,
  modelName,
  config,
  locale,
}: {
  appId: string;
  modelName: string;
  config: AppConfig;
  locale: string;
}) {
  const [formData, setFormData] = useState<Record<string, FormValue>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const modelDef = getModelConfig(config, modelName);

  const setFieldValue = (fieldName: string, value: FormValue | undefined) => {
    setFormData((currentValues) => {
      if (value === undefined) {
        const nextValues = { ...currentValues };
        delete nextValues[fieldName];
        return nextValues;
      }

      return { ...currentValues, [fieldName]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/apps/${appId}/${modelName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'Unable to save record');
      }

      setFormData({});
      window.dispatchEvent(new CustomEvent('dynamic-records-changed', { detail: { modelName } }));
      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to save record';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!modelDef) {
    return <div className="rounded-xl bg-red-50 p-5 text-base font-medium text-red-700">Model &apos;{modelName}&apos; not found.</div>;
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-3xl font-bold capitalize text-slate-950">
        {translate(config, locale, 'add_record')} {modelName}
      </h2>
      {error && <div className="rounded-xl bg-red-50 p-4 text-base font-semibold text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-2">
        {modelDef.fields.map((field) => {
          const fieldId = `${modelName}-${field.name}`;
          const currentValue = formData[field.name] ?? getInitialValue(field);

          if (field.type === 'boolean') {
            return (
              <label
                key={field.name}
                htmlFor={fieldId}
                className="flex min-h-20 items-center gap-4 rounded-xl border-2 border-slate-300 bg-slate-100 px-5 py-4 shadow-sm"
              >
                <input
                  id={fieldId}
                  type="checkbox"
                  checked={Boolean(currentValue)}
                  onChange={(event) => setFieldValue(field.name, event.target.checked)}
                  className="h-6 w-6 rounded border-slate-500 text-blue-700 focus:ring-2 focus:ring-blue-600"
                />
                <span className="flex flex-col">
                  <span className="text-xl font-bold text-slate-950">
                    {formatLabel(field.name)}
                  </span>
                  <span className="text-sm font-medium text-slate-700">Check to enable this option.</span>
                </span>
              </label>
            );
          }

          if (field.type === 'text') {
            return (
              <div key={field.name} className="space-y-2 lg:col-span-2">
                <label htmlFor={fieldId} className="block text-base font-bold text-slate-950">
                  {formatLabel(field.name)}
                </label>
                <textarea
                  id={fieldId}
                  required={field.required}
                  className="min-h-36 w-full rounded-xl border-2 border-slate-300 bg-white px-5 py-4 text-lg font-medium text-slate-950 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  value={typeof currentValue === 'string' ? currentValue : ''}
                  onChange={(event) => setFieldValue(field.name, event.target.value || undefined)}
                />
              </div>
            );
          }

          return (
            <div key={field.name} className="space-y-2">
              <label htmlFor={fieldId} className="block text-base font-bold text-slate-950">
                {formatLabel(field.name)}
              </label>
              <input
                id={fieldId}
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                required={field.required}
                className="min-h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-5 text-lg font-medium text-slate-950 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                value={typeof currentValue === 'string' || typeof currentValue === 'number' ? String(currentValue) : ''}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setFieldValue(field.name, nextValue === '' ? undefined : nextValue);
                }}
              />
            </div>
          );
        })}
        <button
          type="submit"
          disabled={loading}
          className="min-h-14 w-full rounded-xl bg-blue-700 px-5 text-base font-bold text-white transition-colors hover:bg-blue-800 disabled:bg-blue-400 lg:col-span-2"
        >
          {loading ? translate(config, locale, 'saving') : translate(config, locale, 'save')}
        </button>
      </form>
    </div>
  );
}
