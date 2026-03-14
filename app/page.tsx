'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Aperture } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<string | null>(null);

  // Robust authenticated fetch
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    console.log('authenticatedFetch called for:', url);
    let token = '';
    try {
      if (window.shopify && window.shopify.idToken) {
        console.log('Attempting to get Shopify ID token...');
        token = await window.shopify.idToken();
        console.log('Shopify ID token obtained.');
      } else {
        console.warn('Shopify App Bridge not available or idToken not found.');
      }
    } catch (e) {
      console.warn('Could not get Shopify ID token, proceeding without it:', e);
    }

    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    console.log('Sending fetch request to:', url);
    const res = await fetch(url, { ...options, headers });
    console.log('Fetch response status:', res.status);
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
    console.log('Initiating Instagram connection...');
    try {
      const res = await authenticatedFetch(`/api/instagram/auth?shop=${shop}`);
      console.log('Auth URL response status:', res.status);
      const data = await res.json();
      console.log('Auth URL response data:', data);
      if (data.authUrl) {
        const popup = window.open(data.authUrl, 'InstagramAuth', 'width=600,height=600');
        if (!popup) {
          console.error('Popup was blocked by the browser.');
          alert('Please allow popups for this site to connect your Instagram account.');
        }
      } else {
        console.error('No authUrl in response');
      }
    } catch (error) {
      console.error('Error initiating connection:', error);
    }
  };

  const handleSync = async () => {
    if (!shop) return;
    setIsSyncing(true);
    try {
      const res = await authenticatedFetch(`/api/instagram/sync?shop=${shop}`, { method: 'POST' });
      if (res.ok) {
        setLastSyncedAt(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error syncing posts:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!shop) return;
    await authenticatedFetch(`/api/instagram/disconnect?shop=${shop}`, { method: 'POST' });
    window.location.reload();
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

          <div className="space-y-6">
            {/* Instagram Connection */}
            <div className="p-6 border border-zinc-200 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">Instagram Connection</h3>
              {igConnected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">@{igUsername}</div>
                    <div className="text-xs text-zinc-500">Connected</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSync} className="px-3 py-1 bg-zinc-100 rounded-md text-sm">Sync</button>
                    <button onClick={handleDisconnect} className="px-3 py-1 bg-red-100 text-red-600 rounded-md text-sm">Disconnect</button>
                  </div>
                </div>
              ) : (
                <button onClick={handleConnect} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Connect Instagram</button>
              )}
            </div>
            
            {/* Subscription */}
            <div className="p-6 border border-zinc-200 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">Subscription</h3>
              <p>Current Tier: <span className="font-bold">{tier}</span></p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
