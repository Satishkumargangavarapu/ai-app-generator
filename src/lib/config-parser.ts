import { z } from 'zod';

const FIELD_TYPES = ['string', 'number', 'boolean', 'text', 'date'] as const;
const VIEW_TYPES = ['table', 'form', 'dashboard'] as const;
const DEFAULT_MODEL_NAME = 'records';
const NOTIFICATION_EVENTS = ['record.created', 'record.updated', 'record.deleted', 'csv.imported'] as const;

export const FieldSchema = z.object({
  name: z.string(),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().optional().default(false),
});

const RawModelSchema = z.object({
  name: z.string().optional(),
  fields: z.array(FieldSchema),
});

export const ModelSchema = RawModelSchema.extend({
  name: z.string(),
});

export const ViewSchema = z.object({
  type: z.enum(VIEW_TYPES),
  model: z.string().optional(),
  title: z.string(),
  path: z.string(),
  widgets: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const AppConfigSchema = z.object({
  name: z.string(),
  models: z.record(z.string(), RawModelSchema).optional().default({}),
  views: z.array(ViewSchema).optional().default([]),
  seedData: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).optional(),
  auth: z.object({
    required: z.boolean().default(false),
  }).optional(),
  localization: z.object({
    defaultLocale: z.string().default('en'),
    locales: z.record(z.string(), z.record(z.string(), z.string())).default({}),
  }).optional(),
  notifications: z.object({
    enabled: z.boolean().default(false),
    events: z.array(z.enum(NOTIFICATION_EVENTS)).default(['record.created']),
    mockEmail: z.boolean().default(false),
  }).optional(),
}).transform((config) => ({
  ...config,
  models: Object.fromEntries(
    Object.entries(config.models).map(([modelName, modelConfig]) => [
      modelName,
      {
        ...modelConfig,
        name: modelConfig.name ?? modelName,
      },
    ])
  ),
}));

export type FieldConfig = z.infer<typeof FieldSchema>;
export type ModelConfig = z.infer<typeof ModelSchema>;
export type ViewConfig = z.infer<typeof ViewSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function recordEntries(value: unknown): Array<[string, string]> {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName));
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || fallback;
}

function titleize(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function uniqueName(name: string, usedNames: Set<string>): string {
  let candidate = name;
  let suffix = 2;

  while (usedNames.has(candidate)) {
    candidate = `${name}_${suffix}`;
    suffix += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

function inferFieldType(values: unknown[]): FieldConfig['type'] {
  const presentValues = values.filter((value) => value !== null && value !== undefined && value !== '');
  const sample = presentValues[0];

  if (typeof sample === 'number') return 'number';
  if (typeof sample === 'boolean') return 'boolean';
  if (typeof sample === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(sample)) return 'date';
    if (sample.length > 120) return 'text';
  }

  return 'string';
}

function normalizeField(
  value: unknown,
  index: number,
  usedNames: Set<string>,
  seedRows: Array<Record<string, unknown>>
): FieldConfig | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawName = typeof value.name === 'string' ? value.name : `field_${index + 1}`;
  const fieldName = uniqueName(slugify(rawName, `field_${index + 1}`), usedNames);
  const rawType = typeof value.type === 'string' ? value.type : '';
  const fieldType = FIELD_TYPES.includes(rawType as FieldConfig['type'])
    ? (rawType as FieldConfig['type'])
    : inferFieldType(seedRows.map((row) => row[fieldName]));

  return {
    name: fieldName,
    type: fieldType,
    required: typeof value.required === 'boolean' ? value.required : false,
  };
}

function normalizeSeedData(value: unknown): Record<string, Array<Record<string, unknown>>> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const seedData = Object.fromEntries(
    Object.entries(value)
      .filter(([, rows]) => Array.isArray(rows))
      .map(([modelName, rows]) => [
        slugify(modelName, DEFAULT_MODEL_NAME),
        (rows as unknown[]).filter(isRecord),
      ])
  );

  return Object.keys(seedData).length > 0 ? seedData : undefined;
}

