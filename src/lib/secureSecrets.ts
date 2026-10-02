import { invoke, isTauri } from '@tauri-apps/api/core';

export type SecretId = 'jupiter-api-key' | 'ai-provider-api-key';

const sessionSecrets = new Map<SecretId, string>();

export function getSecureSecret(id: SecretId): Promise<string | null> {
  if (isTauri()) return invoke<string | null>('get_secure_secret', { id });
  return Promise.resolve(sessionSecrets.get(id) ?? null);
}

export function setSecureSecret(id: SecretId, value: string): Promise<void> {
  if (isTauri()) return invoke<void>('set_secure_secret', { id, value });
  sessionSecrets.set(id, value);
  return Promise.resolve();
}

export function deleteSecureSecret(id: SecretId): Promise<void> {
  if (isTauri()) return invoke<void>('delete_secure_secret', { id });
  sessionSecrets.delete(id);
  return Promise.resolve();
}
