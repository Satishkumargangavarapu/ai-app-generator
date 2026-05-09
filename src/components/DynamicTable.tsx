'use client';

import { useCallback, useState, useEffect } from 'react';

import { getModelConfig } from '@/lib/app-utils';
import { translate } from '@/lib/i18n';
import type { AppConfig, FieldConfig } from '@/lib/config-parser';

type DynamicRow = Record<string, string | number | boolean | null> & {
  id: number;
};

type FormValue = string | number | boolean;

function formatCellValue(value: DynamicRow[string]) {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return value.toString();
}

export function DynamicTable({
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
  const [data, setData] = useState<DynamicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingRow, setEditingRow] = useState<DynamicRow | null>(null);
  const [editData, setEditData] = useState<Record<string, FormValue>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const modelDef = getModelConfig(config, modelName);

  const fetchRows = useCallback(async () => {
    const res = await fetch(`/api/apps/${appId}/${modelName}`);
    const json = (await res.json()) as { data?: DynamicRow[]; error?: string };

    if (!res.ok) {
      throw new Error(json.error || 'Unable to load records');
    }

    return json.data ?? [];
  }, [appId, modelName]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await fetchRows();
      setData(rows);
      setError('');
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to load records';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchRows]);

  useEffect(() => {
    let isActive = true;

    async function loadInitialRows() {
      try {
        const res = await fetch(`/api/apps/${appId}/${modelName}`);
        const json = (await res.json()) as { data?: DynamicRow[]; error?: string };

        if (!res.ok) {
          throw new Error(json.error || 'Unable to load records');
        }

        const rows = json.data ?? [];
        if (!isActive) return;
        setData(rows);
        setError('');
      } catch (caughtError) {
        if (!isActive) return;
        const message = caughtError instanceof Error ? caughtError.message : 'Unable to load records';
        setError(message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadInitialRows();

    return () => {
      isActive = false;
    };
  }, [appId, modelName]);

  useEffect(() => {
    const handleRecordChange = (event: Event) => {
      const detail = (event as CustomEvent<{ modelName?: string }>).detail;
      if (!detail?.modelName || detail.modelName === modelName) {
        void loadData();
      }
    };

    window.addEventListener('dynamic-records-changed', handleRecordChange);
    return () => window.removeEventListener('dynamic-records-changed', handleRecordChange);
  }, [appId, loadData, modelName]);

  const handleDelete = async (id: string | number) => {
    try {
      const res = await fetch(`/api/apps/${appId}/${modelName}?id=${id}`, { method: 'DELETE' });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error || 'Unable to delete record');
      }

      setData((currentRows) => currentRows.filter((item) => item.id !== id));
      window.dispatchEvent(new CustomEvent('dynamic-notifications-changed'));
      setError('');
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to delete record';
      setError(message);
    }
  };

  const startEditing = (row: DynamicRow) => {
    const nextData: Record<string, FormValue> = {};
    for (const field of modelDef?.fields ?? []) {
      const value = row[field.name];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        nextData[field.name] = value;
      }
    }
    setEditingRow(row);
    setEditData(nextData);
    setError('');
  };

  const setEditFieldValue = (fieldName: string, value: FormValue | undefined) => {
    setEditData((currentValues) => {
      if (value === undefined) {
        const nextValues = { ...currentValues };
        delete nextValues[fieldName];
        return nextValues;
      }

      return { ...currentValues, [fieldName]: value };
    });
  };

  const handleEditSave = async () => {
    if (!editingRow) return;

    try {
      setSavingEdit(true);
      const res = await fetch(`/api/apps/${appId}/${modelName}?id=${editingRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const json = (await res.json()) as { data?: DynamicRow; error?: string };

      if (!res.ok) {
        throw new Error(json.error || 'Unable to update record');
      }

      await loadData();
      window.dispatchEvent(new CustomEvent('dynamic-notifications-changed'));
      setEditingRow(null);
      setEditData({});
      setError('');
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to update record';
      setError(message);
    } finally {
      setSavingEdit(false);
    }
  };

  const renderEditField = (field: FieldConfig) => {
    const fieldId = `edit-${modelName}-${field.name}`;
    const currentValue = editData[field.name];

    if (field.type === 'boolean') {
      return (
        <label key={field.name} htmlFor={fieldId} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <input
            id={fieldId}
            type="checkbox"
            checked={Boolean(currentValue)}
            onChange={(event) => setEditFieldValue(field.name, event.target.checked)}
            className="h-5 w-5"
          />
          <span className="font-bold text-slate-900">{field.name}</span>
        </label>
      );
    }

    if (field.type === 'text') {
      return (
        <label key={field.name} htmlFor={fieldId} className="space-y-2 lg:col-span-2">
          <span className="block font-bold text-slate-900">{field.name}</span>
          <textarea
            id={fieldId}
            required={field.required}
            className="min-h-28 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-950"
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(event) => setEditFieldValue(field.name, event.target.value || undefined)}
          />
        </label>
      );
    }

    return (
      <label key={field.name} htmlFor={fieldId} className="space-y-2">
        <span className="block font-bold text-slate-900">{field.name}</span>
        <input
          id={fieldId}
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          required={field.required}
          className="min-h-12 w-full rounded-lg border border-slate-300 px-4 text-slate-950"
          value={typeof currentValue === 'string' || typeof currentValue === 'number' ? String(currentValue) : ''}
          onChange={(event) => setEditFieldValue(field.name, event.target.value || undefined)}
        />
      </label>
    );
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const res = await fetch(`/api/apps/${appId}/${modelName}/import`, {
        method: 'POST',
        body: text,
        headers: { 'Content-Type': 'text/csv' },
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(json.error || 'Unable to import CSV');
      }

      await loadData();
      window.dispatchEvent(new CustomEvent('dynamic-notifications-changed'));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to import CSV';
      setError(message);
      setLoading(false);
    } finally {
      event.target.value = '';
    }
  };

  if (!modelDef) {
    return (
      <div className="rounded-xl bg-red-50 p-5 text-base font-medium text-red-700">
        Model &apos;{modelName}&apos; not found in configuration.
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold capitalize text-slate-950">{modelName} {translate(config, locale, 'records')}</h2>
        <div className="flex items-center gap-4">
          <label className="flex min-h-12 cursor-pointer items-center rounded-xl bg-green-700 px-5 text-sm font-bold text-white transition-colors hover:bg-green-800">
            {translate(config, locale, 'import_csv')}
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          </label>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-base font-semibold text-red-700">{error}</div>}

      {loading ? (
        <div className="flex animate-pulse space-x-4"><div className="flex-1 space-y-4 py-1"><div className="h-5 w-3/4 rounded bg-gray-200"></div></div></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full whitespace-nowrap text-left text-base text-slate-900">
            <thead className="border-b-2 border-slate-200 bg-slate-100 uppercase tracking-wider text-slate-800">
              <tr>
                <th className="px-7 py-4 text-sm font-bold">ID</th>
                {modelDef.fields.map((field) => (
                  <th key={field.name} className="px-7 py-4 text-sm font-bold text-slate-900">{field.name}</th>
                ))}
                <th className="px-7 py-4 text-right text-sm font-bold text-slate-900">{translate(config, locale, 'actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-7 py-5 font-semibold text-slate-950">{row.id}</td>
                  {modelDef.fields.map((field) => (
                    <td key={field.name} className="px-7 py-5 font-medium text-slate-900">{formatCellValue(row[field.name])}</td>
                  ))}
                  <td className="px-7 py-5 text-right">
                    <div className="flex justify-end gap-4">
                      <button onClick={() => startEditing(row)} className="text-sm font-bold text-blue-700 transition-colors hover:text-blue-800">
                        {translate(config, locale, 'edit')}
                      </button>
                      <button onClick={() => handleDelete(row.id)} className="text-sm font-bold text-red-700 transition-colors hover:text-red-800">
                        {translate(config, locale, 'delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={modelDef.fields.length + 2} className="px-7 py-12 text-center font-medium text-slate-600">
                    {translate(config, locale, 'no_records')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h3 className="text-2xl font-black text-slate-950">
                {translate(config, locale, 'edit')} {modelName} #{editingRow.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-800"
              >
                {translate(config, locale, 'cancel')}
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {modelDef.fields.map(renderEditField)}
            </div>
            <button
              type="button"
              onClick={handleEditSave}
              disabled={savingEdit}
              className="mt-6 min-h-12 w-full rounded-xl bg-blue-700 px-5 font-bold text-white disabled:bg-blue-400"
            >
              {savingEdit ? translate(config, locale, 'saving') : translate(config, locale, 'update')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
