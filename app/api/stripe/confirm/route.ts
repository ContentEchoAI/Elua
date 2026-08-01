import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    }
    const body = await req.json();
    const sessionId = body?.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing session ID.' }, { status: 400 });
    }
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
    }
    const stripe = new Stripe(stripeSecretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed.' }, { status: 402 });
    }
    if (session.metadata?.clerkUserId !== userId) {
      return NextResponse.json({ error: 'Session does not match user.' }, { status: 403 });
    }
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      privateMetadata: { isPro: true },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Stripe confirm error:', error);
    return NextResponse.json({ error: 'Failed to confirm payment.' }, { status: 500 });
  }
}
