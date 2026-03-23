import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const shop = await authenticate(req);
  if (!shop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await prisma.feedSettings.findUnique({
      where: { shopDomain: shop }
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const shop = await authenticate(req);
  if (!shop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    
    // Find the Instagram account to link the settings to
    const account = await prisma.instagramAccount.findFirst({
      where: { shopDomain: shop }
    });

    if (!account) {
      return NextResponse.json({ error: 'Instagram account not connected' }, { status: 400 });
    }

    const settings = await prisma.feedSettings.upsert({
      where: { shopDomain: shop },
      update: {
        autoRefreshInterval: parseInt(data.autoRefreshInterval) || 3600,
      },
      create: {
        shopDomain: shop,
        accountId: account.id,
        autoRefreshInterval: parseInt(data.autoRefreshInterval) || 3600,
        displayLayout: 'grid',
        postsPerPage: 12,
        enableLightbox: true,
      }
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
