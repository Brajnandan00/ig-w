import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = await authenticate(request) || searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stories = await prisma.instagramStory.findMany({
      where: { 
        shopDomain: shop,
        highlightId: null // Only active stories, not highlights
      },
      include: {
        productTags: true
      },
      orderBy: { timestamp: 'desc' }
    });

    const highlights = await prisma.instagramHighlight.findMany({
      where: { shopDomain: shop },
      include: {
        stories: {
          include: {
            productTags: true
          },
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    return NextResponse.json({ stories, highlights });
  } catch (error) {
    console.error('Failed to fetch stories:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
