import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { prisma } from '@/lib/prisma';
import { Session } from '@shopify/shopify-api';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const shop = url.searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

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
      isTest: true,
    });

    // shopify.billing.check returns a boolean directly
    return NextResponse.json({ hasActivePayment: check });
  } catch (error) {
    console.error('Billing check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
