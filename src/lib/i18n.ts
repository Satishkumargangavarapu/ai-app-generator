import type { AppConfig } from '@/lib/config-parser';

const FALLBACK_LABELS: Record<string, string> = {
  actions: 'Actions',
  add_record: 'Add Record',
  application_view: 'Application View',
  back_home: 'Generator Home',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  import_csv: 'Import CSV',
  language: 'Language',
  loading: 'Loading...',
  notifications: 'Notifications',
  no_notifications: 'No notifications yet',
  no_records: 'No records found',
  records: 'Records',
  save: 'Save',
  saving: 'Saving...',
  update: 'Update',
};

export function getLocales(config: AppConfig) {
  const locales = config.localization?.locales ?? { en: {} };
  return Object.keys(locales).length > 0 ? locales : { en: {} };
}

export function getDefaultLocale(config: AppConfig) {
  const locales = getLocales(config);
  const requestedLocale = config.localization?.defaultLocale ?? 'en';
  return requestedLocale in locales ? requestedLocale : Object.keys(locales)[0] ?? 'en';
}

export function translate(config: AppConfig, locale: string, key: string, fallback?: string) {
  const locales = getLocales(config);
  return locales[locale]?.[key] ?? locales.en?.[key] ?? FALLBACK_LABELS[key] ?? fallback ?? key;
}
