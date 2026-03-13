import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const shop = url.searchParams.get('shop');
  
  if (!shop) return NextResponse.json({ error: 'Missing shop' }, { status: 400 });

  try {
    const account = await prisma.instagramAccount.findFirst({ where: { shopDomain: shop } });
    if (!account) return NextResponse.json({ error: 'No Instagram account linked' }, { status: 404 });

    // Fetch media from Instagram
    const mediaRes = await fetch(`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${account.accessToken}`);
    const mediaData = await mediaRes.json();

    if (mediaData.data) {
      for (const item of mediaData.data) {
        await prisma.instagramMedia.upsert({
          where: { id_shopDomain: { id: item.id, shopDomain: shop } },
          update: {
            caption: item.caption,
            mediaUrl: item.media_url,
            blurHash: item.thumbnail_url || null, // using as placeholder
          },
          create: {
            id: item.id,
            shopDomain: shop,
            accountId: account.id,
            caption: item.caption,
            mediaType: item.media_type,
            mediaUrl: item.media_url,
            permalink: item.permalink,
            blurHash: item.thumbnail_url || null,
            timestamp: new Date(item.timestamp),
          }
        });
      }
    }

    return NextResponse.json({ success: true, count: mediaData.data?.length || 0 });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
