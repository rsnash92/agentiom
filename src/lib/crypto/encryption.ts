/**
 * Encryption utilities for secure storage of agent private keys
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment
 * Must be a 32-byte (64 hex character) string
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64 character hex string (32 bytes)');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a private key for storage
 * Returns: salt:iv:authTag:ciphertext (all hex encoded)
 */
export function encryptPrivateKey(privateKey: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const salt = randomBytes(SALT_LENGTH);

  // Derive a unique key using the salt (adds extra security layer)
  const derivedKey = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    derivedKey[i] = key[i] ^ salt[i];
  }

  const cipher = createCipheriv(ALGORITHM, derivedKey, iv);

  // Remove 0x prefix if present
  const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

  let encrypted = cipher.update(cleanKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:ciphertext
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a stored private key
 * Input format: salt:iv:authTag:ciphertext (all hex encoded)
 */
export function decryptPrivateKey(encryptedData: string): string {
  const key = getEncryptionKey();

  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const [saltHex, ivHex, authTagHex, ciphertext] = parts;

  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // Derive the same key using the salt
  const derivedKey = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    derivedKey[i] = key[i] ^ salt[i];
  }

  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  // Return with 0x prefix
  return `0x${decrypted}`;
}

/**
 * Generate a new random private key
 * Returns both the raw key (for Hyperliquid) and encrypted version (for storage)
 */
export function generateAgentWallet(): {
  privateKey: `0x${string}`;
  encryptedKey: string;
  address: string;
} {
  // Generate 32 random bytes for private key
  const privateKeyBytes = randomBytes(32);
  const privateKey = `0x${privateKeyBytes.toString('hex')}` as `0x${string}`;

  // Encrypt for storage
  const encryptedKey = encryptPrivateKey(privateKey);

  // Derive address using viem (imported dynamically to avoid bundling issues)
  const { privateKeyToAccount } = require('viem/accounts');
  const account = privateKeyToAccount(privateKey);

  return {
    privateKey,
    encryptedKey,
    address: account.address,
  };
}

/**
 * Validate that a string is a valid encrypted key format
 */
export function isValidEncryptedKey(data: string): boolean {
  const parts = data.split(':');
  if (parts.length !== 4) return false;

  const [salt, iv, authTag, ciphertext] = parts;

  // Check hex format and lengths
  const hexRegex = /^[0-9a-fA-F]+$/;

  return (
    hexRegex.test(salt) && salt.length === SALT_LENGTH * 2 &&
    hexRegex.test(iv) && iv.length === IV_LENGTH * 2 &&
    hexRegex.test(authTag) && authTag.length === AUTH_TAG_LENGTH * 2 &&
    hexRegex.test(ciphertext) && ciphertext.length === 64 // 32 bytes = 64 hex chars
  );
}
