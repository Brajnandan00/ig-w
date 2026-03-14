import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'My Google AI Studio App',
  description: 'My Google AI Studio App',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <meta name="shopify-api-key" content={process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || ""} />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', () => {
              const app = window['app-bridge'];
              if (app) {
                const createApp = app.default;
                const appInstance = createApp({
                  apiKey: "${process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || ""}",
                  host: new URLSearchParams(window.location.search).get("host"),
                });
                
                // Expose idToken to window.shopify
                window.shopify = {
                  idToken: async () => {
                    const sessionToken = await appInstance.sessionToken();
                    return sessionToken;
                  }
                };
              }
            });
          `
        }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
