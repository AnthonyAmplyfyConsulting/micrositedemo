import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { verifyPin } from '@/lib/crypto';
import { rateLimit } from '@/lib/security/rateLimit';
import { isCrossSite, isUuid, jsonError, jsonOk, limitByIp, readJsonBody } from '@/lib/security/request';

export const runtime = 'nodejs';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const PIN_RE = /^\d{4,6}$/;

export async function GET(req: NextRequest) {
  try {
    const limited = limitByIp(req, 'redeem-get', 60, 60 * 1000);
    if (limited) return limited;

    const couponId = req.nextUrl.searchParams.get('couponId');
    if (!isUuid(couponId)) return jsonError('Coupon not found', 404);

    const supabase = createServerClient();
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, prize_percent, guest_name, status, expires_at, redeemed_at, restaurants(name)')
      .eq('id', couponId)
      .maybeSingle();

    if (!coupon) return jsonError('Coupon not found', 404);

    let currentStatus = coupon.status;
    if (new Date(coupon.expires_at) < new Date() && currentStatus === 'unused') {
      await supabase.from('coupons').update({ status: 'expired' }).eq('id', coupon.id).eq('status', 'unused');
      currentStatus = 'expired';
    }

    const restaurant = Array.isArray(coupon.restaurants) ? coupon.restaurants[0] : coupon.restaurants;
    return jsonOk({
      prize_percent: coupon.prize_percent,
      guest_name: coupon.guest_name,
      status: currentStatus,
      expires_at: coupon.expires_at,
      redeemed_at: coupon.redeemed_at,
      restaurantName: restaurant?.name || 'Restaurant',
    });
  } catch (error) {
    console.error('Redeem GET API error:', error instanceof Error ? error.message : error);
    return jsonError('Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (isCrossSite(req)) return jsonError('Forbidden', 403);
    // Staff PINs are short, so throttle hard to stop brute-force guessing:
    // per IP and per coupon.
    const limited = limitByIp(req, 'redeem-post', 10, FIFTEEN_MINUTES);
    if (limited) return limited;

    const body = await readJsonBody(req, 1024);
    if (!body) return jsonError('Invalid request', 400);

    const { couponId, pin } = body;
    if (!isUuid(couponId) || typeof pin !== 'string' || !PIN_RE.test(pin)) {
      return jsonError('Missing or invalid fields', 400);
    }

    const perCoupon = rateLimit(`redeem-coupon:${couponId}`, 5, FIFTEEN_MINUTES);
    if (!perCoupon.ok) {
      return jsonError('Too many attempts for this coupon. Please wait and try again.', 429, {
        'Retry-After': String(perCoupon.retryAfterSeconds),
      });
    }

    const supabase = createServerClient();
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, status, expires_at, restaurant_id')
      .eq('id', couponId)
      .maybeSingle();

    if (!coupon) return jsonError('Coupon not found', 404);

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('staff_pin_hash')
      .eq('id', coupon.restaurant_id)
      .maybeSingle();

    if (!restaurant?.staff_pin_hash) return jsonError('Coupon not found', 404);

    if (!(await verifyPin(pin, restaurant.staff_pin_hash))) {
      return jsonError('Invalid PIN', 401);
    }

    if (coupon.status !== 'unused') {
      return jsonError(`Coupon is already ${coupon.status}`, 410);
    }

    const now = new Date();
    if (new Date(coupon.expires_at) < now) {
      await supabase.from('coupons').update({ status: 'expired' }).eq('id', coupon.id).eq('status', 'unused');
      return jsonError('Coupon is expired', 410);
    }

    // Atomic update — only redeem if still unused. Check the affected row so a
    // concurrent redemption can't both report success.
    const { data: updated, error: updateError } = await supabase
      .from('coupons')
      .update({ status: 'redeemed', redeemed_at: now.toISOString(), redeemed_by: 'staff' })
      .eq('id', coupon.id)
      .eq('status', 'unused')
      .select('id');

    if (updateError || !updated || updated.length === 0) {
      return jsonError('Failed to redeem coupon, it may have been already redeemed', 409);
    }

    return jsonOk({ success: true, message: 'Coupon redeemed successfully' });
  } catch (error) {
    console.error('Redeem POST API error:', error instanceof Error ? error.message : error);
    return jsonError('Internal server error', 500);
  }
}
