import bcrypt from 'bcryptjs';

export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

export function generatePassSerial(): string {
  const uuid = crypto.randomUUID();
  const first8 = uuid.substring(0, 8);
  const random4 = Math.floor(1000 + Math.random() * 9000).toString();
  return `AMP-${first8}-${random4}`;
}

export function pickPrize(): { index: number; prize: number } {
  const prizes = [5, 10, 15, 5, 10, 15, 5, 10, 15, 5, 10, 15];
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const index = array[0] % prizes.length;
  return { index, prize: prizes[index] };
}
