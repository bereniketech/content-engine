import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  const { data } = await supabase
    .from('generation_log')
    .select('status, request_id')
    .eq('request_id', id)
    .eq('user_id', userId)
    .single();

  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  return NextResponse.json({ status: data.status, job_id: data.request_id });
}
