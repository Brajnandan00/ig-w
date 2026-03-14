'use client';

import React, { useState } from 'react';
import { Settings, LayoutGrid, Columns, GalleryHorizontalEnd, Crown, CheckCircle2, Copy, ExternalLink, Aperture, Instagram, RefreshCw } from 'lucide-react';
import GalleryWidget from '@/components/GalleryWidget';

declare global {
  interface Window {
    shopify?: {
      idToken: () => Promise<string>;
    };
  }
}

export default function Dashboard() {
  console.log('Dashboard component rendering');
  const [layout, setLayout] = useState<'grid' | 'masonry' | 'carousel'>('grid');
  const [tier, setTier] = useState<'free' | 'premium'>('free');
  const [isPremium, setIsPremium] = useState(false);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [count, setCount] = useState<number>(12);
  const [copied, setCopied] = useState(false);
  const [shop, setShop] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(true);
  const [igConnected, setIgConnected] = useState(false);
  const [igUsername, setIgUsername] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [galleryTitle, setGalleryTitle] = useState('Follow Our Social Feed');
  const [gallerySubtitle, setGallerySubtitle] = useState('Tag us in your photos to be featured on our gallery. Discover how others are styling our products.');

  // Helper to fetch with Shopify Session Token
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    let token = '';
    try {
      console.log('Attempting to get Shopify ID token...');
      
      // Create a timeout promise to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Shopify ID token retrieval timed out')), 2000)
      );

      if (window.shopify && window.shopify.idToken) {
        // Race the token retrieval against the timeout
        token = await Promise.race([window.shopify.idToken(), timeoutPromise]) as string;
        console.log('Successfully got Shopify ID token');
      } else {
        console.warn('window.shopify.idToken not found');
      }
    } catch (e) {
      console.error('Could not get Shopify ID token (proceeding anyway):', e);
      // We do NOT re-throw here, allowing the app to proceed without the token
    }

    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    console.log(`Fetching full URL: ${window.location.origin}${url}`);
    const res = await fetch(url, { ...options, headers });
    
    // If the backend returns 401, it means the token was missing or invalid.
    // We log it, but we don't throw an error that stops the app from loading.
    if (res.status === 401) {
      console.warn(`Unauthorized access to ${url}. Token might be missing or invalid.`);
    } else if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }
    
    return res;
  };

  React.useEffect(() => {
    console.log('useEffect triggered');
    // App Bridge automatically appends shop to the URL
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop');
    console.log('Shop parameter:', shopParam);
    setShop(shopParam);

    if (shopParam) {
      console.log('Fetching data for shop:', shopParam);
      authenticatedFetch(`/api/billing/status?shop=${shopParam}`)
        .then(res => res.json())
        .then(data => {
          console.log('Billing status fetched:', data);
          setIsPremium(data.hasActivePayment);
          setTier(data.hasActivePayment ? 'premium' : 'free');
          setLoadingBilling(false);
        })
        .catch((err) => {
          console.error('Billing status fetch failed:', err);
          setLoadingBilling(false);
        });

      authenticatedFetch(`/api/instagram/status?shop=${shopParam}`)
        .then(res => res.json())
        .then(data => {
          console.log('Instagram status fetched:', data);
          setIgConnected(data.connected);
          if (data.connected) {
            setIgUsername(data.username);
            setLastSyncedAt(data.lastSyncedAt);
          }
        })
        .catch(err => console.error('Instagram status fetch failed:', err));
    } else {
      console.log('No shop parameter, setting loadingBilling to false');
      setLoadingBilling(false);
    }
  }, []);

  const handleConnect = async () => {
    if (shop) {
      try {
        const res = await authenticatedFetch(`/api/instagram/auth?shop=${shop}`);
        const data = await res.json();
        if (data.authUrl) {
          window.open(data.authUrl, '_top');
        } else {
          console.error('Failed to get Instagram auth URL');
        }
      } catch (error) {
        console.error('Error initiating connection:', error);
      }
    } else {
      console.error('Shop parameter missing. Please open this app within Shopify Admin.');
    }
  };

  const handleSync = async () => {
    if (!shop) return;
    setIsSyncing(true);
    try {
      const res = await authenticatedFetch(`/api/instagram/sync?shop=${shop}`, { method: 'POST' });
      if (res.ok) {
        setLastSyncedAt(new Date().toISOString());
        // Force a reload of the widget
        window.location.reload();
      } else {
        console.error('Failed to sync posts. Please try again.');
      }
    } catch (error) {
      console.error('An error occurred while syncing.', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpgrade = async () => {
    if (shop) {
      try {
        const res = await authenticatedFetch(`/api/billing/subscribe?shop=${shop}`);
        const data = await res.json();
        if (data.confirmationUrl) {
          window.open(data.confirmationUrl, '_top');
        } else {
          console.error('Failed to get billing confirmation URL');
        }
      } catch (error) {
        console.error('Error initiating upgrade:', error);
      }
    }
  };

  const handleCopyCode = () => {
    const code = `<div class="social-grid-gallery" data-layout="${layout}" data-count="${count}"></div>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loadingBilling) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">Shop parameter missing</h2>
          <p className="text-zinc-600">
            Please open this app within your Shopify Admin to manage your Instagram gallery.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Top Navigation */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-2 rounded-xl text-white">
              <Aperture size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Social Grid Pro</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-zinc-500">Shopify App Dashboard</span>
            <div className="h-8 w-8 bg-zinc-200 rounded-full flex items-center justify-center font-bold text-zinc-600">
              M
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar Configuration */}
        <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings size={20} className="text-zinc-500" />
              <h2 className="text-lg font-semibold">Widget Settings</h2>
            </div>

            {/* Instagram Connection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-zinc-700 mb-3">Instagram Account</label>
              {igConnected ? (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                        <Instagram size={20} className="text-zinc-900" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">@{igUsername}</div>
                      <div className="text-xs text-zinc-500">Connected</div>
                    </div>
                    <button
                      onClick={async () => {
                        // In a real app, use a custom modal. For now, just disconnect directly
                        // since we cannot use window.confirm in an iframe.
                        await authenticatedFetch(`/api/instagram/disconnect?shop=${shop}`, { method: 'POST' });
                        window.location.reload();
                      }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="w-full py-2 px-3 bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? 'Syncing...' : 'Sync Posts'}
                  </button>
                  {lastSyncedAt && (
                    <div className="text-xs text-center text-zinc-400 mt-2">
                      Last synced: {new Date(lastSyncedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Instagram size={18} />
                  Connect Instagram
                </button>
              )}
            </div>

            {/* Tier Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-zinc-700 mb-3">Subscription Tier</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setTier('free');
                    setLayout('grid'); // Free tier only supports grid
                  }}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    tier === 'free' 
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-md' 
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  Free Plan
                </button>
                <button
                  onClick={() => {
                    if (!isPremium) {
                      handleUpgrade();
                    } else {
                      setTier('premium');
                    }
                  }}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    tier === 'premium' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-md' 
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <Crown size={16} />
                  {loadingBilling ? 'Loading...' : isPremium ? 'Premium' : 'Upgrade ($5/mo)'}
                </button>
              </div>
            </div>

            {/* Layout Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-zinc-700 mb-3">Gallery Layout</label>
              <div className="space-y-3">
                <button
                  onClick={() => setLayout('grid')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    layout === 'grid' 
                      ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700' 
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-600'
                  }`}
                >
                  <LayoutGrid size={20} />
                  <div className="text-left">
                    <div className="font-medium text-sm">Standard Grid</div>
                    <div className="text-xs opacity-80">Uniform square images</div>
                  </div>
                  {layout === 'grid' && <CheckCircle2 size={18} className="ml-auto" />}
                </button>

                <button
                  onClick={() => tier === 'premium' && setLayout('masonry')}
                  disabled={tier === 'free'}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    layout === 'masonry' 
                      ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700' 
                      : tier === 'free'
                        ? 'border-zinc-100 bg-zinc-50 text-zinc-400 cursor-not-allowed'
                        : 'border-zinc-200 hover:border-zinc-300 text-zinc-600'
                  }`}
                >
                  <Columns size={20} />
                  <div className="text-left">
                    <div className="font-medium text-sm flex items-center gap-2">
                      Masonry
                      {tier === 'free' && <Crown size={12} className="text-amber-500" />}
                    </div>
                    <div className="text-xs opacity-80">Natural aspect ratios</div>
                  </div>
                  {layout === 'masonry' && <CheckCircle2 size={18} className="ml-auto" />}
                </button>

                <button
                  onClick={() => tier === 'premium' && setLayout('carousel')}
                  disabled={tier === 'free'}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    layout === 'carousel' 
                      ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700' 
                      : tier === 'free'
                        ? 'border-zinc-100 bg-zinc-50 text-zinc-400 cursor-not-allowed'
                        : 'border-zinc-200 hover:border-zinc-300 text-zinc-600'
                  }`}
                >
                  <GalleryHorizontalEnd size={20} />
                  <div className="text-left">
                    <div className="font-medium text-sm flex items-center gap-2">
                      Carousel
                      {tier === 'free' && <Crown size={12} className="text-amber-500" />}
                    </div>
                    <div className="text-xs opacity-80">Horizontal swipeable slider</div>
                  </div>
                  {layout === 'carousel' && <CheckCircle2 size={18} className="ml-auto" />}
                </button>
              </div>
            </div>

            {/* Posts Count */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-zinc-700">Number of Posts</label>
                <span className="text-sm font-bold text-indigo-600">{count}</span>
              </div>
              <input 
                type="range" 
                min="4" 
                max="24" 
                step="4"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-2">
                <span>4</span>
                <span>24</span>
              </div>
            </div>

            {/* Content Configuration */}
            <div className="mb-8 pt-6 border-t border-zinc-200">
              <label className="block text-sm font-medium text-zinc-700 mb-3">Gallery Content</label>
              <div className="space-y-3">
                <input
                  type="text"
                  value={galleryTitle}
                  onChange={(e) => setGalleryTitle(e.target.value)}
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm"
                  placeholder="Gallery Title"
                />
                <textarea
                  value={gallerySubtitle}
                  onChange={(e) => setGallerySubtitle(e.target.value)}
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm"
                  rows={3}
                  placeholder="Gallery Subtitle"
                />
              </div>
            </div>

            {/* Integration Code */}
            <div className="pt-6 border-t border-zinc-200">
              <label className="block text-sm font-medium text-zinc-700 mb-3">Shopify Integration</label>
              <div className="bg-zinc-900 rounded-xl p-4 relative group">
                <code className="text-xs text-green-400 font-mono break-all">
                  &lt;div class=&quot;social-grid-gallery&quot;<br/>
                  &nbsp;&nbsp;data-layout=&quot;{layout}&quot;<br/>
                  &nbsp;&nbsp;data-count=&quot;{count}&quot;&gt;<br/>
                  &lt;/div&gt;
                </code>
                <button 
                  onClick={handleCopyCode}
                  className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <CheckCircle2 size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-3 flex items-center gap-1">
                Paste this in your Liquid template <ExternalLink size={12} />
              </p>
            </div>
          </div>
        </aside>

        {/* Live Preview Area */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col h-full min-h-[800px]">
            <div className="border-b border-zinc-200 p-4 bg-zinc-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span className="ml-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Storefront Preview</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg p-1">
                  <button
                    onClick={() => setIsEditMode(false)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${!isEditMode ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    Preview Mode
                  </button>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${isEditMode ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    Edit Mode
                  </button>
                </div>
                <div className="text-xs font-mono bg-zinc-200 text-zinc-600 px-2 py-1 rounded">
                  {layout} layout • {tier} tier
                </div>
              </div>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto bg-white">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-serif text-zinc-900 mb-4">{galleryTitle}</h2>
                  <p className="text-zinc-500 max-w-2xl mx-auto">
                    {gallerySubtitle}
                  </p>
                </div>
                
                {/* The actual gallery widget component */}
                <GalleryWidget layout={layout} tier={tier} count={count} shop={shop} isAdmin={isEditMode} />
                
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
