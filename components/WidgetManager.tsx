import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Edit2, Trash2, Globe, Layout, Hash, FileText, Check, X, Play } from 'lucide-react';

interface FeedWidget {
  id: string;
  name: string;
  targetCountries: string | null;
  targetPages: string | null;
  hashtagFilter: string | null;
  displayLayout: string;
  postsPerPage: number;
  isActive: boolean;
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
];

export default function WidgetManager({ shop, authenticatedFetch }: { shop: string, authenticatedFetch: any }) {
  const [widgets, setWidgets] = useState<FeedWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingWidget, setEditingWidget] = useState<FeedWidget | Partial<FeedWidget> | null>(null);
  
  const [media, setMedia] = useState<any[]>([]);
  
  const [resources, setResources] = useState<{
    collections: any[],
    pages: any[],
    standardPages: any[]
  }>({ collections: [], pages: [], standardPages: [] });

  const fetchWidgets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`/api/widgets?shop=${shop}`);
      const data = await res.json();
      if (data.widgets) {
        setWidgets(data.widgets);
      }
    } catch (err) {
      console.error('Failed to fetch widgets:', err);
      setError('Failed to load feed widgets.');
    } finally {
      setLoading(false);
    }
  }, [shop, authenticatedFetch]);

  const fetchResources = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`/api/shopify/resources?shop=${shop}`);
      const data = await res.json();
      if (data.collections) {
        setResources(data);
      }
    } catch (err) {
      console.error('Failed to fetch resources:', err);
    }
  }, [shop, authenticatedFetch]);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`/api/instagram/media?shop=${shop}`);
      const data = await res.json();
      if (data.media) {
        setMedia(data.media.slice(0, 12));
      }
    } catch (err) {
      console.error('Failed to fetch media for preview:', err);
    }
  }, [shop, authenticatedFetch]);

  useEffect(() => {
    fetchWidgets();
    fetchResources();
    fetchMedia();
  }, [fetchWidgets, fetchResources, fetchMedia]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWidget) return;

    try {
      const isNew = !('id' in editingWidget);
      const url = isNew 
        ? `/api/widgets?shop=${shop}` 
        : `/api/widgets/${editingWidget.id}?shop=${shop}`;
      
      const res = await authenticatedFetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingWidget)
      });

      if (res.ok) {
        setEditingWidget(null);
        fetchWidgets();
      } else {
        const errorData = await res.json();
        alert(`Failed to save widget: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to save widget:', err);
      alert('Failed to save widget');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this widget?')) return;
    
    try {
      const res = await authenticatedFetch(`/api/widgets/${id}?shop=${shop}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        fetchWidgets();
      } else {
        alert('Failed to delete widget');
      }
    } catch (err) {
      console.error('Failed to delete widget:', err);
      alert('Failed to delete widget');
    }
  };

  const toggleSelection = (field: 'targetPages' | 'targetCountries', value: string) => {
    if (!editingWidget) return;
    const current = editingWidget[field] || '';
    const items = current ? current.split(',').filter(Boolean) : [];
    
    let next;
    if (items.includes(value)) {
      next = items.filter(i => i !== value).join(',');
    } else {
      next = [...items, value].join(',');
    }
    
    setEditingWidget({ ...editingWidget, [field]: next });
  };

  const GridPreview = ({ layout, count }: { layout: string, count: number }) => {
    const displayCount = Math.min(count, 12);
    const items = media.length > 0 ? media.slice(0, displayCount) : Array.from({ length: displayCount });
    
    return (
      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Layout Preview: {layout}</div>
          <div className="text-[10px] text-zinc-400">Showing {items.length} of {count} posts</div>
        </div>
        
        <div className={`grid gap-2 ${
          layout === 'grid' ? 'grid-cols-4' : 
          layout === 'carousel' ? 'grid-cols-6 overflow-hidden' : 
          layout === 'masonry' ? 'grid-cols-3' : 
          layout === 'swipe' ? 'grid-cols-3' : 'grid-cols-4'
        }`}>
          {items.map((item, i) => (
            <div 
              key={i} 
              className={`bg-zinc-200 rounded-md aspect-square relative overflow-hidden group ${
                layout === 'masonry' && i % 3 === 1 ? 'aspect-[3/4]' : ''
              }`}
            >
              {item && 'mediaUrl' in item ? (
                <>
                  <img 
                    src={item.mediaType === 'VIDEO' ? (item.thumbnailUrl || item.mediaUrl) : item.mediaUrl} 
                    className="w-full h-full object-cover"
                    alt=""
                  />
                  {item.mediaType === 'VIDEO' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play size={12} fill="currentColor" className="text-white opacity-80" />
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 animate-pulse" />
              )}
            </div>
          ))}
        </div>
        
        {layout === 'carousel' && (
          <div className="flex justify-center gap-1 mt-3">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
          </div>
        )}
      </div>
    );
  };

  if (loading && widgets.length === 0) {
    return <div className="p-8 text-center text-zinc-500">Loading widgets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Personalized Feed Widgets</h3>
          <p className="text-sm text-zinc-500">Create custom feeds for different pages or countries.</p>
        </div>
        <button 
          onClick={() => setEditingWidget({
            name: 'New Feed Widget',
            targetCountries: '',
            targetPages: '',
            hashtagFilter: '',
            displayLayout: 'grid',
            postsPerPage: 12,
            isActive: true
          })}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Create Widget
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      {widgets.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-zinc-200 rounded-xl">
          <Settings className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 mb-2">No widgets yet</h3>
          <p className="text-zinc-500 mb-4">Create your first feed widget to display Instagram posts on your store.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {widgets.map(widget => (
            <div key={widget.id} className="p-5 border border-zinc-200 rounded-xl bg-white flex items-center justify-between hover:border-indigo-200 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-zinc-900">{widget.name}</h4>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${widget.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'}`}>
                    {widget.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Layout size={14} />
                    <span className="capitalize">{widget.displayLayout}</span> ({widget.postsPerPage} posts)
                  </div>
                  {widget.targetPages && (
                    <div className="flex items-center gap-1.5">
                      <FileText size={14} />
                      <span className="max-w-[200px] truncate">Pages: {widget.targetPages}</span>
                    </div>
                  )}
                  {widget.targetCountries && (
                    <div className="flex items-center gap-1.5">
                      <Globe size={14} />
                      <span>Countries: {widget.targetCountries}</span>
                    </div>
                  )}
                  {widget.hashtagFilter && (
                    <div className="flex items-center gap-1.5">
                      <Hash size={14} />
                      <span>Filter: {widget.hashtagFilter}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button 
                  onClick={() => setEditingWidget(widget)}
                  className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit Widget"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(widget.id)}
                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Widget"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingWidget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {'id' in editingWidget ? 'Edit Widget' : 'Create Widget'}
              </h3>
              <button 
                onClick={() => setEditingWidget(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Widget Name</label>
                    <input 
                      type="text" 
                      required
                      value={editingWidget.name || ''}
                      onChange={e => setEditingWidget({...editingWidget, name: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Homepage Feed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Target Pages & Collections</label>
                    <div className="p-3 border border-zinc-300 rounded-lg max-h-48 overflow-y-auto space-y-2 bg-zinc-50">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Standard Pages</div>
                      {resources.standardPages.map(p => (
                        <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded transition-colors">
                          <input 
                            type="checkbox" 
                            checked={(editingWidget.targetPages || '').split(',').includes(p.handle)}
                            onChange={() => toggleSelection('targetPages', p.handle)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          {p.title}
                        </label>
                      ))}
                      
                      <div className="text-[10px] font-bold text-zinc-400 uppercase mt-3 mb-1">Collections</div>
                      {resources.collections.map(c => (
                        <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded transition-colors">
                          <input 
                            type="checkbox" 
                            checked={(editingWidget.targetPages || '').split(',').includes(`collection:${c.handle}`)}
                            onChange={() => toggleSelection('targetPages', `collection:${c.handle}`)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          {c.title}
                        </label>
                      ))}

                      <div className="text-[10px] font-bold text-zinc-400 uppercase mt-3 mb-1">Custom Pages</div>
                      {resources.pages.map(p => (
                        <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded transition-colors">
                          <input 
                            type="checkbox" 
                            checked={(editingWidget.targetPages || '').split(',').includes(`page:${p.handle}`)}
                            onChange={() => toggleSelection('targetPages', `page:${p.handle}`)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          {p.title}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Select where this widget should appear.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-zinc-700">Target Countries</label>
                      <button 
                        type="button"
                        onClick={() => {
                          const allCodes = COUNTRIES.map(c => c.code).join(',');
                          const current = editingWidget.targetCountries || '';
                          setEditingWidget({
                            ...editingWidget,
                            targetCountries: current.split(',').length === COUNTRIES.length ? '' : allCodes
                          });
                        }}
                        className="text-[10px] font-bold text-indigo-600 uppercase hover:underline"
                      >
                        {(editingWidget.targetCountries || '').split(',').filter(Boolean).length === COUNTRIES.length ? 'Clear All' : 'Select All'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-3 border border-zinc-300 rounded-lg bg-zinc-50">
                      {COUNTRIES.map(c => (
                        <label key={c.code} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1 rounded transition-colors">
                          <input 
                            type="checkbox" 
                            checked={(editingWidget.targetCountries || '').split(',').includes(c.code)}
                            onChange={() => toggleSelection('targetCountries', c.code)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Leave all unchecked for worldwide.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <GridPreview 
                    layout={editingWidget.displayLayout || 'grid'} 
                    count={editingWidget.postsPerPage || 12} 
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Display Layout</label>
                      <select 
                        value={editingWidget.displayLayout || 'grid'}
                        onChange={e => setEditingWidget({...editingWidget, displayLayout: e.target.value})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="grid">Grid</option>
                        <option value="carousel">Carousel</option>
                        <option value="masonry">Masonry</option>
                        <option value="swipe">Swipe (Slider)</option>
                        <option value="collage">Collage</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Posts Per Page</label>
                      <input 
                        type="number" 
                        min="1"
                        max="50"
                        value={editingWidget.postsPerPage || 12}
                        onChange={e => setEditingWidget({...editingWidget, postsPerPage: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Hashtag Filter</label>
                    <input 
                      type="text" 
                      value={editingWidget.hashtagFilter || ''}
                      onChange={e => setEditingWidget({...editingWidget, hashtagFilter: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., #summer2026"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="isActive"
                      checked={editingWidget.isActive !== false}
                      onChange={e => setEditingWidget({...editingWidget, isActive: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-zinc-700">Widget is active</label>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-200 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingWidget(null)}
                  className="px-4 py-2 text-zinc-700 font-medium hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Save Widget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

