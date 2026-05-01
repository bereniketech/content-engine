import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from('app_config').select('key, value');
  if (error) return NextResponse.json({}, { status: 500 });

  const config = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
  return NextResponse.json(config);
}
