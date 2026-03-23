import type {Metadata} from 'next';
import './globals.css';
import Script from 'next/script';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Social Grid Pro',
  description: 'Manage your Instagram gallery for Shopify',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <meta name="shopify-api-key" content={process.env.SHOPIFY_API_KEY || process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || ""} />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" crossOrigin="anonymous"></script>
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
