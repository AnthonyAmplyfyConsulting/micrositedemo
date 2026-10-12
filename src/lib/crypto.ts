import 'server-only'
import bcrypt from 'bcryptjs'
import { randomBytes, randomInt } from 'crypto'
import { ALLOWED_PRIZES, type Prize } from '@/lib/security/request'

/** Hash a staff PIN for storage in restaurants.staff_pin_hash. */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

/** Unique, unguessable Wallet pass serial, e.g. AMP-3F9A1C2B-7D41. */
export function generatePassSerial(): string {
  const hex = randomBytes(6).toString('hex').toUpperCase()
  return `AMP-${hex.slice(0, 8)}-${hex.slice(8)}${randomInt(10, 100)}`
}

/** Server-side prize draw using a cryptographically secure, unbiased RNG. */
export function pickPrize(): Prize {
  return ALLOWED_PRIZES[randomInt(ALLOWED_PRIZES.length)]
}
