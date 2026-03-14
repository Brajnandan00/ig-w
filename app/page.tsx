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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop');
    setShop(shopParam);
    setLoading(false);
  }, []);

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
