import { shopify } from '@/lib/shopify';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const shop = url.searchParams.get('shop');

  if (!shop) {
    return new NextResponse('Missing shop parameter', { status: 400 });
  }

  const sanitizedShop = shopify.utils.sanitizeShop(shop);
  if (!sanitizedShop) {
    return new NextResponse('Invalid shop parameter', { status: 400 });
  }

  try {
    // Using the Web API adapter, we pass the Request object directly
    const response = await shopify.auth.begin({
      shop: sanitizedShop,
      callbackPath: '/api/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: new NextResponse(),
    });
    return response;
  } catch (error) {
    console.error('OAuth begin error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
