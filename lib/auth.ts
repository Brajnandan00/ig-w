import { shopify } from '@/lib/shopify';
import { NextRequest } from 'next/server';

export async function authenticate(req: NextRequest): Promise<string | null> {
  const url = new URL(req.url);
  const fallbackShop = url.searchParams.get('shop') || 'facebook-test-shop.myshopify.com';

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[TESTING MODE] Missing or invalid Authorization header. Using fallback shop: ${fallbackShop}`);
    return fallbackShop;
  }
  
  const token = authHeader.substring(7);
  if (!token) {
    console.warn(`[TESTING MODE] Empty token. Using fallback shop: ${fallbackShop}`);
    return fallbackShop;
  }

  try {
    const payload = await shopify.session.decodeSessionToken(token);
    // payload.dest is typically "https://shop-domain.myshopify.com"
    return payload.dest.replace('https://', '');
  } catch (error) {
    console.warn(`[TESTING MODE] Invalid session token. Using fallback shop: ${fallbackShop}`);
    return fallbackShop;
  }
}
