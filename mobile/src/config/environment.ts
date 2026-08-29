const configuredApiUrl = process.env.EXPO_PUBLIC_EZBK_API_URL?.trim();

function normalizeApiBaseUrl(value?: string): string {
  if (!value) {
    return '';
  }

  return value.replace(/\/+$/, '');
}

export const environment = {
  apiBaseUrl: normalizeApiBaseUrl(configuredApiUrl),
  isConfigured: Boolean(configuredApiUrl),
};
