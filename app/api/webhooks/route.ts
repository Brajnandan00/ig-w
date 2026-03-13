import { shopify } from '@/lib/shopify';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const validation = await shopify.webhooks.validate({
      rawBody,
      rawRequest: req,
    });

    if (!validation.valid) {
      return new NextResponse('Invalid webhook signature', { status: 401 });
    }

    const { topic, domain } = validation as any; // The types in shopify-api webhooks can be tricky, casting to any to extract topic and domain

    if (topic === 'APP_UNINSTALLED') {
      // Clean up data for the shop
      await prisma.session.deleteMany({ where: { shop: domain } });
      await prisma.feedSettings.deleteMany({ where: { shopDomain: domain } });
      await prisma.instagramAccount.deleteMany({ where: { shopDomain: domain } });
      await prisma.instagramMedia.deleteMany({ where: { shopDomain: domain } });
    }

    // Handle GDPR webhooks
    if (topic === 'CUSTOMERS_DATA_REQUEST' || topic === 'CUSTOMERS_REDACT' || topic === 'SHOP_REDACT') {
      // We only store public IG data, so we just acknowledge these webhooks
      console.log(`Received GDPR webhook: ${topic} for shop ${domain}`);
    }

    return new NextResponse('Webhook processed', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
