import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authShop = await authenticate(request);

  if (!authShop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const shop = authShop;

  try {
    const account = await prisma.instagramAccount.findFirst({
      where: { shopDomain: shop },
    });

    if (account) {
      return NextResponse.json({
        connected: true,
        username: account.igUsername,
        lastSyncedAt: account.lastSyncedAt,
      });
    } else {
      return NextResponse.json({ connected: false });
    }
  } catch (error) {
    console.error('Error fetching Instagram status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
