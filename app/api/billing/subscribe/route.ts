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
      // If session is missing (e.g., due to previous DB schema limits), tell the frontend to re-authenticate
      const authUrl = `${process.env.APP_URL?.replace(/\/$/, '')}/api/auth?shop=${shop}`;
      return NextResponse.json({ 
        error: 'Session not found', 
        needsReauth: true,
        authUrl 
      }, { status: 200 }); // Return 200 so authenticatedFetch doesn't throw
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
      isTest: process.env.NODE_ENV !== 'production',
      returnUrl: returnUrl,
    });

    console.log('Billing confirmation URL:', confirmationUrl);
    return NextResponse.json({ confirmationUrl });
  } catch (error) {
    console.error('Billing request error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
