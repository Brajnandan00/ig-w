import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shopQuery = searchParams.get('shop');
  const internalSecret = request.headers.get('x-internal-secret');
  
  // Authenticate the request via Shopify Session Token
  const authShop = await authenticate(request);
  
  // Allow internal calls with a secret
  const isInternal = internalSecret === process.env.SESSION_SECRET;
  const shop = authShop || (isInternal ? shopQuery : null);

  if (!shop) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const account = await prisma.instagramAccount.findFirst({
      where: { shopDomain: shop },
    });

    if (!account) {
      return new NextResponse('No Instagram account linked', { status: 404 });
    }

    const accessToken = account.accessToken;

    // Fetch media from Instagram API
    const mediaUrl = `https://graph.instagram.com/v25.0/${account.igUserId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${accessToken}&limit=50`;
    const mediaRes = await fetch(mediaUrl);
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
      console.error('Instagram Media Error:', mediaData.error);
      return new NextResponse(`Instagram Error: ${mediaData.error.message}`, { status: 400 });
    }

    const posts = mediaData.data;

    if (!posts || !Array.isArray(posts)) {
      return new NextResponse('Invalid media data from Instagram', { status: 500 });
    }

    // Save posts to database
    for (const post of posts) {
      // Basic Display API doesn't provide engagement metrics like likes/comments
      const likes = 0;
      const comments = 0;

      await prisma.instagramMedia.upsert({
        where: {
          id_shopDomain: {
            id: post.id,
            shopDomain: shop,
          }
        },
        update: {
          caption: post.caption || '',
          mediaType: post.media_type,
          mediaUrl: post.media_url,
          thumbnailUrl: post.thumbnail_url || null,
          permalink: post.permalink,
          timestamp: new Date(post.timestamp),
          syncedAt: new Date(),
        },
        create: {
          id: post.id,
          shopDomain: shop,
          accountId: account.id,
          caption: post.caption || '',
          mediaType: post.media_type,
          mediaUrl: post.media_url,
          thumbnailUrl: post.thumbnail_url || null,
          permalink: post.permalink,
          timestamp: new Date(post.timestamp),
          engagementCount: likes,
          impressionCount: comments,
          syncedAt: new Date(),
        }
      });
    }

    // Update lastSyncedAt
    await prisma.instagramAccount.update({
      where: { id: account.id },
      data: { lastSyncedAt: new Date() },
    });

    return NextResponse.json({ success: true, count: posts.length });

  } catch (error) {
    console.error('Instagram Sync Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
