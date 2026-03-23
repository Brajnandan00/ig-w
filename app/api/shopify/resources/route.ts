import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { shopify } from '@/lib/shopify';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const shop = await authenticate(req);
  if (!shop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const session = await prisma.session.findFirst({
      where: { shop }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const client = new shopify.clients.Graphql({ session: session as any });

    // Fetch collections and pages
    const query = `
      query {
        collections(first: 50) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
        pages(first: 50) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    `;

    const response: any = await client.request(query);

    const collections = response.data.collections.edges.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      handle: edge.node.handle,
      type: 'collection'
    }));

    const pages = response.data.pages.edges.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      handle: edge.node.handle,
      type: 'page'
    }));

    // Add standard page types
    const standardPages = [
      { id: 'index', title: 'Home Page', handle: 'index', type: 'standard' },
      { id: 'product', title: 'Product Pages', handle: 'product', type: 'standard' },
      { id: 'collection', title: 'Collection Pages', handle: 'collection', type: 'standard' },
      { id: 'cart', title: 'Cart Page', handle: 'cart', type: 'standard' },
      { id: 'search', title: 'Search Page', handle: 'search', type: 'standard' },
    ];

    return NextResponse.json({ 
      collections, 
      pages,
      standardPages
    });
  } catch (error) {
    console.error('Error fetching Shopify resources:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
