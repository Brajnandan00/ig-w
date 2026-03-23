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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const account = await prisma.instagramAccount.findFirst({
      where: { shopDomain: shop },
    });

    if (!account) {
      return NextResponse.json({ error: 'No Instagram account linked' }, { status: 404 });
    }

    const accessToken = account.accessToken;

    // Fetch media from Instagram API
    const mediaUrl = `https://graph.instagram.com/v25.0/${account.igUserId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${accessToken}&limit=50`;
    const mediaRes = await fetch(mediaUrl);
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
      console.error('Instagram Media Error:', mediaData.error);
      return NextResponse.json({ error: `Instagram Error: ${mediaData.error.message}` }, { status: 400 });
    }

    const posts = mediaData.data;

    if (!posts || !Array.isArray(posts)) {
      return NextResponse.json({ error: 'Invalid media data from Instagram' }, { status: 500 });
    }

    // Save posts to database
    for (const post of posts) {
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
          engagementCount: 0,
          impressionCount: 0,
          syncedAt: new Date(),
        }
      });
    }

    // 2. Fetch Stories (Graph API for Business only)
    try {
      const storiesUrl = `https://graph.facebook.com/v25.0/${account.igBusinessAccountId}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp&access_token=${accessToken}`;
      const storiesRes = await fetch(storiesUrl);
      const storiesData = await storiesRes.json();

      if (storiesData.data && Array.isArray(storiesData.data)) {
        for (const story of storiesData.data) {
          await prisma.instagramStory.upsert({
            where: {
              id_shopDomain: {
                id: story.id,
                shopDomain: shop,
              }
            },
            update: {
              mediaType: story.media_type,
              mediaUrl: story.media_url,
              thumbnailUrl: story.thumbnail_url || null,
              timestamp: new Date(story.timestamp),
              syncedAt: new Date(),
            },
            create: {
              id: story.id,
              shopDomain: shop,
              accountId: account.id,
              mediaType: story.media_type,
              mediaUrl: story.media_url,
              thumbnailUrl: story.thumbnail_url || null,
              timestamp: new Date(story.timestamp),
              syncedAt: new Date(),
            }
          });
        }
      }
    } catch (err) {
      console.warn('Failed to sync stories (likely Basic Display API used):', err);
    }

    // 3. Fetch Highlights (Graph API for Business only)
    try {
      const highlightsUrl = `https://graph.facebook.com/v25.0/${account.igBusinessAccountId}/highlights?fields=id,name,cover_media&access_token=${accessToken}`;
      const highlightsRes = await fetch(highlightsUrl);
      const highlightsData = await highlightsRes.json();

      if (highlightsData.data && Array.isArray(highlightsData.data)) {
        for (const highlight of highlightsData.data) {
          // Get cover URL
          let coverUrl = '';
          if (highlight.cover_media && highlight.cover_media.media_url) {
            coverUrl = highlight.cover_media.media_url;
          }

          await prisma.instagramHighlight.upsert({
            where: {
              id_shopDomain: {
                id: highlight.id,
                shopDomain: shop,
              }
            },
            update: {
              title: highlight.name,
              coverUrl: coverUrl,
            },
            create: {
              id: highlight.id,
              shopDomain: shop,
              accountId: account.id,
              title: highlight.name,
              coverUrl: coverUrl,
            }
          });

          // Fetch stories for this highlight
          const highlightStoriesUrl = `https://graph.facebook.com/v25.0/${highlight.id}/media?fields=id,media_type,media_url,thumbnail_url,timestamp&access_token=${accessToken}`;
          const hStoriesRes = await fetch(highlightStoriesUrl);
          const hStoriesData = await hStoriesRes.json();

          if (hStoriesData.data && Array.isArray(hStoriesData.data)) {
            for (const story of hStoriesData.data) {
              await prisma.instagramStory.upsert({
                where: {
                  id_shopDomain: {
                    id: story.id,
                    shopDomain: shop,
                  }
                },
                update: {
                  highlightId: highlight.id,
                  mediaType: story.media_type,
                  mediaUrl: story.media_url,
                  thumbnailUrl: story.thumbnail_url || null,
                  timestamp: new Date(story.timestamp),
                  syncedAt: new Date(),
                },
                create: {
                  id: story.id,
                  shopDomain: shop,
                  accountId: account.id,
                  highlightId: highlight.id,
                  mediaType: story.media_type,
                  mediaUrl: story.media_url,
                  thumbnailUrl: story.thumbnail_url || null,
                  timestamp: new Date(story.timestamp),
                  syncedAt: new Date(),
                }
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync highlights:', err);
    }

    // Update lastSyncedAt
    await prisma.instagramAccount.update({
      where: { id: account.id },
      data: { lastSyncedAt: new Date() },
    });

    return NextResponse.json({ success: true, count: posts.length });

  } catch (error) {
    console.error('Instagram Sync Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
