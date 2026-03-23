import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return new NextResponse('Missing code or state', { status: 400 });
  }

  let shop = '';
  try {
    const decodedState = JSON.parse(decodeURIComponent(state));
    shop = decodedState.shop;
  } catch (e) {
    return new NextResponse('Invalid state parameter', { status: 400 });
  }

  if (!shop) {
    return new NextResponse('Missing shop in state', { status: 400 });
  }

  const clientId = process.env.INSTAGRAM_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  const baseUrl = process.env.APP_URL?.replace(/\/$/, '');
  const redirectUri = `${baseUrl}/api/instagram/callback`;

  if (!clientId || !clientSecret || !baseUrl) {
    return new NextResponse('Instagram integration is not configured.', { status: 500 });
  }

  try {
    // 1. Exchange code for short-lived token
    const tokenForm = new URLSearchParams();
    tokenForm.append('client_id', clientId);
    tokenForm.append('client_secret', clientSecret);
    tokenForm.append('grant_type', 'authorization_code');
    tokenForm.append('redirect_uri', redirectUri);
    tokenForm.append('code', code);

    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: tokenForm,
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error_message) {
      console.error('Instagram Token Error:', tokenData);
      return new NextResponse(`Instagram Error: ${tokenData.error_message}`, { status: 400 });
    }

    const shortLivedToken = tokenData.access_token;
    const userId = tokenData.user_id;

    // 2. Exchange short-lived token for long-lived token
    const longLivedUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortLivedToken}`;
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();

    if (longLivedData.error) {
      console.error('Instagram Long Lived Token Error:', longLivedData);
      return new NextResponse(`Instagram Error: ${longLivedData.error.message}`, { status: 400 });
    }

    const longLivedToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // 3. Get user profile
    const profileUrl = `https://graph.instagram.com/v25.0/me?fields=user_id,username&access_token=${longLivedToken}`;
    const profileRes = await fetch(profileUrl);
    const profileData = await profileRes.json();

    if (profileData.error) {
      console.error('Instagram Profile Error:', profileData);
      return new NextResponse(`Instagram Error: ${profileData.error.message}`, { status: 400 });
    }

    // The new API returns data in a data array
    const userData = profileData.data && profileData.data.length > 0 ? profileData.data[0] : profileData;
    const username = userData.username;
    const igUserId = userData.user_id || userData.id;

    // 4. Save to database
    await prisma.instagramAccount.upsert({
      where: {
        shopDomain_igUsername: {
          shopDomain: shop,
          igUsername: username,
        }
      },
      update: {
        accessToken: longLivedToken,
        refreshTokenExpires: expiresAt,
        igUserId: igUserId,
        igBusinessAccountId: igUserId, // Using the same ID for basic display API
        followerCount: 0, // Basic Display API doesn't provide follower count
      },
      create: {
        shopDomain: shop,
        igUserId: igUserId,
        igBusinessAccountId: igUserId,
        igUsername: username,
        accessToken: longLivedToken,
        refreshTokenExpires: expiresAt,
        followerCount: 0,
      }
    });

    // 5. Trigger initial sync in the background
    fetch(`${baseUrl}/api/instagram/sync?shop=${shop}`, { 
      method: 'POST',
      headers: {
        'x-internal-secret': process.env.SESSION_SECRET || ''
      }
    }).catch(console.error);

    // 6. Return HTML to close popup and notify opener
    return new NextResponse(`
      <html>
        <body>
          <script>
            console.log('Popup loaded, opener:', window.opener);
            if (window.opener) {
              console.log('Sending message to opener...');
              try {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                console.log('Message sent.');
              } catch (e) {
                console.error('Error sending message:', e);
              }
              // window.close();
            } else {
              console.log('No opener, redirecting...');
              window.location.href = '/?shop=${shop}&ig_connected=true';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Instagram Callback Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
