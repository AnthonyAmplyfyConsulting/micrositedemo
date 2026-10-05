import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { generatePass } from '@/lib/pass/generatePass';

export const runtime = 'nodejs';

const PRIZES = new Set([5, 10, 15]);

/**
 * Real, signed Apple Wallet pass for the guided /demo.
 * No database writes, no GHL contact, and the QR code is not redeemable.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const prize = Number(params.get('prize'));
  const name = (params.get('name') || '').replace(/[^\p{L}\p{N} .'\-]/gu, '').trim().slice(0, 40) || 'Guest';

  if (!PRIZES.has(prize)) {
    return NextResponse.json({ error: 'Invalid prize' }, { status: 400 });
  }

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = host && !host.includes('localhost')
    ? `${proto}://${host}`
    : (process.env.NEXT_PUBLIC_BASE_URL || 'https://micrositedemo.vercel.app');

  const coupon = {
    id: `demo-${randomUUID()}`,
    prize_percent: prize,
    guest_name: name,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  try {
    const passBuffer = await generatePass(coupon, { name: 'Amplyfy' }, baseUrl, { demo: true });
    return new Response(new Uint8Array(passBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': 'inline; filename="amplyfy-demo-reward.pkpass"',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    console.error('Demo pass generation error:', err);
    return NextResponse.json({ error: 'Failed to generate pass', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
