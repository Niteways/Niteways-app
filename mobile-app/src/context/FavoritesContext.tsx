/**
 * FavoritesContext — syncs with Supabase when logged in,
 * falls back to AsyncStorage for offline support.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Nightclub } from '../types';
import { supabase } from '../config/supabase';
import { addFavorite, removeFavorite } from '../services/database';

interface FavoritesContextType {
    favorites: Nightclub[];
    toggleFavorite: (venue: Nightclub) => void;
    isFavorite: (venueId: string | number) => boolean;
    loading: boolean;
    refreshFavorites: () => void;
}

const STORAGE_KEY = '@niteways_favorites';

const FavoritesContext = createContext<FavoritesContextType>({
    favorites: [],
    toggleFavorite: () => {},
    isFavorite: () => false,
    loading: false,
    refreshFavorites: () => {},
});

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [favorites, setFavorites] = useState<Nightclub[]>([]);
    const [loading, setLoading]     = useState(true);
    const [userId, setUserId]       = useState<string | null>(null);

    // Get logged-in user ID once
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserId(session?.user?.id || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load favorites whenever userId changes
    const loadFavorites = useCallback(async () => {
        try {
            setLoading(true);

            if (userId) {
                // Logged in — load from Supabase + venue details
                const { data, error } = await supabase
                    .from('user_favorites')
                    .select('venue_id, venues(id, name, description, image_url, address, latitude, longitude, genre, vibe, min_age, dress_code, city_id)')
                    .eq('user_id', userId);

                if (!error && data) {
                    const mapped: Nightclub[] = data.map((f: any) => ({
                        id: f.venues?.id || f.venue_id,
                        name: f.venues?.name || '',
                        description: f.venues?.description || '',
                        imageUrl: f.venues?.image_url || '',
                        image: f.venues?.image_url || '',
                        location: f.venues?.address || '',
                        latitude: f.venues?.latitude,
                        longitude: f.venues?.longitude,
                        genre: f.venues?.genre || [],
                        category: 'Nightclub',
                    }));
                    setFavorites(mapped);
                    // Keep local cache in sync
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
                    return;
                }
            }

            // Fallback to local AsyncStorage
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            if (raw) setFavorites(JSON.parse(raw));
        } catch (e) {
            console.warn('FavoritesContext: failed to load', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { loadFavorites(); }, [loadFavorites]);

    const toggleFavorite = useCallback((venue: Nightclub) => {
        setFavorites(prev => {
            const venueId = String(venue.id);
            const exists = prev.some(v => String(v.id) === venueId);
            const updated = exists
                ? prev.filter(v => String(v.id) !== venueId)
                : [...prev, venue];

            // Persist locally
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});

            // Sync to Supabase if logged in
            if (userId) {
                if (exists) {
                    removeFavorite(userId, venueId).catch(console.warn);
                } else {
                    addFavorite(userId, venueId).catch(console.warn);
                }
            }

            return updated;
        });
    }, [userId]);

    const isFavorite = useCallback(
        (venueId: string | number) => favorites.some(v => String(v.id) === String(venueId)),
        [favorites],
    );

    return (
        <FavoritesContext.Provider value={{
            favorites,
            toggleFavorite,
            isFavorite,
            loading,
            refreshFavorites: loadFavorites,
        }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => useContext(FavoritesContext);
