import '@shopify/shopify-api/adapters/web-api';
import { shopifyApi, ApiVersion, LogSeverity, BillingInterval } from '@shopify/shopify-api';
import { PrismaSessionStorage } from '@shopify/shopify-app-session-storage-prisma';
import { prisma } from './prisma';

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || 'dummy_key_for_build',
  apiSecretKey: process.env.SHOPIFY_API_SECRET || 'dummy_secret_for_build',
  scopes: ['read_themes', 'write_themes', 'read_products'],
  hostName: process.env.APP_URL?.replace(/https:\/\//, '') || 'localhost:3000',
  apiVersion: ApiVersion.January25,
  isEmbeddedApp: true,
  logger: { level: process.env.NODE_ENV === 'production' ? LogSeverity.Warning : LogSeverity.Info },
  sessionStorage: new PrismaSessionStorage(prisma),
  billing: {
    'Premium Plan': {
      amount: 5.0,
      currencyCode: 'USD',
      interval: BillingInterval.Every30Days as any,
    },
  },
});