function inferFieldsFromSeedRows(seedRows: Array<Record<string, unknown>>): FieldConfig[] {
  const usedNames = new Set<string>();
  const firstRow = seedRows.find((row) => Object.keys(row).length > 0);

  if (!firstRow) {
    return [{ name: 'name', type: 'string', required: false }];
  }

  return Object.keys(firstRow).map((fieldName) => {
    const normalizedName = uniqueName(slugify(fieldName, 'field'), usedNames);

    return {
      name: normalizedName,
      type: inferFieldType(seedRows.map((row) => row[fieldName])),
      required: false,
    };
  });
}

function normalizeModels(
  value: unknown,
  seedData: Record<string, Array<Record<string, unknown>>> | undefined
): Record<string, ModelConfig> {
  const sourceModels = isRecord(value) ? value : {};
  const modelEntries = Object.entries(sourceModels);
  const usedModelNames = new Set<string>();

  const models = Object.fromEntries(
    modelEntries.map(([rawModelName, rawModelConfig]) => {
      const modelName = uniqueName(slugify(rawModelName, DEFAULT_MODEL_NAME), usedModelNames);
      const seedRows = seedData?.[modelName] ?? [];
      const rawFields = Array.isArray(rawModelConfig)
        ? rawModelConfig
        : isRecord(rawModelConfig) && Array.isArray(rawModelConfig.fields)
          ? rawModelConfig.fields
          : [];
      const usedFieldNames = new Set<string>();
      const fields = rawFields
        .map((field, index) => normalizeField(field, index, usedFieldNames, seedRows))
        .filter((field): field is FieldConfig => Boolean(field));
      const inferredFields = fields.length > 0 ? fields : inferFieldsFromSeedRows(seedRows);

      return [
        modelName,
        {
          name:
            isRecord(rawModelConfig) && typeof rawModelConfig.name === 'string'
              ? slugify(rawModelConfig.name, modelName)
              : modelName,
          fields: inferredFields,
        },
      ];
    })
  );

  if (Object.keys(models).length > 0) {
    return models;
  }

  const seedModelName = seedData ? Object.keys(seedData)[0] : undefined;
  const fallbackModelName = seedModelName ?? DEFAULT_MODEL_NAME;

  return {
    [fallbackModelName]: {
      name: fallbackModelName,
      fields: inferFieldsFromSeedRows(seedData?.[fallbackModelName] ?? []),
    },
  };
}

