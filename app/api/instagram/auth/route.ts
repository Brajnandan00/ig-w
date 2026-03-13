import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const shop = url.searchParams.get('shop');
  
  if (!shop) return new NextResponse('Missing shop parameter', { status: 400 });

  const clientId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = `${process.env.APP_URL}/api/instagram/callback`;
  
  // Pass shop domain in state to recover it in callback
  const state = Buffer.from(JSON.stringify({ shop })).toString('base64');

  const igAuthUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code&state=${state}`;

  return NextResponse.redirect(igAuthUrl);
}
