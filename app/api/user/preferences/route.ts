import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEFAULTS = { scheduleStartHour: 6, scheduleEndHour: 22 };

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const supabase = createClient();
  const { data } = await supabase
    .from('user_preferences')
    .select('schedule_start_hour, schedule_end_hour')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return NextResponse.json(DEFAULTS);

  return NextResponse.json({
    scheduleStartHour: data.schedule_start_hour,
    scheduleEndHour: data.schedule_end_hour,
  });
}

export async function PATCH(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });

  const { scheduleStartHour, scheduleEndHour } = body;
  if (
    typeof scheduleStartHour !== 'number' ||
    typeof scheduleEndHour !== 'number' ||
    scheduleStartHour < 0 || scheduleStartHour > 23 ||
    scheduleEndHour < 0 || scheduleEndHour > 23
  ) {
    return NextResponse.json({ error: 'Hours must be integers between 0 and 23.' }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: userId,
      schedule_start_hour: scheduleStartHour,
      schedule_end_hour: scheduleEndHour,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) return NextResponse.json({ error: 'Failed to save preferences.' }, { status: 500 });
  return NextResponse.json({ scheduleStartHour, scheduleEndHour });
}