function normalizePath(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function normalizeViews(value: unknown, models: Record<string, ModelConfig>): ViewConfig[] {
  const modelNames = Object.keys(models);
  const firstModel = modelNames[0];
  const rawViews = Array.isArray(value) ? value : [];
  const usedPaths = new Set<string>();
  const normalizedViews = rawViews
    .filter(isRecord)
    .map((view, index) => {
      const rawType = typeof view.type === 'string' ? view.type : '';
      const viewType = VIEW_TYPES.includes(rawType as ViewConfig['type'])
        ? (rawType as ViewConfig['type'])
        : 'table';
      const requestedModel = typeof view.model === 'string' ? slugify(view.model, firstModel) : firstModel;
      const model = requestedModel in models ? requestedModel : firstModel;
      const fallbackPath = index === 0 ? '/' : `/${viewType}-${index + 1}`;
      const path = uniqueName(normalizePath(view.path, fallbackPath), usedPaths);

      return {
        type: viewType,
        model: viewType === 'dashboard' ? model : model,
        title:
          typeof view.title === 'string' && view.title.trim() !== ''
            ? view.title
            : `${titleize(model)} ${titleize(viewType)}`,
        path,
        widgets: Array.isArray(view.widgets)
          ? view.widgets.filter(isRecord)
          : viewType === 'dashboard'
            ? [
                { type: 'count', model, title: `${titleize(model)} Count` },
                { type: 'recent', model, title: `Recent ${titleize(model)}` },
              ]
            : undefined,
      };
    });

  if (normalizedViews.length > 0) {
    return normalizedViews;
  }

  return modelNames.map((modelName, index) => ({
    type: 'table',
    model: modelName,
    title: `${titleize(modelName)} Data`,
    path: index === 0 ? '/' : `/${modelName}`,
    widgets: undefined,
  }));
}

function normalizeLocalization(value: unknown) {
  if (!isRecord(value)) {
    return {
      defaultLocale: 'en',
      locales: {
        en: {},
      },
    };
  }

  const rawLocales = isRecord(value.locales) ? value.locales : {};
  const locales = Object.fromEntries(
    Object.entries(rawLocales)
      .filter(([, labels]) => isRecord(labels))
      .map(([locale, labels]) => [
        locale,
        Object.fromEntries(
          Object.entries(labels as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string'
          )
        ),
      ])
  );
  const defaultLocale =
    typeof value.defaultLocale === 'string' && value.defaultLocale.trim() !== ''
      ? value.defaultLocale.trim()
      : Object.keys(locales)[0] ?? 'en';

  return {
    defaultLocale,
    locales: Object.keys(locales).length > 0 ? locales : { [defaultLocale]: {} },
  };
}

function normalizeNotifications(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const rawEvents = Array.isArray(value.events) ? value.events : [];
  const events = rawEvents.filter((event): event is NotificationEvent =>
    typeof event === 'string' && NOTIFICATION_EVENTS.includes(event as NotificationEvent)
  );

  return {
    enabled: value.enabled === true,
    events: events.length > 0 ? events : ['record.created' as NotificationEvent],
    mockEmail: value.mockEmail === true,
  };
}

function normalizeConfig(json: unknown): unknown {
  const source = isRecord(json) ? json : {};
  const seedData = normalizeSeedData(source.seedData);
  const models = normalizeModels(source.models, seedData);
  const normalizedSeedData =
    seedData &&
    Object.fromEntries(
      Object.entries(seedData)
        .filter(([modelName]) => modelName in models)
        .map(([modelName, rows]) => {
          const allowedFields = new Set(models[modelName].fields.map((field) => field.name));
          return [
            modelName,
            rows.map((row) =>
              Object.fromEntries(Object.entries(row).filter(([fieldName]) => allowedFields.has(fieldName)))
            ),
          ];
        })
    );

  return {
    ...source,
    name: typeof source.name === 'string' && source.name.trim() !== '' ? source.name : 'Untitled App',
    models,
    views: normalizeViews(source.views, models),
    seedData:
      normalizedSeedData && Object.keys(normalizedSeedData).length > 0
        ? normalizedSeedData
        : undefined,
    auth: isRecord(source.auth) ? { required: source.auth.required === true } : undefined,
    localization: normalizeLocalization(source.localization),
    notifications: normalizeNotifications(source.notifications),
  };
}

function looksLikePackageManifest(json: unknown): json is Record<string, unknown> {
  if (!isRecord(json)) {
    return false;
  }

  const hasPackageOnlyFields =
    isRecord(json.scripts) ||
    isRecord(json.dependencies) ||
    isRecord(json.devDependencies) ||
    typeof json.private === 'boolean' ||
    typeof json.version === 'string';

  return typeof json.name === 'string' && hasPackageOnlyFields && !isRecord(json.models);
}

function parsePackageManifest(json: Record<string, unknown>): AppConfig {
  const dependencies = recordEntries(json.dependencies).map(([packageName, version]) => ({
    package: packageName,
    version,
    group: 'dependency',
  }));

  const devDependencies = recordEntries(json.devDependencies).map(([packageName, version]) => ({
    package: packageName,
    version,
    group: 'devDependency',
  }));

  const scripts = recordEntries(json.scripts).map(([name, command]) => ({
    name,
    command,
  }));

  const name = `${json.name} Project Manifest`;

  return AppConfigSchema.parse({
    name,
    models: {
      dependencies: {
        name: 'dependencies',
        fields: [
          { name: 'package', type: 'string', required: true },
          { name: 'version', type: 'string', required: true },
          { name: 'group', type: 'string', required: true },
        ],
      },
      scripts: {
        name: 'scripts',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'command', type: 'text', required: true },
        ],
      },
    },
    views: [
      { type: 'table', model: 'dependencies', title: 'Package Dependencies', path: '/' },
      { type: 'table', model: 'scripts', title: 'NPM Scripts', path: '/scripts' },
    ],
    seedData: {
      dependencies: [...dependencies, ...devDependencies],
      scripts,
    },
  });
}

export function parseConfig(json: unknown): AppConfig {
  if (looksLikePackageManifest(json)) {
    return parsePackageManifest(json);
  }

  return AppConfigSchema.parse(normalizeConfig(json));
}
