import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const shop = url.searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  try {
    const settings = await prisma.feedSettings.findUnique({
      where: { shopDomain: shop }
    });

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    const media = await prisma.instagramMedia.findMany({
      where: { shopDomain: shop },
      orderBy: { timestamp: 'desc' },
      take: settings.postsPerPage,
    });

    const hiddenPosts = await prisma.hiddenPost.findMany({
      where: { shopDomain: shop }
    });
    const hiddenIds = new Set(hiddenPosts.map(hp => hp.mediaId));

    const visibleMedia = media.filter(m => !hiddenIds.has(m.id));

    // Enable CORS for Shopify storefronts
    const response = NextResponse.json({ settings, media: visibleMedia });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return response;
  } catch (error) {
    console.error('Widget API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  return response;
}
