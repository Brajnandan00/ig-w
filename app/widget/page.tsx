'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import GalleryWidget from '@/components/GalleryWidget';

function WidgetContent() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop');
  const layout = (searchParams.get('layout') as 'grid' | 'masonry' | 'carousel') || 'grid';
  const count = parseInt(searchParams.get('count') || '12', 10);
  const tier = (searchParams.get('tier') as 'free' | 'premium') || 'premium';
  
  const [height, setHeight] = useState(0);
  const heightRef = React.useRef(0);

  useEffect(() => {
    // Send height to parent for iframe resizing
    const updateHeight = () => {
      const newHeight = document.body.scrollHeight;
      // Only update if height changed by more than 5px to avoid loops
      if (Math.abs(newHeight - heightRef.current) > 5) {
        heightRef.current = newHeight;
        setHeight(newHeight);
        window.parent.postMessage({ type: 'resize', height: newHeight }, '*');
      }
    };

    const observer = new ResizeObserver(updateHeight);
    observer.observe(document.body);
    
    // Initial update
    updateHeight();
    
    return () => observer.disconnect();
  }, []); // Remove height dependency to avoid loop

  if (!shop) {
    return (
      <div className="p-8 text-center text-zinc-500 bg-zinc-50 rounded-xl border border-dashed border-zinc-300">
        <p className="text-sm">Missing shop parameter. Please configure the widget in the theme editor.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <GalleryWidget 
        layout={layout} 
        tier={tier} 
        count={count} 
        shop={shop} 
        isAdmin={false} 
      />
    </div>
  );
}

export default function WidgetPage() {
  return (
    <div className="bg-transparent min-h-screen">
      <Suspense fallback={<div className="p-8 text-center text-zinc-400">Loading Instagram Feed...</div>}>
        <WidgetContent />
      </Suspense>
    </div>
  );
}
