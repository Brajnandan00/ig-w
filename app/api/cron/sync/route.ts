import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.SESSION_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Get all Instagram accounts
    const accounts = await prisma.instagramAccount.findMany({
      include: {
        feedSettings: true,
      }
    });

    const results = [];

    for (const account of accounts) {
      const autoRefreshInterval = account.feedSettings?.autoRefreshInterval || 3600; // Default 1 hour
      
      const now = new Date();
      const lastSynced = account.lastSyncedAt || new Date(0);
      const secondsSinceLastSync = (now.getTime() - lastSynced.getTime()) / 1000;

      if (secondsSinceLastSync >= autoRefreshInterval) {
        try {
          // Fetch media from Instagram API
          const mediaUrl = `https://graph.instagram.com/v25.0/${account.igUserId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${account.accessToken}&limit=50`;
          const mediaRes = await fetch(mediaUrl);
          const mediaData = await mediaRes.json();

          if (mediaData.error) {
            console.error(`Instagram Media Error for ${account.shopDomain}:`, mediaData.error);
            results.push({ shop: account.shopDomain, status: 'error', message: mediaData.error.message });
            continue;
          }

          const posts = mediaData.data;

          if (!posts || !Array.isArray(posts)) {
            results.push({ shop: account.shopDomain, status: 'error', message: 'Invalid media data' });
            continue;
          }

          // Save posts to database
          for (const post of posts) {
            const finalMediaUrl = post.media_type === 'VIDEO' ? (post.thumbnail_url || post.media_url) : post.media_url;

            await prisma.instagramMedia.upsert({
              where: {
                id_shopDomain: {
                  id: post.id,
                  shopDomain: account.shopDomain,
                }
              },
              update: {
                caption: post.caption || '',
                mediaType: post.media_type,
                mediaUrl: finalMediaUrl,
                permalink: post.permalink,
                timestamp: new Date(post.timestamp),
                syncedAt: new Date(),
              },
              create: {
                id: post.id,
                shopDomain: account.shopDomain,
                accountId: account.id,
                caption: post.caption || '',
                mediaType: post.media_type,
                mediaUrl: finalMediaUrl,
                permalink: post.permalink,
                timestamp: new Date(post.timestamp),
                syncedAt: new Date(),
              }
            });
          }

          // Update lastSyncedAt
          await prisma.instagramAccount.update({
            where: { id: account.id },
            data: { lastSyncedAt: new Date() },
          });

          results.push({ shop: account.shopDomain, status: 'success', count: posts.length });
        } catch (syncError: any) {
          console.error(`Sync error for ${account.shopDomain}:`, syncError);
          results.push({ shop: account.shopDomain, status: 'error', message: syncError.message });
        }
      } else {
        results.push({ shop: account.shopDomain, status: 'skipped', reason: 'Not time yet' });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Cron Sync Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
