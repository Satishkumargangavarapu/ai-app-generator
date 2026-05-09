import { describe, expect, it } from 'vitest';

import { FieldSchema, ModelSchema, ViewSchema, parseConfig } from '@/lib/config-parser';

describe('FieldSchema', () => {
  it('accepts all valid field types', () => {
    const types = ['string', 'number', 'boolean', 'text', 'date'] as const;

    types.forEach((type) => {
      expect(() => FieldSchema.parse({ name: 'field', type })).not.toThrow();
    });
  });

  it('rejects an unknown field type', () => {
    expect(() => FieldSchema.parse({ name: 'x', type: 'uuid' })).toThrow();
  });

  it('defaults required to false', () => {
    const field = FieldSchema.parse({ name: 'email', type: 'string' });
    expect(field.required).toBe(false);
  });
});

describe('ModelSchema', () => {
  it('parses a valid model', () => {
    const model = ModelSchema.parse({
      name: 'users',
      fields: [{ name: 'email', type: 'string' }],
    });

    expect(model.name).toBe('users');
    expect(model.fields).toHaveLength(1);
  });

  it('rejects a model with no fields array', () => {
    expect(() => ModelSchema.parse({ name: 'users' })).toThrow();
  });
});

describe('ViewSchema', () => {
  it('accepts all valid view types', () => {
    const types = ['table', 'form', 'dashboard'] as const;

    types.forEach((type) => {
      expect(() => ViewSchema.parse({ type, title: 'T', path: '/t' })).not.toThrow();
    });
  });

  it('makes model optional', () => {
    const view = ViewSchema.parse({ type: 'dashboard', title: 'Dashboard', path: '/' });
    expect(view.model).toBeUndefined();
  });
});

