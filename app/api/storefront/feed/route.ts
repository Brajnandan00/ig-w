import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// This is a public endpoint called by the Shopify storefront App Block
// We must enable CORS so the storefront can fetch the feed data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');
  const country = searchParams.get('country') || ''; // e.g., "US", "CA", "GB"
  const page = searchParams.get('page') || ''; // e.g., "index", "product", "collection"

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 });
  }

  try {
    // 1. Find all active widgets for this shop
    const widgets = await prisma.feedWidget.findMany({
      where: { shopDomain: shop, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Scoring logic to find the best matching widget for this user
    let bestWidget = null;
    let highestScore = -1;

    for (const widget of widgets) {
      let score = 0;
      let isMatch = true;

      // Check country targeting
      if (widget.targetCountries) {
        const countries = widget.targetCountries.split(',').map(c => c.trim().toUpperCase());
        if (countries.includes(country.toUpperCase())) {
          score += 2; // Specific country match is strong
        } else {
          isMatch = false; // Country targeted but didn't match the user
        }
      }

      // Check page targeting
      if (isMatch && widget.targetPages) {
        const pages = widget.targetPages.split(',').map(p => p.trim().toLowerCase());
        if (pages.includes(page.toLowerCase())) {
          score += 2; // Specific page match is strong
        } else {
          isMatch = false; // Page targeted but didn't match the current page
        }
      }

      if (isMatch && score > highestScore) {
        highestScore = score;
        bestWidget = widget;
      }
    }

    // 3. Fallback: If no specific widget matched, find a default one (no targeting rules)
    if (!bestWidget) {
      bestWidget = widgets.find(w => !w.targetCountries && !w.targetPages) || null;
    }

    // 4. Fetch the media based on the selected widget's settings
    let mediaQuery: any = { shopDomain: shop };
    
    // If the widget has a hashtag filter, only show posts containing that hashtag
    if (bestWidget?.hashtagFilter) {
      mediaQuery.caption = { contains: bestWidget.hashtagFilter };
    }

    const limit = bestWidget?.postsPerPage || 12;

    const media = await prisma.instagramMedia.findMany({
      where: mediaQuery,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        productTags: true, // Include shoppable tags
        hiddenPosts: true  // Include hidden posts to filter them out
      }
    });

    // Filter out posts that the merchant has explicitly hidden
    const visibleMedia = media.filter(post => post.hiddenPosts.length === 0);

    // Return the response with CORS headers
    return NextResponse.json({
      widget: bestWidget,
      media: visibleMedia,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow any storefront to fetch this
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    console.error('Storefront feed error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
