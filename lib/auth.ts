import { shopify } from '@/lib/shopify';
import { NextRequest } from 'next/server';

export async function authenticate(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Missing or invalid Authorization header:', authHeader);
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    const payload = await shopify.session.decodeSessionToken(token);
    // payload.dest is typically "https://shop-domain.myshopify.com"
    return payload.dest.replace('https://', '');
  } catch (error) {
    console.error('Invalid session token:', error, 'Token was:', token);
    return null;
  }
}
