import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { prisma } from '@/lib/prisma';
import { Session } from '@shopify/shopify-api';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const shop = url.searchParams.get('shop');

  if (!shop) {
    return new NextResponse('Missing shop parameter', { status: 400 });
  }

  try {
    const sessionData = await prisma.session.findFirst({ where: { shop } });
    if (!sessionData) {
      return new NextResponse('Session not found', { status: 404 });
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

    const returnUrl = `https://admin.shopify.com/store/${shop.split('.')[0]}/apps/${process.env.SHOPIFY_API_KEY}`;

    const confirmationUrl = await shopify.billing.request({
      session,
      plan: 'Premium Plan',
      isTest: true, // Use test billing for development
      returnUrl: returnUrl,
    });

    return NextResponse.redirect(confirmationUrl);
  } catch (error) {
    console.error('Billing request error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
