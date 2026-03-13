import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shop, mediaId, isHidden } = body;

    if (!shop || !mediaId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (isHidden) {
      // Check if media exists
      const media = await prisma.instagramMedia.findUnique({
        where: {
          id_shopDomain: {
            id: mediaId,
            shopDomain: shop,
          }
        }
      });

      if (!media) {
        // If it's mock data, just return success
        return NextResponse.json({ success: true, mock: true });
      }

      // Add to HiddenPost
      await prisma.hiddenPost.upsert({
        where: {
          mediaId_shopDomain: {
            mediaId,
            shopDomain: shop,
          }
        },
        update: {},
        create: {
          mediaId,
          shopDomain: shop,
          reason: 'Hidden by admin',
        }
      });
    } else {
      // Remove from HiddenPost
      await prisma.hiddenPost.deleteMany({
        where: {
          mediaId,
          shopDomain: shop,
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Toggle visibility error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
