import React, { useState, useEffect, useContext } from 'react';
import { Heart } from 'lucide-react';
import { toggleFavoriteSong, toggleFavoritePlaylist, isSongFavorited, isPlaylistFavorited } from '../api/favoritesService';
import { FavoritesContext } from '../contexts/FavoritesContext';

const FavoriteButton = ({ 
    id, 
    type = 'song', // 'song' or 'playlist'
    token,
    isFavorited: initialIsFavorited = false,
    size = 20,
    className = ''
}) => {
    const favoritesCtx = useContext(FavoritesContext);
    const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
    const [isLoading, setIsLoading] = useState(false);

    // Check favorite status on mount
    useEffect(() => {
        const checkFavoriteStatus = async () => {
            if (!id) return;
            try {
                // Prefer context-provided status when available
                if (favoritesCtx && type === 'song' && typeof favoritesCtx.isSongFavorite === 'function') {
                    setIsFavorited(Boolean(favoritesCtx.isSongFavorite(id)));
                    return;
                }
                if (favoritesCtx && type === 'playlist' && typeof favoritesCtx.isPlaylistFavorite === 'function') {
                    setIsFavorited(Boolean(favoritesCtx.isPlaylistFavorite(id)));
                    return;
                }

                if (!token) return;
                let status;
                if (type === 'song') {
                    status = await isSongFavorited(id, token);
                } else {
                    status = await isPlaylistFavorited(id, token);
                }
                setIsFavorited(status);
            } catch (err) {
                console.error('Error checking favorite status:', err);
            }
        };

        checkFavoriteStatus();
    }, [id, token, type, favoritesCtx]);

    const handleToggleFavorite = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!id || isLoading) return;

        setIsLoading(true);
        try {
            // If a FavoritesContext is available, use it so all UI updates stay in sync
            if (favoritesCtx) {
                if (type === 'song' && typeof favoritesCtx.toggleSongFavorite === 'function') {
                    const newState = await favoritesCtx.toggleSongFavorite(id);
                    setIsFavorited(Boolean(newState));
                } else if (type === 'playlist' && typeof favoritesCtx.togglePlaylistFavorite === 'function') {
                    const newState = await favoritesCtx.togglePlaylistFavorite(id);
                    setIsFavorited(Boolean(newState));
                } else {
                    // Fallback to direct API if context doesn't provide the method
                    if (!token) throw new Error('Authentication token not found');
                    if (type === 'song') {
                        await toggleFavoriteSong(id, token);
                    } else {
                        await toggleFavoritePlaylist(id, token);
                    }
                    setIsFavorited(prev => !prev);
                }
            } else {
                if (!token) throw new Error('Authentication token not found');
                if (type === 'song') {
                    await toggleFavoriteSong(id, token);
                } else {
                    await toggleFavoritePlaylist(id, token);
                }
                setIsFavorited(prev => !prev);
            }
        } catch (err) {
            console.error('Error toggling favorite:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggleFavorite}
            disabled={isLoading}
            className={`transition-colors hover:text-red-400 ${
                isFavorited ? 'text-red-500' : 'text-gray-400'
            } ${className}`}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
            <Heart
                size={size}
                fill={isFavorited ? 'currentColor' : 'none'}
                strokeWidth={isFavorited ? 0 : 2}
            />
        </button>
    );
};

export default FavoriteButton;
