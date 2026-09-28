import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { pickPrize } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const { restaurantSlug, sessionToken } = await req.json();

    if (!restaurantSlug || !sessionToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Look up restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', restaurantSlug)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Check if session token already used
    const { data: existingSpin, error: existingSpinError } = await supabase
      .from('spins')
      .select('id, prize_percent')
      .eq('session_token', sessionToken)
      .eq('restaurant_id', restaurant.id)
      .single();

    if (existingSpin) {
      return NextResponse.json({
        spinId: existingSpin.id,
        prize: existingSpin.prize_percent,
        message: 'Session already used'
      });
    }

    // Pick a prize
    const { prize } = pickPrize();

    // Create spin row
    const { data: spin, error: spinError } = await supabase
      .from('spins')
      .insert({
        restaurant_id: restaurant.id,
        session_token: sessionToken,
        prize_percent: prize,
      })
      .select('id, prize_percent')
      .single();

    if (spinError || !spin) {
      console.error('Error creating spin:', spinError);
      return NextResponse.json({ error: 'Failed to record spin' }, { status: 500 });
    }

    return NextResponse.json({ spinId: spin.id, prize: spin.prize_percent });
  } catch (error) {
    console.error('Spin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
