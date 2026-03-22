import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { prisma } from '@/lib/prisma';
import { Session } from '@shopify/shopify-api';
import { authenticate } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authShop = await authenticate(req);

  if (!authShop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const shop = authShop;

  try {
    const sessionData = await prisma.session.findFirst({ where: { shop } });
    if (!sessionData) {
      return NextResponse.json({ hasActivePayment: false });
    }

    const session = new Session({
      id: sessionData.id,
      shop: sessionData.shop,
      state: sessionData.state,
      isOnline: sessionData.isOnline,
      accessToken: sessionData.accessToken,
      scope: sessionData.scope || undefined,
      expires: sessionData.expiresAt || undefined,
    });

    const check = await shopify.billing.check({
      session,
      plans: ['Premium Plan'],
      isTest: process.env.NODE_ENV !== 'production',
    });

    // shopify.billing.check returns a boolean directly
    return NextResponse.json({ hasActivePayment: check });
  } catch (error) {
    console.error('Billing check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
