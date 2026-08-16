import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const ALLOWED_EVENTS = new Set(['demo_photo', 'guest_generate', 'guest_signup_click']);

const ipHits = new Map<string, { count: number; day: string }>();

export async function POST(req: Request) {
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const ipDay = new Date().toISOString().slice(0, 10);
  const ipEntry = ipHits.get(clientIp);
  if (ipEntry && ipEntry.day === ipDay && ipEntry.count >= 200) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  ipHits.set(clientIp, {
    day: ipDay,
    count: ipEntry && ipEntry.day === ipDay ? ipEntry.count + 1 : 1,
  });
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      if (v.day !== ipDay) ipHits.delete(k);
    }
  }

  let body: { name?: string; props?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, props } = body;
  if (!name || !ALLOWED_EVENTS.has(name)) {
    return NextResponse.json({ error: 'Unknown event name' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('events').insert({
    name,
    props: props ?? {},
  });

  if (error) {
    console.error('track insert error:', error.message);
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}