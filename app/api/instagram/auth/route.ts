import { NextResponse, NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authShop = await authenticate(request);

  if (!authShop) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const shop = authShop;

  const clientId = process.env.INSTAGRAM_APP_ID;
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '');
  const redirectUri = `${baseUrl}/api/instagram/callback`;

  if (!clientId || !baseUrl) {
    return new NextResponse('Instagram integration is not configured. Please set INSTAGRAM_APP_ID and APP_URL environment variables.', { status: 500 });
  }

  // Pass the shop domain in the state parameter to retrieve it in the callback
  const state = encodeURIComponent(JSON.stringify({ shop }));

  const scope = 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights';
  const authUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;

  return NextResponse.json({ authUrl });
}
