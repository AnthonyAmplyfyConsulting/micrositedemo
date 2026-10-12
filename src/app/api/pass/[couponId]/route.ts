import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { generatePass } from '@/lib/pass/generatePass';
import { getBaseUrl, isUuid, jsonError, limitByIp } from '@/lib/security/request';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ couponId: string }> }) {
  try {
    // Pass signing is CPU-heavy; throttle to prevent resource exhaustion.
    const limited = limitByIp(req, 'pass', 20, 10 * 60 * 1000);
    if (limited) return limited;

    const { couponId } = await params;
    if (!isUuid(couponId)) return jsonError('Coupon not found', 404);

    const supabase = createServerClient();
    // Select only what the pass needs — never pull restaurant secrets (PIN hash, keys).
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, prize_percent, guest_name, expires_at, pass_serial, restaurants(name)')
      .eq('id', couponId)
      .maybeSingle();

    if (!coupon) return jsonError('Coupon not found', 404);
    if (new Date(coupon.expires_at) < new Date()) return jsonError('Coupon is expired', 410);

    const restaurant = Array.isArray(coupon.restaurants) ? coupon.restaurants[0] : coupon.restaurants;
    const passBuffer = await generatePass(coupon, restaurant, getBaseUrl(req));

    return new Response(new Uint8Array(passBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': 'inline; filename="amplyfy-reward.pkpass"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Pass route error:', error instanceof Error ? error.message : error);
    return jsonError('Failed to generate pass', 500);
  }
}
