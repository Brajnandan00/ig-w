import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = await authenticate(request) || searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { mediaId, productId, productHandle, x, y } = await request.json();

    const tag = await prisma.storyProductTag.create({
      data: {
        storyId: mediaId,
        shopDomain: shop,
        productId,
        productHandle,
        x,
        y
      }
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Failed to tag story:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = await authenticate(request) || searchParams.get('shop');
  const tagId = searchParams.get('tagId');

  if (!shop || !tagId) {
    return NextResponse.json({ error: 'Unauthorized or missing tagId' }, { status: 401 });
  }

  try {
    await prisma.storyProductTag.delete({
      where: {
        id: tagId,
        shopDomain: shop
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove story tag:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
