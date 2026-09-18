import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/** Clave de cifrado derivada del JWT_SECRET (nunca en el código). */
function getKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? '';
  return createHash('sha256').update(secret).digest(); // 32 bytes = AES-256
}

/** Cifra un secreto → "iv:hex". Devuelve null si el input es vacío. */
export function encryptSecret(plain: string | null | undefined): string | null {
  if (!plain?.trim()) return null;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain.trim(), 'utf8'),
    cipher.final(),
  ]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Descifra "iv:hex" → texto plano. Devuelve null si falla. */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    const [ivHex, dataHex] = stored.split(':');
    const decipher = createDecipheriv(
      'aes-256-cbc',
      getKey(),
      Buffer.from(ivHex, 'hex'),
    );
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

/** Últimos 4 caracteres para mostrar: "sk-••••abc1" */
export function maskSecret(plain: string): string {
  return plain.length > 8 ? `••••${plain.slice(-4)}` : '••••';
}
