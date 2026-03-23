import React, { useState, useEffect, useCallback } from 'react';
import { Tag, ExternalLink, Image as ImageIcon, Video, Play, Layers, Clock, Eye, EyeOff } from 'lucide-react';
import StoryGallery from './StoryGallery';
import Image from 'next/image';

interface MediaProductTag {
  id: string;
  productId: string;
  productHandle: string;
  x: number | null;
  y: number | null;
}

interface InstagramMedia {
  id: string;
  caption: string | null;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string;
  productTags: MediaProductTag[];
}

interface InstagramStory {
  id: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  timestamp: string;
  productTags: MediaProductTag[];
  highlightId?: string | null;
}

export default function InstagramGallery({ shop, authenticatedFetch }: { shop: string, authenticatedFetch: any }) {
  const [activeTab, setActiveTab] = useState<'posts' | 'stories'>('posts');
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [stories, setStories] = useState<InstagramStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<InstagramMedia | InstagramStory | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`/api/instagram/media?shop=${shop}`);
      const data = await res.json();
      if (data.media) {
        setMedia(data.media);
      }
    } catch (err) {
      console.error('Failed to fetch media:', err);
      setError('Failed to load Instagram posts.');
    } finally {
      setLoading(false);
    }
  }, [shop, authenticatedFetch]);

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`/api/instagram/stories?shop=${shop}`);
      const data = await res.json();
      if (data.stories) {
        setStories([...data.stories, ...(data.highlights?.flatMap((h: any) => h.stories) || [])]);
      }
    } catch (err) {
      console.error('Failed to fetch stories:', err);
    } finally {
      setLoading(false);
    }
  }, [shop, authenticatedFetch]);

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchMedia();
    } else {
      fetchStories();
    }
  }, [activeTab, fetchMedia, fetchStories]);

  const handleTagProduct = async (mediaId: string, isStory: boolean = false) => {
    const productId = `gid://shopify/Product/${Math.floor(Math.random() * 10000000000)}`;
    const productHandle = `sample-product-${Math.floor(Math.random() * 1000)}`;
    
    try {
      const endpoint = isStory ? `/api/instagram/stories/tags?shop=${shop}` : `/api/instagram/media/tags?shop=${shop}`;
      const res = await authenticatedFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId,
          productId,
          productHandle,
          x: 50,
          y: 50
        })
      });
      
      if (res.ok) {
        if (isStory) {
          fetchStories();
        } else {
          fetchMedia();
        }
        // Update selected post to show new tag
        if (selectedPost) {
          const updatedList = isStory ? stories : media;
          const updatedPost = updatedList.find((m: any) => m.id === mediaId);
          if (updatedPost) setSelectedPost(updatedPost);
        }
      }
    } catch (err) {
      console.error('Failed to tag product:', err);
      alert('Failed to tag product');
    }
  };

  const handleRemoveTag = async (tagId: string, mediaId: string, isStory: boolean = false) => {
    try {
      const endpoint = isStory ? `/api/instagram/stories/tags?shop=${shop}&tagId=${tagId}` : `/api/instagram/media/tags?shop=${shop}&tagId=${tagId}`;
      const res = await authenticatedFetch(endpoint, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        if (isStory) {
          fetchStories();
        } else {
          fetchMedia();
        }
        // Update selected post
        if (selectedPost) {
          const updatedList = isStory ? stories : media;
          const updatedPost = updatedList.find((m: any) => m.id === mediaId);
          if (updatedPost) setSelectedPost(updatedPost);
        }
      }
    } catch (err) {
      console.error('Failed to remove tag:', err);
      alert('Failed to remove tag');
    }
  };

  if (loading && media.length === 0 && stories.length === 0) {
    return <div className="p-8 text-center text-zinc-500">Loading your Instagram feed...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'posts' ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
          >
            Posts
          </button>
          <button 
            onClick={() => setActiveTab('stories')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'stories' ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
          >
            Stories & Highlights
          </button>
        </div>
        <span className="text-sm text-zinc-500">
          {activeTab === 'posts' ? `${media.length} posts` : `${stories.length} stories`} synced
        </span>
      </div>

      {activeTab === 'stories' && (
        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
          <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4">Live Preview</h4>
          <StoryGallery shop={shop} authenticatedFetch={authenticatedFetch} />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {(activeTab === 'posts' ? media : stories).map((post) => (
          <div key={post.id} className="group relative aspect-square bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200">
            <Image 
              src={post.mediaType === 'VIDEO' ? (post.thumbnailUrl || post.mediaUrl) : post.mediaUrl} 
              alt={('caption' in post ? post.caption : 'Story') || 'Instagram post'} 
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
            
            {/* Indicators */}
            <div className="absolute top-2 left-2 flex gap-2 z-10">
              {post.mediaType === 'VIDEO' && (
                <div className="bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm">
                  <Play size={14} fill="currentColor" />
                </div>
              )}
              {'highlightId' in post && post.highlightId && (
                <div className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                  HIGHLIGHT
                </div>
              )}
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4 z-20">
              {post.mediaType === 'VIDEO' && (
                <div className="mb-2 p-3 bg-white/20 rounded-full backdrop-blur-md">
                  <Play size={24} fill="currentColor" className="text-white" />
                </div>
              )}
              <button 
                onClick={() => setSelectedPost(post)}
                className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 transition-colors w-full max-w-[160px] flex items-center justify-center gap-2"
              >
                <Tag size={16} />
                Manage Tags
              </button>
            </div>

            {/* Tag Indicator */}
            {post.productTags && post.productTags.length > 0 && (
              <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                <Tag size={12} />
                {post.productTags.length}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tagging Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex overflow-hidden">
            {/* Image/Video Side */}
            <div className="w-1/2 bg-zinc-100 relative flex items-center justify-center">
              {selectedPost.mediaType === 'VIDEO' ? (
                <video 
                  src={selectedPost.mediaUrl} 
                  controls 
                  autoPlay 
                  loop 
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image 
                  src={selectedPost.mediaUrl} 
                  alt="Post preview" 
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            
            {/* Sidebar */}
            <div className="w-1/2 flex flex-col h-full max-h-[90vh]">
              <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
                <h3 className="text-lg font-bold">Tag Products ({activeTab === 'posts' ? 'Post' : 'Story'})</h3>
                <button 
                  onClick={() => setSelectedPost(null)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                {'caption' in selectedPost && selectedPost.caption && (
                  <p className="text-sm text-zinc-600 mb-6 line-clamp-3">{selectedPost.caption}</p>
                )}
                
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wider">Tagged Products</h4>
                  {selectedPost.productTags && selectedPost.productTags.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPost.productTags.map(tag => (
                        <div key={tag.id} className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-200 rounded flex items-center justify-center">
                              <Tag size={16} className="text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{tag.productHandle}</p>
                              <p className="text-xs text-zinc-500">ID: {tag.productId.split('/').pop()}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveTag(tag.id, selectedPost.id, activeTab === 'stories')}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 italic">No products tagged yet.</p>
                  )}
                </div>

                <button 
                  onClick={() => handleTagProduct(selectedPost.id, activeTab === 'stories')}
                  className="w-full py-3 border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Tag size={18} />
                  Add Product Tag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
