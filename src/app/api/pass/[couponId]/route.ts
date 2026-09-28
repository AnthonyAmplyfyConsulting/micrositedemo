import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { generatePass } from '@/lib/pass/generatePass';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const { couponId } = await params;
    
    if (!couponId) {
      return NextResponse.json({ error: 'Missing couponId' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*, restaurants(*)')
      .eq('id', couponId)
      .single();

    if (couponError || !coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(coupon.expires_at);

    if (expiresAt < now) {
      return NextResponse.json({ error: 'Coupon is expired' }, { status: 410 });
    }

    const restaurant = Array.isArray(coupon.restaurants) ? coupon.restaurants[0] : coupon.restaurants;
    const passBuffer = await generatePass(coupon, restaurant);

    return new Response(new Uint8Array(passBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="coupon-${coupon.pass_serial || coupon.id}.pkpass"`,
      },
    });
  } catch (error) {
    console.error('Pass generation API error:', error);
    return NextResponse.json({ error: 'Failed to generate pass' }, { status: 500 });
  }
}
