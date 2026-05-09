import Papa from 'papaparse';
import { z } from 'zod';

import type { AppConfig, FieldConfig, ModelConfig } from '@/lib/config-parser';

export function deriveAppId(name: string, overrideId?: string): string {
  const candidate = (overrideId ?? name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return candidate || 'app';
}

export function getModelConfig(config: AppConfig, modelName: string): ModelConfig | null {
  return config.models?.[modelName] ?? null;
}

function coerceFieldValue(field: FieldConfig, value: unknown): string | number | boolean | undefined {
  if (value === undefined || value === null) {
    if (field.required) {
      throw new Error(`Field "${field.name}" is required.`);
    }

    return undefined;
  }

  if (typeof value === 'string' && value.trim() === '') {
    if (field.required) {
      throw new Error(`Field "${field.name}" is required.`);
    }

    return undefined;
  }

  switch (field.type) {
    case 'string':
    case 'text': {
      if (typeof value !== 'string') {
        throw new Error(`Field "${field.name}" must be a string.`);
      }

      return value;
    }
    case 'date': {
      if (typeof value !== 'string') {
        throw new Error(`Field "${field.name}" must be a date string.`);
      }

      const parsed = z.string().date().safeParse(value);
      if (!parsed.success) {
        throw new Error(`Field "${field.name}" must be a valid date in YYYY-MM-DD format.`);
      }

      return parsed.data;
    }
    case 'number': {
      const numericValue =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? Number(value)
            : Number.NaN;

      if (!Number.isFinite(numericValue)) {
        throw new Error(`Field "${field.name}" must be a valid number.`);
      }

      return numericValue;
    }
    case 'boolean': {
      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
          return true;
        }

        if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
          return false;
        }
      }

      throw new Error(`Field "${field.name}" must be a boolean.`);
    }
    default:
      return undefined;
  }
}

export function validateRecordInput(
  modelName: string,
  modelConfig: ModelConfig,
  payload: unknown
): Record<string, string | number | boolean> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`Payload for model "${modelName}" must be an object.`);
  }

  const input = payload as Record<string, unknown>;
  const allowedFields = new Set(modelConfig.fields.map((field) => field.name));
  const unknownFields = Object.keys(input).filter((key) => !allowedFields.has(key));

  if (unknownFields.length > 0) {
    throw new Error(`Unknown field(s): ${unknownFields.join(', ')}.`);
  }

  const normalized: Record<string, string | number | boolean> = {};

  for (const field of modelConfig.fields) {
    const coercedValue = coerceFieldValue(field, input[field.name]);

    if (coercedValue !== undefined) {
      normalized[field.name] = coercedValue;
    }
  }

  return normalized;
}

export function parseCsvImportText(
  text: string,
  modelName: string,
  modelConfig: ModelConfig
): Array<Record<string, string | number | boolean>> {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error('Invalid CSV format.');
  }

  return parsed.data.map((row, index) => {
    try {
      return validateRecordInput(modelName, modelConfig, row);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid row.';
      throw new Error(`Row ${index + 2}: ${message}`);
    }
  });
}
