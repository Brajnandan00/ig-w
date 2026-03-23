import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const shop = await authenticate(req);
  if (!shop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const id = params.id;

    // Verify ownership
    const existing = await prisma.feedWidget.findUnique({ where: { id } });
    if (!existing || existing.shopDomain !== shop) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const widget = await prisma.feedWidget.update({
      where: { id },
      data: {
        name: data.name,
        targetCountries: data.targetCountries || null,
        targetPages: data.targetPages || null,
        hashtagFilter: data.hashtagFilter || null,
        displayLayout: data.displayLayout,
        postsPerPage: parseInt(data.postsPerPage) || 12,
        isActive: data.isActive,
      }
    });

    return NextResponse.json({ widget });
  } catch (error) {
    console.error('Error updating widget:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const shop = await authenticate(req);
  if (!shop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const id = params.id;

    // Verify ownership
    const existing = await prisma.feedWidget.findUnique({ where: { id } });
    if (!existing || existing.shopDomain !== shop) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.feedWidget.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting widget:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
