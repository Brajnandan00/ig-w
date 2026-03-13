import { shopify } from '@/lib/shopify';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const callbackResponse = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: new NextResponse(),
    });

    const { session } = callbackResponse;

    // Register Webhooks
    await shopify.webhooks.register({ session });

    // Ensure FeedSettings exist for this shop
    // Note: FeedSettings requires an accountId, so we can't create it here until they link Instagram.
    // We will just redirect to the app.

    // Redirect to the app inside Shopify Admin
    const redirectUrl = `https://admin.shopify.com/store/${session.shop.split('.')[0]}/apps/${process.env.SHOPIFY_API_KEY}`;
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new NextResponse('Authentication failed', { status: 500 });
  }
}
