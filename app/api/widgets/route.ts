import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const shop = await authenticate(req);
  if (!shop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const widgets = await prisma.feedWidget.findMany({
      where: { shopDomain: shop },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ widgets });
  } catch (error) {
    console.error('Error fetching widgets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const shop = await authenticate(req);
  if (!shop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    
    const widget = await prisma.feedWidget.create({
      data: {
        shopDomain: shop,
        name: data.name || 'New Feed Widget',
        targetCountries: data.targetCountries || null,
        targetPages: data.targetPages || null,
        hashtagFilter: data.hashtagFilter || null,
        displayLayout: data.displayLayout || 'grid',
        postsPerPage: parseInt(data.postsPerPage) || 12,
        isActive: data.isActive !== undefined ? data.isActive : true,
      }
    });

    return NextResponse.json({ widget });
  } catch (error) {
    console.error('Error creating widget:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