describe('parseConfig', () => {
  const minimalValid = {
    name: 'Test App',
    models: {
      users: {
        name: 'users',
        fields: [{ name: 'email', type: 'string' }],
      },
    },
    views: [{ type: 'table', model: 'users', title: 'Users', path: '/users' }],
  };

  it('parses a minimal valid config', () => {
    const config = parseConfig(minimalValid);
    expect(config.name).toBe('Test App');
  });

  it('infers model names from model keys', () => {
    const config = parseConfig({
      name: 'Employee Directory',
      models: {
        employees: {
          fields: [{ name: 'email', type: 'string' }],
        },
      },
      views: [{ type: 'table', model: 'employees', title: 'Employees', path: '/' }],
    });

    expect(config.models.employees.name).toBe('employees');
  });

  it('defaults models to a usable records model when omitted', () => {
    const config = parseConfig({ name: 'My App' });
    expect(config.models).toEqual({
      records: {
        name: 'records',
        fields: [{ name: 'name', type: 'string', required: false }],
      },
    });
  });

  it('defaults views to a usable table view when omitted', () => {
    const config = parseConfig({ name: 'My App' });
    expect(config.views).toEqual([
      { type: 'table', model: 'records', title: 'Records Data', path: '/' },
    ]);
  });

  it('parses auth.required correctly', () => {
    const config = parseConfig({ name: 'Secure App', auth: { required: true } });
    expect(config.auth?.required).toBe(true);
  });

  it('normalizes localization and notifications', () => {
    const config = parseConfig({
      name: 'Localized',
      localization: {
        defaultLocale: 'hi',
        locales: {
          en: { save: 'Save' },
          hi: { save: 'सेव करें' },
        },
      },
      notifications: {
        enabled: true,
        events: ['record.created', 'bad.event', 'csv.imported'],
        mockEmail: true,
      },
    });

    expect(config.localization?.defaultLocale).toBe('hi');
    expect(config.localization?.locales.hi.save).toBe('सेव करें');
    expect(config.notifications).toEqual({
      enabled: true,
      events: ['record.created', 'csv.imported'],
      mockEmail: true,
    });
  });

  it('repairs invalid field types inside a model', () => {
    const config = parseConfig({
      name: 'Bad',
      models: {
        stuff: { name: 'stuff', fields: [{ name: 'x', type: 'BLOB' }] },
      },
    });

    expect(config.models.stuff.fields).toEqual([{ name: 'x', type: 'string', required: false }]);
  });

  it('creates a safe default app from an incomplete config', () => {
    const config = parseConfig({});

    expect(config.name).toBe('Untitled App');
    expect(config.models.records.fields).toEqual([{ name: 'name', type: 'string', required: false }]);
    expect(config.views).toEqual([
      { type: 'table', model: 'records', title: 'Records Data', path: '/' },
    ]);
  });

  it('generates table views when views are missing', () => {
    const config = parseConfig({
      name: 'CRM',
      models: {
        leads: {
          fields: [{ name: 'email', type: 'string' }],
        },
        companies: {
          fields: [{ name: 'name', type: 'string' }],
        },
      },
    });

    expect(config.views).toEqual([
      { type: 'table', model: 'leads', title: 'Leads Data', path: '/' },
      { type: 'table', model: 'companies', title: 'Companies Data', path: '/companies' },
    ]);
  });

  it('adds default widgets to dashboard views', () => {
    const config = parseConfig({
      name: 'Metrics',
      models: {
        orders: {
          fields: [{ name: 'amount', type: 'number' }],
        },
      },
      views: [{ type: 'dashboard', model: 'orders', title: 'Metrics', path: '/' }],
    });

    expect(config.views[0].widgets).toEqual([
      { type: 'count', model: 'orders', title: 'Orders Count' },
      { type: 'recent', model: 'orders', title: 'Recent Orders' },
    ]);
  });

  it('redirects views that reference missing models to an available model', () => {
    const config = parseConfig({
      name: 'Support',
      models: {
        tickets: {
          fields: [{ name: 'subject', type: 'string' }],
        },
      },
      views: [{ type: 'table', model: 'ghosts', title: 'Broken View', path: '/' }],
    });

    expect(config.views[0].model).toBe('tickets');
  });

  it('infers fields from seed data when model fields are absent', () => {
    const config = parseConfig({
      name: 'Inventory',
      models: {
        products: {},
      },
      seedData: {
        products: [
          {
            sku: 'A-100',
            quantity: 8,
            active: true,
            received_on: '2026-05-08',
          },
        ],
      },
    });

    expect(config.models.products.fields).toEqual([
      { name: 'sku', type: 'string', required: false },
      { name: 'quantity', type: 'number', required: false },
      { name: 'active', type: 'boolean', required: false },
      { name: 'received_on', type: 'date', required: false },
    ]);
  });

  it('drops seed columns that are no longer present after fields are removed', () => {
    const config = parseConfig({
      name: 'Tasks',
      models: {
        tasks: {
          fields: [{ name: 'title', type: 'string' }],
        },
      },
      seedData: {
        tasks: [{ title: 'Ship demo', deleted_field: 'old value' }],
      },
    });

    expect(config.seedData?.tasks).toEqual([{ title: 'Ship demo' }]);
  });

  it('round-trips through JSON serialization', () => {
    const config = parseConfig(minimalValid);
    const rehydrated = parseConfig(JSON.parse(JSON.stringify(config)));

    expect(rehydrated.name).toBe(config.name);
    expect(rehydrated.views).toHaveLength(config.views.length);
  });

  it('turns package manifests into generated app configs with seed data', () => {
    const config = parseConfig({
      name: 'frontend',
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
      },
      dependencies: {
        react: '^19.1.1',
      },
      devDependencies: {
        vite: '^7.1.7',
      },
    });

    expect(config.name).toBe('frontend Project Manifest');
    expect(config.models.dependencies.fields.map((field) => field.name)).toEqual([
      'package',
      'version',
      'group',
    ]);
    expect(config.views).toEqual([
      { type: 'table', model: 'dependencies', title: 'Package Dependencies', path: '/' },
      { type: 'table', model: 'scripts', title: 'NPM Scripts', path: '/scripts' },
    ]);
    expect(config.seedData?.dependencies).toEqual([
      { package: 'react', version: '^19.1.1', group: 'dependency' },
      { package: 'vite', version: '^7.1.7', group: 'devDependency' },
    ]);
    expect(config.seedData?.scripts).toEqual([
      { name: 'build', command: 'vite build' },
      { name: 'dev', command: 'vite' },
    ]);
  });
});
