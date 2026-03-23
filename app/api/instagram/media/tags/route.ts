import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const authShop = await authenticate(request);
  
  if (!authShop) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { mediaId, productId, productHandle, x, y } = await request.json();

    if (!mediaId || !productId || !productHandle) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Verify media belongs to shop
    const media = await prisma.instagramMedia.findUnique({
      where: { id_shopDomain: { id: mediaId, shopDomain: authShop } }
    });

    if (!media) {
      return new NextResponse('Media not found', { status: 404 });
    }

    const tag = await prisma.mediaProductTag.create({
      data: {
        mediaId,
        shopDomain: authShop,
        productId,
        productHandle,
        x,
        y
      }
    });

    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Error adding tag:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authShop = await authenticate(request);
  
  if (!authShop) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return new NextResponse('Missing tagId', { status: 400 });
    }

    // Verify tag belongs to shop
    const tag = await prisma.mediaProductTag.findUnique({
      where: { id: tagId }
    });

    if (!tag || tag.shopDomain !== authShop) {
      return new NextResponse('Tag not found', { status: 404 });
    }

    await prisma.mediaProductTag.delete({
      where: { id: tagId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
