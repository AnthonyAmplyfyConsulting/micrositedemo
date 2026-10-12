import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { generatePass } from '@/lib/pass/generatePass';
import { cleanName, getBaseUrl, isPrize, jsonError, limitByIp } from '@/lib/security/request';

export const runtime = 'nodejs';

/**
 * Real, signed Apple Wallet pass for the guided /demo.
 * No database writes, no GHL contact, and the QR code is not redeemable.
 */
export async function GET(req: NextRequest) {
  // Pass signing is CPU-heavy; throttle to prevent resource exhaustion.
  const limited = limitByIp(req, 'demo-pass', 20, 10 * 60 * 1000);
  if (limited) return limited;

  const params = req.nextUrl.searchParams;
  const prize = Number(params.get('prize'));
  if (!isPrize(prize)) return jsonError('Invalid prize', 400);
  const name = cleanName(params.get('name') ?? '')?.slice(0, 40) || 'Guest';

  const coupon = {
    id: `demo-${randomUUID()}`,
    prize_percent: prize,
    guest_name: name,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  try {
    const passBuffer = await generatePass(coupon, { name: 'Amplyfy' }, getBaseUrl(req), { demo: true });
    return new Response(new Uint8Array(passBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': 'inline; filename="amplyfy-demo-reward.pkpass"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Demo pass generation error:', err instanceof Error ? err.message : err);
    return jsonError('Failed to generate pass', 500);
  }
}
