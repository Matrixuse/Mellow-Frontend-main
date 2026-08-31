import React, { useState, useCallback } from 'react';
import { animated } from '@react-spring/web';
import SongLibrary from '../components/SongLibrary';
import useScopedPullToRefresh from '../hooks/useScopedPullToRefresh';

const LibraryPage = () => {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleRefresh = useCallback(async () => {
        // Apna refresh logic — e.g. dobara getSongs() call karo
        // Yeh function tab execute hoga jab user pull-to-refresh karega
        return new Promise((resolve) => {
            // Simulate async operation
            setTimeout(() => {
                setRefreshKey(prev => prev + 1);
                resolve();
            }, 1000);
        });
    }, []);

    const { scrollRef, bindPull, pull, refreshing } = useScopedPullToRefresh(handleRefresh);

    return (
        <div className="h-full flex flex-col">
            <animated.div 
                ref={scrollRef} 
                {...bindPull()} 
                style={{ 
                    overflowY: 'auto', 
                    touchAction: 'pan-y',
                    position: 'relative'
                }} 
                className="flex-1 p-2 overflow-auto"
            >
                {/* Pull-to-refresh indicator */}
                {refreshing && (
                    <div className="fixed top-0 left-0 right-0 flex justify-center items-center p-4 bg-gray-900/50 z-50">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500">Refreshing...</div>
                    </div>
                )}

                {/* SongLibrary content */}
                <SongLibrary key={refreshKey} />
            </animated.div>
        </div>
    );
};

export default LibraryPage;
