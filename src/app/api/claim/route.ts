import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { generatePassSerial } from '@/lib/crypto';
import { createOrUpdateContact, addContactTag, withRetry } from '@/lib/ghl/client';

export async function POST(req: NextRequest) {
  try {
    const { spinId, name, phone, smsConsent } = await req.json();

    if (!spinId || !name || !phone || typeof smsConsent !== 'boolean') {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Validate spin exists and isn't claimed
    const { data: spin, error: spinError } = await supabase
      .from('spins')
      .select('id, restaurant_id, prize_percent, claimed')
      .eq('id', spinId)
      .single();

    if (spinError || !spin) {
      return NextResponse.json({ error: 'Spin not found' }, { status: 404 });
    }

    if (spin.claimed) {
      return NextResponse.json({ error: 'Spin already claimed' }, { status: 409 });
    }

    // Get restaurant config for expiry days
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('coupon_expiry_days')
      .eq('id', spin.restaurant_id)
      .single();

    const expiryDays = restaurant?.coupon_expiry_days || 14;

    const passSerial = generatePassSerial();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const consentTimestamp = smsConsent ? new Date().toISOString() : null;

    // Create coupon
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .insert({
        spin_id: spin.id,
        restaurant_id: spin.restaurant_id,
        guest_name: name,
        guest_phone: phone,
        sms_consent: smsConsent,
        consent_timestamp: consentTimestamp,
        consent_wording_version: 'v1',
        prize_percent: spin.prize_percent,
        expires_at: expiresAt.toISOString(),
        pass_serial: passSerial,
      })
      .select('id, pass_serial, expires_at, prize_percent')
      .single();

    if (couponError || !coupon) {
      console.error('Coupon creation error:', couponError);
      return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
    }

    // Mark spin as claimed
    await supabase
      .from('spins')
      .update({ claimed: true })
      .eq('id', spin.id);

    // GHL integration — create/update contact and tag
    try {
      const ghlContactId = await withRetry(() =>
        createOrUpdateContact({
          firstName: name,
          phone: phone,
          tags: smsConsent ? ['Spin-Win-Lead', 'SMS-Consent'] : ['Spin-Win-Lead'],
          customFields: {
            'prize_won': `${spin.prize_percent}%`,
            'spin_date': new Date().toISOString(),
          },
        })
      );

      if (ghlContactId) {
        // Update coupon with GHL contact ID
        await supabase
          .from('coupons')
          .update({ ghl_contact_id: ghlContactId })
          .eq('id', coupon.id);
      }
    } catch (ghlError) {
      // Don't fail the claim if GHL is unavailable
      console.error('GHL sync failed (non-blocking):', ghlError);
    }

    return NextResponse.json({
      couponId: coupon.id,
      passSerial: coupon.pass_serial,
      expiresAt: coupon.expires_at,
      prize: coupon.prize_percent,
    });
  } catch (error) {
    console.error('Claim API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
