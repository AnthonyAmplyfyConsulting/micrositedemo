import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { pickPrize } from '@/lib/crypto';
import { isCrossSite, isSlug, isUuid, jsonError, jsonOk, limitByIp, readJsonBody } from '@/lib/security/request';

export const runtime = 'nodejs';

const TEN_MINUTES = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    if (isCrossSite(req)) return jsonError('Forbidden', 403);
    const limited = limitByIp(req, 'spin', 20, TEN_MINUTES);
    if (limited) return limited;

    const body = await readJsonBody(req, 1024);
    if (!body) return jsonError('Invalid request', 400);

    const { restaurantSlug, sessionToken } = body;
    if (!isSlug(restaurantSlug) || !isUuid(sessionToken)) {
      return jsonError('Missing required fields', 400);
    }

    const supabase = createServerClient();

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', restaurantSlug)
      .maybeSingle();

    if (!restaurant) return jsonError('Restaurant not found', 404);

    // Idempotent: the same session token always gets the same reward.
    const { data: existingSpin } = await supabase
      .from('spins')
      .select('id, prize_percent')
      .eq('session_token', sessionToken)
      .eq('restaurant_id', restaurant.id)
      .maybeSingle();

    if (existingSpin) {
      return jsonOk({ spinId: existingSpin.id, prize: existingSpin.prize_percent, message: 'Session already used' });
    }

    const { data: spin, error: spinError } = await supabase
      .from('spins')
      .insert({
        restaurant_id: restaurant.id,
        session_token: sessionToken,
        prize_percent: pickPrize(),
      })
      .select('id, prize_percent')
      .single();

    if (spinError || !spin) {
      console.error('Error creating spin:', spinError?.message);
      return jsonError('Failed to record spin', 500);
    }

    return jsonOk({ spinId: spin.id, prize: spin.prize_percent });
  } catch (error) {
    console.error('Spin API error:', error instanceof Error ? error.message : error);
    return jsonError('Internal server error', 500);
  }
}
