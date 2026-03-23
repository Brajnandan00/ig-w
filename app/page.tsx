'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Aperture, 
  LayoutDashboard, 
  Instagram, 
  Image as ImageIcon, 
  Layers, 
  CreditCard,
  ChevronRight,
  LogOut,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import InstagramGallery from '@/components/InstagramGallery';
import WidgetManager from '@/components/WidgetManager';
import SettingsManager from '@/components/SettingsManager';

type Tab = 'dashboard' | 'gallery' | 'widgets' | 'settings' | 'billing';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<string | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Robust authenticated fetch
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    let token = '';
    try {
      if (typeof window !== 'undefined' && (window as any).shopify && (window as any).shopify.idToken) {
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
      
      if (data.needsReauth && data.authUrl) {
        // Redirect top window to re-authenticate
        if (window.top) {
          window.top.location.href = data.authUrl;
        } else {
          window.location.href = data.authUrl;
        }
        return;
      }

      if (data.confirmationUrl) {
        // Redirect top window to confirmation URL
        if (window.top) {
          window.top.location.href = data.confirmationUrl;
        } else {
          window.location.href = data.confirmationUrl;
        }
      } else {
        setError(data.error || 'Failed to get subscription URL. Please try again.');
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
          <p className="text-zinc-600 mb-4">This app is designed to run inside the Shopify Admin. Please open it from your Shopify store&apos;s Apps section.</p>
          <p className="text-sm text-zinc-500">If you are testing locally, ensure you have installed the app on a development store and are opening it through the Shopify Partner Dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-2 rounded-xl text-white">
              <Aperture size={20} />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Social Grid</h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard' 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('gallery')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'gallery' 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <ImageIcon size={18} />
            Shoppable Gallery
          </button>

          <button
            onClick={() => setActiveTab('widgets')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'widgets' 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <Layers size={18} />
            Feed Widgets
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'settings' 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <Settings size={18} />
            Settings
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'billing' 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <CreditCard size={18} />
            Subscription
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <div className="bg-zinc-50 rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">Store</div>
            <div className="text-xs font-medium truncate text-zinc-600">{shop}</div>
            <div className="mt-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${igConnected ? 'bg-green-500' : 'bg-zinc-300'}`}></div>
              <span className="text-[10px] text-zinc-500">{igConnected ? 'Instagram Connected' : 'Not Connected'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <header className="bg-white border-b border-zinc-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>Social Grid</span>
            <ChevronRight size={14} />
            <span className="font-medium text-zinc-900 capitalize">{activeTab.replace('-', ' ')}</span>
          </div>
          
          <div className="flex items-center gap-4">
            {igConnected && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-full border border-zinc-200">
                <Instagram size={14} className="text-pink-600" />
                <span className="text-xs font-medium">@{igUsername}</span>
              </div>
            )}
            <div className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded">
              {tier}
            </div>
          </div>
        </header>

        <main className="p-8 max-w-6xl">
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">Connection Status</div>
                  <div className="flex items-center gap-3">
                    {igConnected ? (
                      <>
                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                          <Instagram size={20} />
                        </div>
                        <div>
                          <div className="font-bold">Connected</div>
                          <div className="text-xs text-zinc-500">@{igUsername}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center">
                          <Instagram size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-zinc-400">Disconnected</div>
                          <button onClick={handleConnect} className="text-xs text-indigo-600 font-medium hover:underline">Connect now</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">Current Plan</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <div className="font-bold capitalize">{tier} Plan</div>
                      <button onClick={() => setActiveTab('billing')} className="text-xs text-indigo-600 font-medium hover:underline">
                        {tier === 'free' ? 'Upgrade' : 'Manage'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">Last Sync</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                      <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                    </div>
                    <div>
                      <div className="font-bold">{lastSyncedAt ? new Date(lastSyncedAt).toLocaleDateString() : 'Never'}</div>
                      <button 
                        onClick={handleSync} 
                        disabled={!igConnected || isSyncing}
                        className="text-xs text-indigo-600 font-medium hover:underline disabled:text-zinc-400 disabled:no-underline"
                      >
                        {isSyncing ? 'Syncing...' : 'Sync now'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {!igConnected && (
                <div className="bg-indigo-600 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="max-w-md text-center md:text-left">
                    <h3 className="text-xl font-bold mb-2">Connect your Instagram account</h3>
                    <p className="text-indigo-100 text-sm">Start showcasing your Instagram posts on your Shopify store to boost social proof and sales.</p>
                  </div>
                  <button 
                    onClick={handleConnect}
                    className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors shrink-0"
                  >
                    Connect Instagram
                  </button>
                </div>
              )}

              {igConnected && (
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="font-bold">Account Settings</h3>
                    <button 
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                      className="text-xs text-red-600 font-medium hover:underline disabled:text-zinc-400"
                    >
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect Account'}
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="w-12 h-12 bg-white rounded-full border border-zinc-200 flex items-center justify-center text-zinc-400">
                        <Instagram size={24} />
                      </div>
                      <div>
                        <div className="font-bold">@{igUsername}</div>
                        <div className="text-xs text-zinc-500">Instagram Business Account</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'gallery' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold">Shoppable Gallery</h2>
                <p className="text-zinc-500 text-sm">Tag products in your Instagram posts to make them shoppable.</p>
              </div>
              {igConnected ? (
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                  <InstagramGallery shop={shop} authenticatedFetch={authenticatedFetch} />
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-12 text-center">
                  <Instagram className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">Instagram not connected</h3>
                  <p className="text-zinc-500 mb-6 max-w-sm mx-auto">Please connect your Instagram account first to manage your shoppable gallery.</p>
                  <button onClick={() => setActiveTab('dashboard')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Go to Dashboard</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'widgets' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold">Feed Widgets</h2>
                <p className="text-zinc-500 text-sm">Create and manage Instagram feed widgets for your store.</p>
              </div>
              {igConnected ? (
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                  <WidgetManager shop={shop} authenticatedFetch={authenticatedFetch} />
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-12 text-center">
                  <Layers className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">Instagram not connected</h3>
                  <p className="text-zinc-500 mb-6 max-w-sm mx-auto">Please connect your Instagram account first to create feed widgets.</p>
                  <button onClick={() => setActiveTab('dashboard')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Go to Dashboard</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold">Settings</h2>
                <p className="text-zinc-500 text-sm">Configure your app preferences and display settings.</p>
              </div>
              {igConnected ? (
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                  <SettingsManager shop={shop} authenticatedFetch={authenticatedFetch} />
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-12 text-center">
                  <Settings className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">Instagram not connected</h3>
                  <p className="text-zinc-500 mb-6 max-w-sm mx-auto">Please connect your Instagram account first to configure settings.</p>
                  <button onClick={() => setActiveTab('dashboard')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Go to Dashboard</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold">Subscription</h2>
                <p className="text-zinc-500 text-sm">Manage your plan and billing details.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={`bg-white p-8 rounded-2xl border shadow-sm ${tier === 'free' ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-zinc-200'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">Free Plan</h3>
                      <p className="text-zinc-500 text-sm">Basic features for starters</p>
                    </div>
                    <div className="text-2xl font-bold">$0<span className="text-sm text-zinc-400 font-normal">/mo</span></div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2 text-sm text-zinc-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                      Up to 12 posts per feed
                    </li>
                    <li className="flex items-center gap-2 text-sm text-zinc-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                      Grid layout only
                    </li>
                    <li className="flex items-center gap-2 text-sm text-zinc-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                      Standard support
                    </li>
                  </ul>
                  {tier === 'free' ? (
                    <div className="w-full py-3 bg-zinc-100 text-zinc-500 text-center font-bold rounded-xl text-sm">Current Plan</div>
                  ) : (
                    <button className="w-full py-3 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-bold rounded-xl text-sm transition-colors">Downgrade</button>
                  )}
                </div>

                <div className={`bg-white p-8 rounded-2xl border shadow-sm ${tier === 'premium' ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-zinc-200'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">Premium Plan</h3>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded">Popular</span>
                      </div>
                      <p className="text-zinc-500 text-sm">Advanced features for growth</p>
                    </div>
                    <div className="text-2xl font-bold">$5<span className="text-sm text-zinc-400 font-normal">/mo</span></div>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-2 text-sm text-zinc-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                      Unlimited posts per feed
                    </li>
                    <li className="flex items-center gap-2 text-sm text-zinc-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                      Masonry & Carousel layouts
                    </li>
                    <li className="flex items-center gap-2 text-sm text-zinc-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                      Shoppable Gallery features
                    </li>
                    <li className="flex items-center gap-2 text-sm text-zinc-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                      Priority 24/7 support
                    </li>
                  </ul>
                  {tier === 'premium' ? (
                    <div className="w-full py-3 bg-zinc-100 text-zinc-500 text-center font-bold rounded-xl text-sm">Current Plan</div>
                  ) : (
                    <button 
                      onClick={handleSubscribe}
                      disabled={isSubscribing}
                      className="w-full py-3 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
                    >
                      {isSubscribing ? 'Processing...' : 'Upgrade Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
