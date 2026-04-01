import { safeStorage } from 'electron';

export function encrypt(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) return plaintext;
  const buffer = safeStorage.encryptString(plaintext);
  return buffer.toString('base64');
}

export function decrypt(encoded: string): string {
  if (!safeStorage.isEncryptionAvailable()) return encoded;
  try {
    const buffer = Buffer.from(encoded, 'base64');
    return safeStorage.decryptString(buffer);
  } catch {
    // Not encrypted (legacy plaintext value) — return as-is
    return encoded;
  }
}
