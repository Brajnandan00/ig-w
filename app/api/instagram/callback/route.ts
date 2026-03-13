import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) return new NextResponse('Missing code or state', { status: 400 });

  try {
    const { shop } = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const redirectUri = `${process.env.APP_URL}/api/instagram/callback`;

    // 1. Exchange code for short-lived token
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID || '',
        client_secret: process.env.INSTAGRAM_APP_SECRET || '',
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      })
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error_message) throw new Error(tokenData.error_message);

    // 2. Exchange for long-lived token
    const longTokenRes = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${tokenData.access_token}`);
    const longTokenData = await longTokenRes.json();

    // 3. Get user profile
    const profileRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${longTokenData.access_token}`);
    const profileData = await profileRes.json();

    // 4. Save to database
    await prisma.instagramAccount.upsert({
      where: { shopDomain_igUsername: { shopDomain: shop, igUsername: profileData.username } },
      update: {
        igUserId: profileData.id,
        igBusinessAccountId: profileData.id,
        accessToken: longTokenData.access_token,
        refreshTokenExpires: new Date(Date.now() + longTokenData.expires_in * 1000),
      },
      create: {
        shopDomain: shop,
        igUserId: profileData.id,
        igBusinessAccountId: profileData.id,
        igUsername: profileData.username,
        accessToken: longTokenData.access_token,
        refreshTokenExpires: new Date(Date.now() + longTokenData.expires_in * 1000),
      }
    });

    // Trigger initial sync in the background
    fetch(`${process.env.APP_URL}/api/instagram/sync?shop=${shop}`, { method: 'POST' }).catch(console.error);

    // Redirect back to app
    return NextResponse.redirect(`https://admin.shopify.com/store/${shop.split('.')[0]}/apps/${process.env.SHOPIFY_API_KEY}`);
  } catch (error) {
    console.error('Instagram callback error:', error);
    return new NextResponse('Authentication failed', { status: 500 });
  }
}
