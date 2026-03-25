'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Play, Layers, Heart, MessageCircle, X, Share2, Download, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

declare global {
  interface Window {
    shopify?: {
      idToken: () => Promise<string>;
    };
  }
}

interface MediaItem {
  id: string;
  caption: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  mediaUrl: string;
  thumbnailUrl?: string;
  blurHash: string;
  timestamp: number;
  likes: number;
  comments: number;
  isHidden: boolean;
  permalink: string;
}

interface GalleryWidgetProps {
  layout: 'grid' | 'masonry' | 'carousel';
  tier: 'free' | 'premium';
  count: number;
  shop?: string | null;
  isAdmin?: boolean;
}

export default function GalleryWidget({ layout, tier, count, shop, isAdmin }: GalleryWidgetProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      console.log('GalleryWidget: Fetching media for shop:', shop);
      setLoading(true);
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const url = shop 
          ? `/api/media/feed?tier=${tier}&count=${count}&shop=${encodeURIComponent(shop)}`
          : `/api/media/feed?tier=${tier}&count=${count}`;
        
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        console.log('GalleryWidget: Received data:', data);
        setMedia(Array.isArray(data.media) ? data.media : []);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error('GalleryWidget: Fetch timed out');
        } else {
          console.error('GalleryWidget: Failed to fetch media:', error);
        }
        setMedia([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [tier, count, shop]);

  const toggleVisibility = async (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    if (!isAdmin || !shop) return;

    try {
      let token = '';
      if (window.shopify && window.shopify.idToken) {
        token = await window.shopify.idToken();
      }
      
      const res = await fetch('/api/media/toggle-visibility', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ shop, mediaId: item.id, isHidden: !item.isHidden }),
      });
      
      if (res.ok) {
        setMedia(prev => prev.map(m => m.id === item.id ? { ...m, isHidden: !m.isHidden } : m));
      }
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  };

  // Handle keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxItem) return;
      if (e.key === 'Escape') setLightboxItem(null);
      
      const currentIndex = media.findIndex(m => m.id === lightboxItem.id);
      if (e.key === 'ArrowRight' && currentIndex < media.length - 1) {
        setLightboxItem(media[currentIndex + 1]);
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setLightboxItem(media[currentIndex - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxItem, media]);

  const renderMediaItem = (item: MediaItem) => {
    if (!isAdmin && item.isHidden) return null;
    
    return (
    <div 
      key={item.id} 
      className={`group relative overflow-hidden rounded-xl bg-gray-100 cursor-pointer aspect-square w-full ${item.isHidden ? 'opacity-50 grayscale' : ''}`}
      onClick={() => setLightboxItem(item)}
    >
      {item.mediaType === 'VIDEO' ? (
        <div className="relative w-full h-full">
          <video
            src={item.mediaUrl}
            poster={item.thumbnailUrl}
            autoPlay
            muted
            loop
            playsInline
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/30 backdrop-blur-sm p-3 rounded-full text-white opacity-80 group-hover:opacity-100 transition-opacity">
              <Play size={24} fill="currentColor" />
            </div>
          </div>
        </div>
      ) : (
        <Image
          src={item.mediaUrl}
          alt={item.caption}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 50vw, 33vw"
          referrerPolicy="no-referrer"
        />
      )}
      
      {/* Badges */}
      <div className="absolute top-3 right-3 flex gap-2 z-10">
        {isAdmin && (
          <button 
            onClick={(e) => toggleVisibility(e, item)}
            className="bg-black/50 hover:bg-black/80 backdrop-blur-md p-1.5 rounded-full text-white transition-colors"
            title={item.isHidden ? "Show Post" : "Hide Post"}
          >
            {item.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {item.mediaType === 'VIDEO' && (
          <div className="bg-black/50 backdrop-blur-md p-1.5 rounded-full text-white">
            <Play size={16} fill="currentColor" />
          </div>
        )}
        {item.mediaType === 'CAROUSEL' && (
          <div className="bg-black/50 backdrop-blur-md p-1.5 rounded-full text-white">
            <Layers size={16} />
          </div>
        )}
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white p-4">
        <div className="flex gap-6 mb-4">
          <div className="flex items-center gap-2 font-semibold">
            <Heart size={20} fill="currentColor" /> {item.likes}
          </div>
          <div className="flex items-center gap-2 font-semibold">
            <MessageCircle size={20} fill="currentColor" /> {item.comments}
          </div>
        </div>
        <p className="text-sm line-clamp-2 text-center text-gray-200">
          {item.caption}
        </p>
      </div>
    </div>
    );
  };

  // Masonry requires different aspect ratios, so we adjust the container
  const renderMasonryItem = (item: MediaItem) => {
    if (!isAdmin && item.isHidden) return null;
    
    return (
    <div 
      key={item.id} 
      className={`group relative overflow-hidden rounded-xl bg-gray-100 cursor-pointer mb-4 break-inside-avoid ${item.isHidden ? 'opacity-50 grayscale' : ''}`}
      onClick={() => setLightboxItem(item)}
    >
      {/* For masonry, we use a trick to maintain natural aspect ratio or just let Image fill a relative container with padding-bottom */}
      {item.mediaType === 'VIDEO' ? (
        <div className="relative w-full h-auto">
          <video
            src={item.mediaUrl}
            poster={item.thumbnailUrl}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/30 backdrop-blur-sm p-3 rounded-full text-white opacity-80 group-hover:opacity-100 transition-opacity">
              <Play size={24} fill="currentColor" />
            </div>
          </div>
        </div>
      ) : (
        <Image
          src={item.mediaUrl}
          alt={item.caption}
          width={800}
          height={1000}
          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
      )}
      
      {/* Badges */}
      <div className="absolute top-3 right-3 flex gap-2 z-10">
        {isAdmin && (
          <button 
            onClick={(e) => toggleVisibility(e, item)}
            className="bg-black/50 hover:bg-black/80 backdrop-blur-md p-1.5 rounded-full text-white transition-colors"
            title={item.isHidden ? "Show Post" : "Hide Post"}
          >
            {item.isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {item.mediaType === 'VIDEO' && (
          <div className="bg-black/50 backdrop-blur-md p-1.5 rounded-full text-white">
            <Play size={16} fill="currentColor" />
          </div>
        )}
        {item.mediaType === 'CAROUSEL' && (
          <div className="bg-black/50 backdrop-blur-md p-1.5 rounded-full text-white">
            <Layers size={16} />
          </div>
        )}
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center text-white p-4">
        <div className="flex gap-6 mb-4">
          <div className="flex items-center gap-2 font-semibold">
            <Heart size={20} fill="currentColor" /> {item.likes}
          </div>
          <div className="flex items-center gap-2 font-semibold">
            <MessageCircle size={20} fill="currentColor" /> {item.comments}
          </div>
        </div>
      </div>
    </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-300">
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
          <Layers className="text-zinc-400" size={24} />
        </div>
        <h3 className="text-lg font-medium text-zinc-900 mb-1">No posts found</h3>
        <p className="text-sm text-zinc-500 text-center max-w-sm">
          Connect your Instagram account and sync your posts to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Layout Rendering */}
      {layout === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map(renderMediaItem)}
        </div>
      )}

      {layout === 'masonry' && (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {media.map(renderMasonryItem)}
        </div>
      )}

      {layout === 'carousel' && (
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={16}
          slidesPerView={1.5}
          breakpoints={{
            640: { slidesPerView: 2.5 },
            768: { slidesPerView: 3.5 },
            1024: { slidesPerView: 4.5 },
          }}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          className="w-full !pb-12"
        >
          {media.map((item) => (
            <SwiperSlide key={item.id}>
              {renderMediaItem(item)}
            </SwiperSlide>
          ))}
        </Swiper>
      )}

      {/* Lightbox Modal */}
      {lightboxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-8">
          <button 
            onClick={() => setLightboxItem(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-50"
          >
            <X size={32} />
          </button>
          
          <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
            {/* Image Area */}
            <div className="relative w-full md:w-2/3 h-[50vh] md:h-[80vh] bg-black flex items-center justify-center">
              {lightboxItem.mediaType === 'VIDEO' ? (
                <video 
                  src={lightboxItem.mediaUrl} 
                  autoPlay
                  controls
                  loop
                  playsInline
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <Image 
                  src={lightboxItem.mediaUrl} 
                  alt={lightboxItem.caption}
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            
            {/* Details Area */}
            <div className="w-full md:w-1/3 p-6 flex flex-col h-[40vh] md:h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                    <div className="w-full h-full bg-black rounded-full border-2 border-black" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">@yourstore</p>
                    <p className="text-xs text-zinc-400">
                      {formatDistanceToNow(lightboxItem.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <a 
                  href={lightboxItem.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  View Post
                </a>
              </div>
              
              <div className="flex-1">
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                  {lightboxItem.caption}
                </p>
              </div>
              
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-4">
                    <button className="text-white hover:text-red-500 transition-colors">
                      <Heart size={24} />
                    </button>
                    <button className="text-white hover:text-zinc-300 transition-colors">
                      <MessageCircle size={24} />
                    </button>
                    <button className="text-white hover:text-zinc-300 transition-colors">
                      <Share2 size={24} />
                    </button>
                  </div>
                  {tier === 'premium' && (
                    <button className="text-white hover:text-zinc-300 transition-colors">
                      <Download size={24} />
                    </button>
                  )}
                </div>
                <p className="font-semibold text-sm text-white">
                  {lightboxItem.likes.toLocaleString()} likes
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
