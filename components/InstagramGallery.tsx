import React, { useState, useEffect } from 'react';
import { Tag, ExternalLink, Image as ImageIcon, Video } from 'lucide-react';

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
  permalink: string;
  timestamp: string;
  productTags: MediaProductTag[];
}

export default function InstagramGallery({ shop, authenticatedFetch }: { shop: string, authenticatedFetch: any }) {
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<InstagramMedia | null>(null);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`/api/instagram/media?shop=${shop}`);
      const data = await res.json();
      if (data.media) {
        setMedia(data.media);
        return data.media;
      }
    } catch (err) {
      console.error('Failed to fetch media:', err);
      setError('Failed to load Instagram posts.');
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    fetchMedia();
  }, [shop]);

  const handleTagProduct = async (mediaId: string) => {
    // In a real app, this would open Shopify's ResourcePicker
    // For now, we'll simulate tagging a product
    const productId = `gid://shopify/Product/${Math.floor(Math.random() * 10000000000)}`;
    const productHandle = `sample-product-${Math.floor(Math.random() * 1000)}`;
    
    try {
      const res = await authenticatedFetch(`/api/instagram/media/tags?shop=${shop}`, {
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
        const updatedMedia = await fetchMedia(); // Refresh to show new tag
        if (updatedMedia) {
          const updatedPost = updatedMedia.find((m: InstagramMedia) => m.id === mediaId);
          if (updatedPost) setSelectedPost(updatedPost);
        }
      }
    } catch (err) {
      console.error('Failed to tag product:', err);
      alert('Failed to tag product');
    }
  };

  const handleRemoveTag = async (tagId: string, mediaId: string) => {
    try {
      const res = await authenticatedFetch(`/api/instagram/media/tags?shop=${shop}&tagId=${tagId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        const updatedMedia = await fetchMedia(); // Refresh to remove tag
        if (updatedMedia) {
          const updatedPost = updatedMedia.find((m: InstagramMedia) => m.id === mediaId);
          if (updatedPost) setSelectedPost(updatedPost);
        }
      }
    } catch (err) {
      console.error('Failed to remove tag:', err);
      alert('Failed to remove tag');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading your Instagram feed...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (media.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-zinc-200 rounded-xl">
        <ImageIcon className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-zinc-900 mb-2">No posts found</h3>
        <p className="text-zinc-500">Sync your Instagram account to see your posts here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Shoppable Feed</h3>
        <span className="text-sm text-zinc-500">{media.length} posts synced</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {media.map((post) => (
          <div key={post.id} className="group relative aspect-square bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200">
            {post.mediaType === 'VIDEO' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                <Video className="w-8 h-8 text-white opacity-50" />
              </div>
            ) : (
              <img 
                src={post.mediaUrl} 
                alt={post.caption || 'Instagram post'} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
              <button 
                onClick={() => setSelectedPost(post)}
                className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100 transition-colors w-full max-w-[160px] flex items-center justify-center gap-2"
              >
                <Tag size={16} />
                Manage Tags
              </button>
              <a 
                href={post.permalink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white/20 text-white text-sm font-medium rounded-lg hover:bg-white/30 transition-colors w-full max-w-[160px] flex items-center justify-center gap-2"
              >
                <ExternalLink size={16} />
                View on IG
              </a>
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
            {/* Image Side */}
            <div className="w-1/2 bg-zinc-100 relative flex items-center justify-center">
              {selectedPost.mediaType === 'VIDEO' ? (
                <div className="flex flex-col items-center text-zinc-500">
                  <Video className="w-12 h-12 mb-2" />
                  <span>Video Preview</span>
                </div>
              ) : (
                <img 
                  src={selectedPost.mediaUrl} 
                  alt="Post preview" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            
            {/* Sidebar */}
            <div className="w-1/2 flex flex-col h-full max-h-[90vh]">
              <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
                <h3 className="text-lg font-bold">Tag Products</h3>
                <button 
                  onClick={() => setSelectedPost(null)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                <p className="text-sm text-zinc-600 mb-6 line-clamp-3">{selectedPost.caption}</p>
                
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
                            onClick={() => handleRemoveTag(tag.id, selectedPost.id)}
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
                  onClick={() => handleTagProduct(selectedPost.id)}
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
