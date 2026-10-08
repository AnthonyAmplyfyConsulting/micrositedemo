import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateContact, withRetry } from '@/lib/ghl/client';
import { createServerClient } from '@/lib/supabase/client';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, smsConsent, prize } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const cleanName = String(name).trim();
    const rawDigits = String(phone).replace(/\D/g, '');
    if (rawDigits.length < 10 || rawDigits.length > 15) {
      return NextResponse.json({ error: 'Enter a valid phone number with 10–15 digits.' }, { status: 400 });
    }

    // Format phone to standard E.164 (+1XXXXXXXXXX for 10-digit US)
    const formattedPhone = rawDigits.length === 10 ? `+1${rawDigits}` : `+${rawDigits}`;
    const prizePercent = Number(prize) || 15;

    let ghlContactId: string | null = null;
    let ghlError: string | null = null;

    // 1. Sync contact directly into GoHighLevel CRM
    try {
      ghlContactId = await withRetry(() =>
        createOrUpdateContact({
          firstName: cleanName,
          phone: formattedPhone,
          tags: [
            'Amplyfy-Rewards',
            'Amplyfy-Microsite-Lead',
            `${prizePercent}%-Off-First-Month`,
            ...(smsConsent ? ['SMS-Consent'] : []),
          ],
          customFields: {
            prize_won: `${prizePercent}%`,
            offer: `${prizePercent}% off your first month with us`,
            claim_timestamp: new Date().toISOString(),
            source: 'Amplyfy Luxury Microsite',
          },
        })
      );
      if (ghlContactId) {
        console.log(`[API/Lead] Successfully synced contact to GoHighLevel CRM: ${ghlContactId}`);
      }
    } catch (err: unknown) {
      ghlError = err instanceof Error ? err.message : String(err);
      console.error('[API/Lead] GoHighLevel CRM sync failed:', err);
    }

    // 2. Also record lead into Supabase coupons if available
    try {
      const supabase = createServerClient();
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', 'amplyfy')
        .single();

      if (restaurant) {
        const { data: spin } = await supabase
          .from('spins')
          .insert({
            restaurant_id: restaurant.id,
            session_token: `lead-${Math.random().toString(36).substring(2, 14)}`,
            prize_percent: prizePercent,
            claimed: true,
          })
          .select('id')
          .single();

        if (spin) {
          await supabase.from('coupons').insert({
            spin_id: spin.id,
            restaurant_id: restaurant.id,
            guest_name: cleanName,
            guest_phone: rawDigits,
            sms_consent: Boolean(smsConsent),
            consent_timestamp: smsConsent ? new Date().toISOString() : null,
            consent_wording_version: 'v1',
            prize_percent: prizePercent,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            ghl_contact_id: ghlContactId,
            pass_serial: `AMP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          });
        }
      }
    } catch (supaErr) {
      console.warn('[API/Lead] Supabase record skipped (non-blocking):', supaErr);
    }

    return NextResponse.json({
      success: true,
      ghlContactId,
      ghlSynced: Boolean(ghlContactId),
      ghlError: ghlError || undefined,
    });
  } catch (err: unknown) {
    console.error('[API/Lead] Lead submission error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
