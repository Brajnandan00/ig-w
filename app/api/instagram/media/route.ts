import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authShop = await authenticate(request);
  
  if (!authShop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const media = await prisma.instagramMedia.findMany({
      where: { shopDomain: authShop },
      orderBy: { timestamp: 'desc' },
      include: {
        productTags: true,
        hiddenPosts: true,
      }
    });

    return NextResponse.json({ media });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
