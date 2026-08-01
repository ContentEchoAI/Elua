import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clerkUserId = body?.clerkUserId;

    console.log('Checkout route hit');
    console.log('Frontend Clerk userId exists:', Boolean(clerkUserId));

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Missing Clerk user ID. Please sign out, sign back in, and try again.' },
        { status: 401 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    console.log('STRIPE_SECRET_KEY exists:', Boolean(stripeSecretKey));
    console.log('STRIPE_PRICE_ID exists:', Boolean(stripePriceId));
    console.log('STRIPE_PRICE_ID starts with price_:', stripePriceId?.startsWith('price_'));
    console.log('NEXT_PUBLIC_APP_URL:', appUrl);

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Missing STRIPE_SECRET_KEY in .env.local. Restart npm run dev after adding it.' },
        { status: 500 }
      );
    }

    if (!stripePriceId) {
      return NextResponse.json(
        { error: 'Missing STRIPE_PRICE_ID in .env.local. Add your Stripe recurring Price ID that starts with price_.' },
        { status: 500 }
      );
    }

    if (!stripePriceId.startsWith('price_')) {
      return NextResponse.json(
        { error: 'STRIPE_PRICE_ID must start with price_. You may have pasted a product ID, payment link, or checkout link instead.' },
        { status: 500 }
      );
    }

    if (!appUrl) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_APP_URL in .env.local.' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/workspace?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}?canceled=true`,
      client_reference_id: clerkUserId,
      metadata: {
        clerkUserId,
      },
      subscription_data: {
        metadata: {
          clerkUserId,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe did not return a checkout URL.' },
        { status: 500 }
      );
    }

    console.log('Stripe checkout session created successfully.');

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);

    let message = 'Failed to create checkout session.';

    if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}