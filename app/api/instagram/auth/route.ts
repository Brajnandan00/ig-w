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

  const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_business_basic,instagram_manage_comments,instagram_business_manage_messages&response_type=code&state=${state}`;

  return NextResponse.json({ authUrl });
}
