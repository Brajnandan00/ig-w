'use client';

import React, { useState, useEffect } from 'react';
import { Play, X, ShoppingBag, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';

interface StoryProductTag {
  id: string;
  productId: string;
  productHandle: string;
  x: number | null;
  y: number | null;
}

interface InstagramStory {
  id: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  timestamp: string;
  productTags: StoryProductTag[];
}

interface InstagramHighlight {
  id: string;
  title: string;
  coverUrl: string;
  stories: InstagramStory[];
}

export default function StoryGallery({ shop, authenticatedFetch }: { shop: string, authenticatedFetch: any }) {
  const [stories, setStories] = useState<InstagramStory[]>([]);
  const [highlights, setHighlights] = useState<InstagramHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStory, setActiveStory] = useState<{ stories: InstagramStory[], index: number } | null>(null);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        setLoading(true);
        const res = await authenticatedFetch(`/api/instagram/stories?shop=${shop}`);
        const data = await res.json();
        setStories(data.stories || []);
        setHighlights(data.highlights || []);
      } catch (err) {
        console.error('Failed to fetch stories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [shop, authenticatedFetch]);

  if (loading) return null;
  if (stories.length === 0 && highlights.length === 0) return null;

  const openStory = (storyList: InstagramStory[], index: number) => {
    setActiveStory({ stories: storyList, index });
  };

  const nextStory = () => {
    if (!activeStory) return;
    if (activeStory.index < activeStory.stories.length - 1) {
      setActiveStory({ ...activeStory, index: activeStory.index + 1 });
    } else {
      setActiveStory(null);
    }
  };

  const prevStory = () => {
    if (!activeStory) return;
    if (activeStory.index > 0) {
      setActiveStory({ ...activeStory, index: activeStory.index - 1 });
    }
  };

  return (
    <div className="w-full mb-8 overflow-x-auto no-scrollbar">
      <div className="flex gap-4 p-2">
        {/* Active Stories */}
        {stories.length > 0 && (
          <div 
            className="flex-shrink-0 cursor-pointer text-center"
            onClick={() => openStory(stories, 0)}
          >
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 to-fuchsia-600 mb-1">
              <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-zinc-100 relative">
                <Image 
                  src={stories[0].thumbnailUrl || stories[0].mediaUrl} 
                  fill
                  className="object-cover"
                  alt="Stories"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <span className="text-[10px] font-medium text-zinc-600">Stories</span>
          </div>
        )}

        {/* Highlights */}
        {highlights.map((highlight) => (
          <div 
            key={highlight.id} 
            className="flex-shrink-0 cursor-pointer text-center"
            onClick={() => openStory(highlight.stories, 0)}
          >
            <div className="w-16 h-16 rounded-full p-[2px] bg-zinc-200 mb-1">
              <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-zinc-100 relative">
                <Image 
                  src={highlight.coverUrl} 
                  fill
                  className="object-cover"
                  alt={highlight.title}
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <span className="text-[10px] font-medium text-zinc-600 truncate w-16 block">{highlight.title}</span>
          </div>
        ))}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {activeStory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          >
            <button 
              onClick={() => setActiveStory(null)}
              className="absolute top-6 right-6 text-white/70 hover:text-white z-[110]"
            >
              <X size={32} />
            </button>

            <div className="relative w-full max-w-md aspect-[9/16] bg-zinc-900 overflow-hidden rounded-2xl shadow-2xl">
              {/* Progress Bar */}
              <div className="absolute top-4 left-4 right-4 flex gap-1 z-[110]">
                {activeStory.stories.map((_, i) => (
                  <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-white transition-all duration-300 ${i === activeStory.index ? 'w-full' : i < activeStory.index ? 'w-full' : 'w-0'}`}
                    />
                  </div>
                ))}
              </div>

              {/* Media */}
              <div className="w-full h-full flex items-center justify-center">
                {activeStory.stories[activeStory.index].mediaType === 'VIDEO' ? (
                  <video 
                    src={activeStory.stories[activeStory.index].mediaUrl} 
                    autoPlay 
                    onEnded={nextStory}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image 
                    src={activeStory.stories[activeStory.index].mediaUrl} 
                    fill
                    className="object-cover"
                    alt="Story"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Navigation Areas */}
              <div className="absolute inset-0 flex">
                <div className="w-1/3 h-full cursor-pointer" onClick={prevStory} />
                <div className="w-2/3 h-full cursor-pointer" onClick={nextStory} />
              </div>

              {/* Tagged Products Overlay */}
              {activeStory.stories[activeStory.index].productTags.length > 0 && (
                <div className="absolute bottom-12 left-0 right-0 p-6 z-[110]">
                  <div className="space-y-3">
                    {activeStory.stories[activeStory.index].productTags.map(tag => (
                      <a 
                        key={tag.id}
                        href={`/products/${tag.productHandle}`}
                        className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors"
                      >
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <ShoppingBag size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{tag.productHandle}</p>
                          <p className="text-[10px] text-white/70">Shop Now</p>
                        </div>
                        <ExternalLink size={16} className="text-white/50" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
