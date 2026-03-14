import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const authShop = await authenticate(request);

  if (!authShop) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const shop = authShop;

  try {
    // This will cascade and delete associated InstagramMedia and FeedSettings
    await prisma.instagramAccount.deleteMany({
      where: { shopDomain: shop },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Instagram:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
