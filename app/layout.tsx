import type {Metadata} from 'next';
import './globals.css';

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
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const urlParams = new URLSearchParams(window.location.search);
              if (urlParams.get('shop') && urlParams.get('host')) {
                const script = document.createElement('script');
                script.src = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
                document.head.appendChild(script);
              }
            })();
          `
        }} />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              let appInstance = null;
              let appBridgePromise = new Promise((resolve) => {
                const checkAppBridge = () => {
                  if (window['app-bridge']) {
                    resolve(window['app-bridge']);
                  } else {
                    setTimeout(checkAppBridge, 100);
                  }
                };
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('shop') && urlParams.get('host')) {
                  checkAppBridge();
                }
              });

              window.shopify = {
                idToken: async () => {
                  if (!appInstance) {
                    const app = await appBridgePromise;
                    appInstance = app.default.create({
                      apiKey: "${process.env.SHOPIFY_API_KEY || process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || ""}",
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
