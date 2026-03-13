import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tier = searchParams.get('tier') || 'premium';
  const count = parseInt(searchParams.get('count') || '12', 10);

  // Generate mock data based on the requested count
  const media = Array.from({ length: count }).map((_, index) => {
    // Mix of images, videos, and carousels
    const types = ['IMAGE', 'IMAGE', 'IMAGE', 'VIDEO', 'CAROUSEL'];
    const mediaType = types[index % types.length];
    
    // Generate different aspect ratios for masonry testing
    const heights = [800, 1000, 600, 1200, 900];
    const height = heights[index % heights.length];
    
    return {
      id: `post-${index + 1}`,
      caption: `Amazing moment captured! ✨ #photography #lifestyle #post${index + 1}`,
      mediaType,
      mediaUrl: `https://picsum.photos/seed/insta${index + 1}/800/${height}`,
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
