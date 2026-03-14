'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Aperture } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<string | null>(null);

  // Robust authenticated fetch
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    let token = '';
    try {
      if (window.shopify && window.shopify.idToken) {
        token = await window.shopify.idToken();
      }
    } catch (e) {
      console.warn('Could not get Shopify ID token, proceeding without it:', e);
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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop');
    setShop(shopParam);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (shop) {
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
    }
  }, [shop]);

  const handleConnect = async () => {
    if (!shop) return;
    try {
      const res = await authenticatedFetch(`/api/instagram/auth?shop=${shop}`);
      const data = await res.json();
      if (data.authUrl) {
        window.open(data.authUrl, '_top');
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
          <p className="text-zinc-600">Welcome back, {shop}. The app is now running on a clean foundation.</p>
        </div>
      </main>
    </div>
  );
}
