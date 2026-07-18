function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("invalid base64 key material");
  }
}

function hexToBytes(tokenHex) {
  const bytes = new Uint8Array(tokenHex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(tokenHex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function importEncryptionKey(keyBytes, usage) {
  if (!(keyBytes instanceof Uint8Array) || keyBytes.byteLength !== 32) {
    throw new Error("push token encryption key must contain 32 bytes");
  }
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [usage]);
}

export function decodeEncryptionKey(value) {
  const keyBytes = base64ToBytes(value);
  if (keyBytes.byteLength !== 32) {
    throw new Error("push token encryption key must contain 32 bytes");
  }
  return keyBytes;
}

export async function encryptToken(tokenHex, keyBytes) {
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const key = await importEncryptionKey(keyBytes, "encrypt");
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    hexToBytes(tokenHex),
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(ivBytes),
    keyVersion: 1,
  };
}

export async function decryptToken(encrypted, keyBytes) {
  const key = await importEncryptionKey(keyBytes, "decrypt");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(encrypted.iv) },
    key,
    base64ToBytes(encrypted.ciphertext),
  );
  return bytesToHex(new Uint8Array(plaintext));
}

export async function hashToken(tokenHex) {
  const digest = await crypto.subtle.digest("SHA-256", hexToBytes(tokenHex));
  return bytesToHex(new Uint8Array(digest));
}

export function notificationIdForHash(tokenHash) {
  return tokenHash.slice(0, 16);
}
