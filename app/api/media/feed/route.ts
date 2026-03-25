import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get('tier') || 'premium';
  const count = parseInt(searchParams.get('count') || '12', 10);
  const shop = searchParams.get('shop');

  try {
    if (shop) {
      const account = await prisma.instagramAccount.findFirst({
        where: { shopDomain: shop }
      });

      if (account) {
        const dbMedia = await prisma.instagramMedia.findMany({
          where: { shopDomain: shop },
          orderBy: { timestamp: 'desc' },
          take: count,
        });

        const hiddenPosts = await prisma.hiddenPost.findMany({
          where: { shopDomain: shop }
        });
        const hiddenIds = new Set(hiddenPosts.map(hp => hp.mediaId));

        return NextResponse.json({
          media: dbMedia.map(m => ({
            ...m,
            timestamp: m.timestamp.getTime(),
            isHidden: hiddenIds.has(m.id)
          })),
          isFree: tier === 'free',
          tier
        });
      }
    }
  } catch (error) {
    console.error('Error fetching media from DB:', error);
    // Fall through to mock data on error
  }

  // Generate mock data based on the requested count
  const media = Array.from({ length: count }).map((_, index) => {
    // Mix of images, videos, and carousels
    const types = ['IMAGE', 'IMAGE', 'IMAGE', 'VIDEO', 'CAROUSEL'];
    const mediaType = types[index % types.length];
    
    // Generate different aspect ratios for masonry testing
    const heights = [800, 1000, 600, 1200, 900];
    const height = heights[index % heights.length];
    
    const mediaUrl = mediaType === 'VIDEO' ? 'https://www.w3schools.com/html/mov_bbb.mp4' : `https://picsum.photos/seed/insta${index + 1}/800/${height}`;
    const thumbnailUrl = mediaType === 'VIDEO' ? `https://picsum.photos/seed/thumb${index + 1}/800/${height}` : undefined;
    
    return {
      id: `post-${index + 1}`,
      caption: `Amazing moment captured! ✨ #photography #lifestyle #post${index + 1}`,
      mediaType,
      mediaUrl,
      thumbnailUrl,
      blurHash: "L1R]^~NGofS}01RjZ{oK", // Placeholder blurhash
      timestamp: Date.now() - (index * 86400000), // 1 day apart
      likes: Math.floor(Math.random() * 1000) + 50,
      comments: Math.floor(Math.random() * 100) + 5,
      isHidden: false,
      permalink: `https://instagram.com/p/post${index + 1}`
    };
  });

  return NextResponse.json({
    media,
    isFree: tier === 'free',
    tier
  });
}
