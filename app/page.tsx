'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Aperture } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<string | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Robust authenticated fetch
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    let token = '';
    try {
      if ((window as any).shopify && (window as any).shopify.idToken) {
        token = await (window as any).shopify.idToken();
      }
    } catch (e) {
      console.warn('Could not get Shopify token:', e);
    }
    
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    const res = await fetch(url, { ...options, headers });
    if (!res.ok && res.status !== 401) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }
    return res;
  };

  const [igConnected, setIgConnected] = useState(false);
  const [igUsername, setIgUsername] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [tier, setTier] = useState<'free' | 'premium'>('free');
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop');
    setShop(shopParam);
    try {
      setIsEmbedded(window.self !== window.top);
    } catch (e) {
      setIsEmbedded(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        window.location.reload();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (shop) {
      // Fetch Instagram status
      authenticatedFetch(`/api/instagram/status?shop=${shop}`)
        .then(res => res.json())
        .then(data => {
          setIgConnected(data.connected);
          if (data.connected) {
            setIgUsername(data.username);
            setLastSyncedAt(data.lastSyncedAt);
          }
        })
        .catch(err => console.error('Instagram status fetch failed:', err));

      // Fetch Billing status
      authenticatedFetch(`/api/billing/status?shop=${shop}`)
        .then(res => res.json())
        .then(data => {
          setIsPremium(data.hasActivePayment);
          setTier(data.hasActivePayment ? 'premium' : 'free');
        })
        .catch(err => console.error('Billing status fetch failed:', err));
    }
  }, [shop]);

  const handleConnect = async () => {
    if (!shop) return;
    setError(null);
    
    // Open popup immediately to avoid popup blockers
    const popup = window.open('', 'InstagramAuth', 'width=600,height=600');
    if (!popup) {
      setError('Popup was blocked by the browser. Please allow popups for this site to connect your Instagram account.');
      return;
    }
    
    try {
      const res = await authenticatedFetch(`/api/instagram/auth?shop=${shop}`);
      const data = await res.json();
      if (data.authUrl) {
        popup.location.href = data.authUrl;
      } else {
        popup.close();
        setError('Failed to get authentication URL. Please try again.');
      }
    } catch (err) {
      popup.close();
      console.error('Error initiating connection:', err);
      setError('An error occurred while connecting to Instagram.');
    }
  };

  const handleSync = async () => {
    if (!shop) return;
    setIsSyncing(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`/api/instagram/sync?shop=${shop}`, { method: 'POST' });
      if (res.ok) {
        setLastSyncedAt(new Date().toISOString());
      } else {
        const errorText = await res.text();
        setError(`Failed to sync posts: ${errorText}`);
      }
    } catch (err) {
      console.error('Error syncing posts:', err);
      setError('An error occurred while syncing posts. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!shop) return;
    setIsDisconnecting(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`/api/instagram/disconnect?shop=${shop}`, { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      } else {
        const errorText = await res.text();
        setError(`Failed to disconnect: ${errorText}`);
        setIsDisconnecting(false);
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError('An error occurred while disconnecting. Please try again.');
      setIsDisconnecting(false);
    }
  };


  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async () => {
    if (!shop) return;
    setIsSubscribing(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`/api/billing/subscribe?shop=${shop}`);
      const data = await res.json();
      if (data.confirmationUrl) {
        // Redirect top window to confirmation URL
        if (window.top) {
          window.top.location.href = data.confirmationUrl;
        } else {
          window.location.href = data.confirmationUrl;
        }
      } else {
        setError('Failed to get subscription URL. Please try again.');
        setIsSubscribing(false);
      }
    } catch (err) {
      console.error('Error subscribing:', err);
      setError('An error occurred while initiating subscription.');
      setIsSubscribing(false);
    }
  };

  if (loading) {
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
          <h2 className="text-xl font-bold mb-2">Shop parameter missing</h2>
          <p className="text-zinc-600">Please open this app within your Shopify Admin.</p>
        </div>
      </div>
    );
  }

  if (!isEmbedded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 text-center max-w-md">
          <Aperture className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">App Must Be Embedded</h2>
          <p className="text-zinc-600 mb-4">This app is designed to run inside the Shopify Admin. Please open it from your Shopify store's Apps section.</p>
          <p className="text-sm text-zinc-500">If you are testing locally, ensure you have installed the app on a development store and are opening it through the Shopify Partner Dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <header className="bg-white border-b border-zinc-200 h-16 flex items-center px-8">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2 rounded-xl text-white">
            <Aperture size={20} />
          </div>
          <h1 className="text-lg font-bold">Social Grid Pro</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
          <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
          <p className="text-zinc-600 mb-6">Welcome back, {shop}.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
              <div className="mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Instagram Connection */}
            <div className="p-6 border border-zinc-200 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">Instagram Connection</h3>
              {igConnected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">@{igUsername}</div>
                    <div className="text-xs text-zinc-500">Connected</div>
                    {lastSyncedAt && <div className="text-xs text-zinc-400 ml-2">Last synced: {new Date(lastSyncedAt).toLocaleString()}</div>}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSync} 
                      disabled={isSyncing || isDisconnecting}
                      className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 rounded-md text-sm transition-colors"
                    >
                      {isSyncing ? 'Syncing...' : 'Sync'}
                    </button>
                    <button 
                      onClick={handleDisconnect} 
                      disabled={isSyncing || isDisconnecting}
                      className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 rounded-md text-sm transition-colors"
                    >
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleConnect} 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
                >
                  Connect Instagram
                </button>
              )}
            </div>
            
            {/* Subscription */}
            <div className="p-6 border border-zinc-200 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">Subscription</h3>
              <div className="flex items-center justify-between">
                <p>Current Tier: <span className="font-bold capitalize">{tier}</span></p>
                {tier === 'free' && (
                  <button 
                    onClick={handleSubscribe} 
                    disabled={isSubscribing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                  >
                    {isSubscribing ? 'Processing...' : 'Upgrade to Premium'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
