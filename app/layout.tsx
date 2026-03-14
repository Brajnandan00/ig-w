import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Social Grid Pro',
  description: 'Manage your Instagram gallery for Shopify',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <meta name="shopify-api-key" content={process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || ""} />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              let appInstance = null;
              window.shopify = {
                idToken: async () => {
                  if (!appInstance) {
                    const app = window['app-bridge'];
                    if (!app) throw new Error('App Bridge not initialized');
                    appInstance = app.default.create({
                      apiKey: "${process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || ""}",
                      host: new URLSearchParams(window.location.search).get("host"),
                    });
                  }
                  return await appInstance.sessionToken();
                }
              };
            })();
          `
        }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
