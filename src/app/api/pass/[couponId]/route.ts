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
      console.error('Coupon fetch error:', couponError);
      return NextResponse.json({ error: 'Coupon not found in database' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(coupon.expires_at);

    if (expiresAt < now) {
      return NextResponse.json({ error: 'Coupon is expired' }, { status: 410 });
    }

    const restaurant = Array.isArray(coupon.restaurants) ? coupon.restaurants[0] : coupon.restaurants;
    
    try {
      const passBuffer = await generatePass(coupon, restaurant);

      return new Response(new Uint8Array(passBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.pkpass',
          'Content-Disposition': `attachment; filename="coupon-${coupon.pass_serial || coupon.id}.pkpass"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } catch (passErr: any) {
      console.error('Pass generation internal error:', passErr);
      return NextResponse.json({ 
        error: 'Failed to generate pass',
        details: passErr?.message || String(passErr)
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Pass route top-level error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message || String(error)
    }, { status: 500 });
  }
}
