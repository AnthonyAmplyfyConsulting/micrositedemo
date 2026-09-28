import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { verifyPin } from '@/lib/crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const couponId = searchParams.get('couponId');

    if (!couponId) {
      return NextResponse.json({ error: 'Missing couponId' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('id, prize_percent, guest_name, status, expires_at, redeemed_at, restaurant_id')
      .eq('id', couponId)
      .single();

    if (error || !coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    // Get restaurant name
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', coupon.restaurant_id)
      .single();

    const now = new Date();
    const expiresAt = new Date(coupon.expires_at);

    // Check if expired and status is still unused
    let currentStatus = coupon.status;
    if (expiresAt < now && currentStatus === 'unused') {
      await supabase
        .from('coupons')
        .update({ status: 'expired' })
        .eq('id', coupon.id);
      currentStatus = 'expired';
    }

    return NextResponse.json({
      prize_percent: coupon.prize_percent,
      guest_name: coupon.guest_name,
      status: currentStatus,
      expires_at: coupon.expires_at,
      redeemed_at: coupon.redeemed_at,
      restaurantName: restaurant?.name || 'Restaurant',
    });
  } catch (error) {
    console.error('Redeem GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { couponId, pin } = await req.json();

    if (!couponId || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('id, status, expires_at, restaurant_id')
      .eq('id', couponId)
      .single();

    if (couponError || !coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    // Get restaurant for PIN verification
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('staff_pin_hash')
      .eq('id', coupon.restaurant_id)
      .single();
    
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Verify PIN
    const isValidPin = await verifyPin(pin, restaurant.staff_pin_hash);
    if (!isValidPin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    const now = new Date();
    const expiresAt = new Date(coupon.expires_at);

    if (coupon.status !== 'unused') {
      return NextResponse.json({ error: `Coupon is already ${coupon.status}` }, { status: 410 });
    }

    if (expiresAt < now) {
      await supabase
        .from('coupons')
        .update({ status: 'expired' })
        .eq('id', coupon.id);
      return NextResponse.json({ error: 'Coupon is expired' }, { status: 410 });
    }

    // Atomic update - only redeem if still unused
    const { error: updateError } = await supabase
      .from('coupons')
      .update({
        status: 'redeemed',
        redeemed_at: now.toISOString(),
        redeemed_by: 'staff'
      })
      .eq('id', coupon.id)
      .eq('status', 'unused');

    if (updateError) {
      return NextResponse.json({ error: 'Failed to redeem coupon, it may have been already redeemed' }, { status: 409 });
    }

    return NextResponse.json({ success: true, message: 'Coupon redeemed successfully' });
  } catch (error) {
    console.error('Redeem POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
