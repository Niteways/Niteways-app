import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    StatusBar,
    Dimensions,
    Image,
    Platform,
    Animated,
    PermissionsAndroid,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/Ionicons';
import { Nightclub } from '../types';
import BottomNav from '../components/BottomNav';
import { getVenues, getEvents, Venue, Event as SupabaseEvent } from '../services/database';
import MAPBOX_ACCESS_TOKEN from '../config/mapbox';

// ── Colors ────────────────────────────────────────────────────────────────────
const CLUB_COLOR        = '#F7C948';   // gold
const CLUB_BORDER       = '#C8981A';
const CLUB_ACTIVE_COLOR = '#FFFFFF';   // white when selected

const EVENT_COLOR        = '#A855F7';  // vivid purple
const EVENT_BORDER       = '#7C3AED';
const EVENT_ACTIVE_COLOR = '#F0ABFC';  // light lavender when selected

// Base URL to fetch the Mapbox style JSON
const STYLE_FETCH_URL = `https://api.mapbox.com/styles/v1/mapbox/dark-v10?access_token=${MAPBOX_ACCESS_TOKEN}`;

/**
 * MapLibre SDK (the @rnmapbox/maps default backend) cannot parse mapbox:// URIs.
 * This function fetches the Mapbox style JSON and rewrites every internal
 * mapbox:// reference to its HTTPS equivalent so MapLibre can load them.
 */
async function fetchMapboxStyleAsHTTPS(): Promise<string> {
    const res = await fetch(STYLE_FETCH_URL);
    if (!res.ok) throw new Error(`Style fetch failed: ${res.status}`);
    const style = await res.json();

    // Sprites  e.g. mapbox://sprites/mapbox/dark-v10
    if (typeof style.sprite === 'string' && style.sprite.startsWith('mapbox://sprites/')) {
        const spritePath = style.sprite.replace('mapbox://sprites/', '');
        style.sprite = `https://api.mapbox.com/styles/v1/${spritePath}/sprite?access_token=${MAPBOX_ACCESS_TOKEN}`;
    }

    // Glyphs  e.g. mapbox://fonts/mapbox/{fontstack}/{range}.pbf
    if (typeof style.glyphs === 'string' && style.glyphs.startsWith('mapbox://fonts/')) {
        style.glyphs =
            style.glyphs.replace('mapbox://fonts/', 'https://api.mapbox.com/fonts/v1/') +
            `?access_token=${MAPBOX_ACCESS_TOKEN}`;
    }

    // Tile sources
    if (style.sources) {
        for (const src of Object.values(style.sources) as any[]) {
            if (typeof src.url === 'string' && src.url.startsWith('mapbox://')) {
                const tileset = src.url.replace('mapbox://', '');
                src.url = `https://api.mapbox.com/v4/${tileset}.json?access_token=${MAPBOX_ACCESS_TOKEN}`;
            }
            if (Array.isArray(src.tiles)) {
                src.tiles = src.tiles.map((t: string) =>
                    t.startsWith('mapbox://') ? t.replace('mapbox://', 'https://api.mapbox.com/v4/') : t
                );
            }
        }
    }

    return JSON.stringify(style);
}

// ── Unified map item type ─────────────────────────────────────────────────────
type MapItemType = 'club' | 'event';

interface MapItem {
    id: string;
    type: MapItemType;
    name: string;
    subtitle: string;   // city for club, venue name for event
    detail: string;     // priceLevel for club, category for event
    imageUrl: string;
    latitude: number;
    longitude: number;
    raw: Nightclub | MapEvent;
}

// ── Screen setup ──────────────────────────────────────────────────────────────
const { width } = Dimensions.get('window');

type CategoryFilter = 'all' | 'clubs' | 'events';

const categoryFilters: { id: CategoryFilter; label: string; icon: string }[] = [
    { id: 'all',    label: 'All',        icon: 'layers-outline'        },
    { id: 'clubs',  label: 'Nightclubs', icon: 'musical-notes-outline' },
    { id: 'events', label: 'Events',     icon: 'calendar-outline'      },
];

interface InteractiveMapScreenProps {
    navigation: any;
}

const InteractiveMapScreen: React.FC<InteractiveMapScreenProps> = ({ navigation }) => {
    const [searchQuery, setSearchQuery]           = useState('');
    const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
    const [selectedItem, setSelectedItem]         = useState<MapItem | null>(null);
    const [mapStyle, setMapStyle]                 = useState<string | null>(null);
    const [userLocation, setUserLocation]         = useState<[number, number] | null>(null);
    const [mapVenues, setMapVenues]               = useState<Venue[]>([]);
    const [mapEvents, setMapEvents]               = useState<SupabaseEvent[]>([]);
    const mapCamera      = useRef<any>(null);
    const popupAnim      = useRef(new Animated.Value(200)).current;
    const pulseAnim      = useRef(new Animated.Value(1)).current;
    const watchId        = useRef<number | null>(null);
    // Ref (not state) so GPS callback always reads the live value without re-registering watchPosition
    const followUserRef  = useRef(true);
    // Track zoom in a ref so buttons never trigger a re-render that resets the camera
    const zoomRef        = useRef(5);
    // Keep a separate state just to drive the disabled appearance of zoom buttons
    const [zoomLevel, setZoomLevel]               = useState(5);

    // Fetch Mapbox style once
    useEffect(() => {
        fetchMapboxStyleAsHTTPS()
            .then(setMapStyle)
            .catch(() => setMapStyle(STYLE_FETCH_URL));
    }, []);

    // Load venues and events from Supabase
    useEffect(() => {
        getVenues().then(setMapVenues).catch(console.error);
        getEvents().then(setMapEvents).catch(console.error);
    }, []);

    // ── Pulsing animation for user-location dot ────────────────────────────────
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.8, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    // ── Request location permission + start watching ───────────────────────────
    const requestAndWatch = useCallback(async () => {
        try {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'Niteways needs your location to show you on the map.',
                        buttonPositive: 'Allow',
                        buttonNegative: 'Deny',
                    }
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
            }

            // Clear any previous watcher first
            if (watchId.current !== null) {
                Geolocation.clearWatch(watchId.current);
            }

            watchId.current = Geolocation.watchPosition(
                (pos) => {
                    const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
                    setUserLocation(coords);
                    // followUserRef is a ref so this always reads the live value
                    if (followUserRef.current) {
                        followUserRef.current = false; // stop after first fix
                        mapCamera.current?.setCamera({
                            centerCoordinate: coords,
                            zoomLevel: 14,
                            animationDuration: 600,
                        });
                    }
                },
                (err) => console.warn('GPS error:', err.message),
                { enableHighAccuracy: true, distanceFilter: 10, interval: 4000, fastestInterval: 2000 }
            );
        } catch (e) {
            console.warn('Location error:', e);
        }
    }, []);

    useEffect(() => {
        requestAndWatch();
        return () => {
            if (watchId.current !== null) {
                Geolocation.clearWatch(watchId.current);
            }
        };
    }, []);

    // ── Locate Me: re-centre camera and resume following ─────────────────────
    const handleLocateMe = () => {
        followUserRef.current = false; // tap = one-time jump, not continuous follow
        if (userLocation) {
            zoomRef.current = 15;
            setZoomLevel(15);
            mapCamera.current?.setCamera({
                centerCoordinate: userLocation,
                zoomLevel: 15,
                animationDuration: 500,
            });
        } else {
            followUserRef.current = true; // no fix yet — allow first-fix follow
            requestAndWatch();
        }
    };

    // Animate popup in/out when selectedItem changes
    useEffect(() => {
        if (selectedItem) {
            Animated.spring(popupAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 80,
                friction: 10,
            }).start();
        } else {
            Animated.timing(popupAnim, {
                toValue: 200,
                duration: 220,
                useNativeDriver: true,
            }).start();
        }
    }, [selectedItem]);

    // ── When search narrows results: fly camera + auto-select ─────────────────
    useEffect(() => {
        if (!searchQuery.trim()) return; // don't fly when search is empty
        if (filteredItems.length === 0) return;

        const first = filteredItems[0];
        // Always fly to first result when user is actively searching
        zoomRef.current = 14;
        setZoomLevel(14);
        mapCamera.current?.setCamera({
            centerCoordinate: [first.longitude, first.latitude],
            zoomLevel: 14,
            animationDuration: 700,
        });
        // Auto-open the popup for the first match
        setSelectedItem(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    // ── Dismiss popup if the selected item is filtered out ────────────────────
    useEffect(() => {
        if (selectedItem && !filteredItems.find(i => i.id === selectedItem.id)) {
            setSelectedItem(null);
        }
    }, [filteredItems, selectedItem]);

    // ── Build unified list of MapItems ────────────────────────────────────────
    const allItems = useMemo<MapItem[]>(() => {
        const clubs: MapItem[] = mapVenues
            .filter(v => v.latitude && v.longitude)
            .map(v => ({
                id:        `club-${v.id}`,
                type:      'club' as MapItemType,
                name:      v.name,
                subtitle:  (v as any).cities?.name || v.address || '',
                detail:    v.genre?.join(', ') || '',
                imageUrl:  v.image_url,
                latitude:  v.latitude,
                longitude: v.longitude,
                raw:       v,
            }));

        const events: MapItem[] = mapEvents
            .filter(e => (e as any).venues?.latitude && (e as any).venues?.longitude)
            .map(e => ({
                id:        `event-${e.id}`,
                type:      'event' as MapItemType,
                name:      e.title,
                subtitle:  (e as any).venues?.name || '',
                detail:    e.genre || '',
                imageUrl:  e.image_url,
                latitude:  (e as any).venues?.latitude,
                longitude: (e as any).venues?.longitude,
                raw:       e,
            }));

        return [...clubs, ...events];
    }, [mapVenues, mapEvents]);

    // ── Apply search + category filter ────────────────────────────────────────
    const filteredItems = useMemo<MapItem[]>(() => {
        let items = allItems;
        if (selectedCategory === 'clubs')  items = items.filter(i => i.type === 'club');
        if (selectedCategory === 'events') items = items.filter(i => i.type === 'event');
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(i =>
                i.name.toLowerCase().includes(q) ||
                i.subtitle.toLowerCase().includes(q) ||
                i.detail.toLowerCase().includes(q)
            );
        }
        return items;
    }, [allItems, selectedCategory, searchQuery]);

    const filteredClubs  = useMemo(() => filteredItems.filter(i => i.type === 'club'),  [filteredItems]);
    const filteredEvents = useMemo(() => filteredItems.filter(i => i.type === 'event'), [filteredItems]);

    // ── GeoJSON for GPU-rendered circles ──────────────────────────────────────
    const clubGeoJSON = useMemo(() => ({
        type: 'FeatureCollection' as const,
        features: filteredClubs.map(item => ({
            type: 'Feature' as const,
            id: item.id,
            geometry: { type: 'Point' as const, coordinates: [item.longitude, item.latitude] },
            properties: { itemId: item.id, isActive: selectedItem?.id === item.id },
        })),
    }), [filteredClubs, selectedItem?.id]);

    const eventGeoJSON = useMemo(() => ({
        type: 'FeatureCollection' as const,
        features: filteredEvents.map(item => ({
            type: 'Feature' as const,
            id: item.id,
            geometry: { type: 'Point' as const, coordinates: [item.longitude, item.latitude] },
            properties: { itemId: item.id, isActive: selectedItem?.id === item.id },
        })),
    }), [filteredEvents, selectedItem?.id]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleMarkerTap = (item: MapItem) => {
        setSelectedItem(item);
        zoomRef.current = 14;
        setZoomLevel(14);
        mapCamera.current?.setCamera({
            centerCoordinate: [item.longitude, item.latitude],
            zoomLevel: 14,
            animationDuration: 600,
        });
    };

    const dismissPopup = () => setSelectedItem(null);

    const handleShapePress = (e: any, items: MapItem[]) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const itemId = feature.properties?.itemId;
        const item = items.find(i => i.id === itemId);
        if (item) handleMarkerTap(item);
    };

    const handleGoToDetail = (item: MapItem) => {
        if (item.type === 'club') {
            navigation.navigate('VenueDetail', { club: item.raw });
        } else {
            // Pass the raw MapEvent shaped as the EventDetail screen expects
            const ev = item.raw as MapEvent;
            navigation.navigate('EventDetail', {
                event: {
                    id:       ev.id,
                    name:     ev.name,
                    venue:    ev.venue,
                    city:     ev.city,
                    date:     ev.date,
                    time:     ev.time,
                    category: ev.category,
                    price:    ev.price,
                    image:    ev.image,
                    featured: ev.featured ?? false,
                },
            });
        }
    };

    // ── User-location GeoJSON (single point, updates with GPS) ────────────────
    const userGeoJSON = useMemo(() => ({
        type: 'FeatureCollection' as const,
        features: userLocation ? [{
            type: 'Feature' as const,
            id: 'user',
            geometry: { type: 'Point' as const, coordinates: userLocation },
            properties: {},
        }] : [],
    }), [userLocation]);

    // ── Zoom controls ─────────────────────────────────────────────────────────
    const MAX_ZOOM = 20;
    const MIN_ZOOM = 2;

    const handleZoomIn = () => {
        const next = Math.min(zoomRef.current + 1.5, MAX_ZOOM);
        zoomRef.current = next;
        setZoomLevel(next); // only updates button disabled state
        // No centerCoordinate — camera stays exactly where the user is looking
        mapCamera.current?.setCamera({ zoomLevel: next, animationDuration: 250 });
    };

    const handleZoomOut = () => {
        const next = Math.max(zoomRef.current - 1.5, MIN_ZOOM);
        zoomRef.current = next;
        setZoomLevel(next);
        mapCamera.current?.setCamera({ zoomLevel: next, animationDuration: 250 });
    };

    // ── Camera default ────────────────────────────────────────────────────────
    const cameraCenter = filteredItems.length > 0
        ? [filteredItems[0].longitude, filteredItems[0].latitude]
        : [2.3522, 48.8566];

    // ── Popup card ────────────────────────────────────────────────────────────
    const renderPopup = () => {
        if (!selectedItem) return null;
        const isEvent   = selectedItem.type === 'event';
        const accent    = isEvent ? EVENT_COLOR : CLUB_COLOR;
        const badgeBg   = isEvent ? '#2D1057' : '#3D2800';

        return (
            <Animated.View
                style={[styles.popup, { transform: [{ translateY: popupAnim }] }]}
            >
                {/* Close button */}
                <TouchableOpacity style={styles.popupClose} onPress={dismissPopup} activeOpacity={0.7}>
                    <Icon name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <View style={styles.popupInner}>
                    <Image source={{ uri: selectedItem.imageUrl }} style={styles.popupImage} />
                    <View style={styles.popupContent}>
                        {/* Badge + detail */}
                        <View style={styles.popupBadgeRow}>
                            <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
                                <Icon
                                    name={isEvent ? 'calendar-outline' : 'musical-notes-outline'}
                                    size={10}
                                    color={accent}
                                />
                                <Text style={[styles.typeBadgeText, { color: accent }]}>
                                    {isEvent ? 'EVENT' : 'NIGHTCLUB'}
                                </Text>
                            </View>
                            <Text style={[styles.popupDetail, { color: accent }]}>
                                {selectedItem.detail}
                            </Text>
                        </View>

                        {/* Name */}
                        <Text style={styles.popupName} numberOfLines={1}>
                            {selectedItem.name}
                        </Text>

                        {/* Location */}
                        <View style={styles.popupMeta}>
                            <Icon name="location-outline" size={12} color="#9CA3AF" />
                            <Text style={styles.popupSubtitle}>{selectedItem.subtitle}</Text>
                        </View>

                        {/* CTA */}
                        <TouchableOpacity
                            style={[styles.ctaButton, { backgroundColor: accent }]}
                            onPress={() => handleGoToDetail(selectedItem)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.ctaText}>
                                {isEvent ? 'View Event' : 'Explore Venue'}
                            </Text>
                            <Icon name="arrow-forward" size={13} color="#000" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Full-screen map */}
            {mapStyle ? (
                <Mapbox.MapView
                    style={styles.map}
                    styleURL={mapStyle}
                    logoEnabled={false}
                    compassEnabled
                    zoomEnabled
                    scrollEnabled
                    rotateEnabled
                    onTouchStart={() => { followUserRef.current = false; }}
                >
                    {/* defaultSettings are applied ONCE on mount only — never reactive.
                        All subsequent movements go through mapCamera.current.setCamera()
                        so zoom buttons can never jump back to the initial coordinates. */}
                    <Mapbox.Camera
                        ref={mapCamera}
                        defaultSettings={{
                            centerCoordinate: cameraCenter,
                            zoomLevel: 5,
                        }}
                        animationDuration={0}
                    />

                    {/* ── NIGHTCLUB markers — gold circles ───────────────── */}
                    <Mapbox.ShapeSource
                        id="clubSource"
                        shape={clubGeoJSON}
                        onPress={(e: any) => handleShapePress(e, filteredClubs)}
                    >
                        <Mapbox.CircleLayer
                            id="clubInactive"
                            filter={['!', ['to-boolean', ['get', 'isActive']]]}
                            style={{
                                circleRadius: 8,
                                circleColor: CLUB_COLOR,
                                circleStrokeWidth: 1.5,
                                circleStrokeColor: CLUB_BORDER,
                                circlePitchAlignment: 'map',
                            }}
                        />
                        <Mapbox.CircleLayer
                            id="clubActive"
                            filter={['to-boolean', ['get', 'isActive']]}
                            style={{
                                circleRadius: 12,
                                circleColor: CLUB_ACTIVE_COLOR,
                                circleStrokeWidth: 2.5,
                                circleStrokeColor: CLUB_COLOR,
                                circlePitchAlignment: 'map',
                            }}
                        />
                    </Mapbox.ShapeSource>

                    {/* ── EVENT markers — purple circles ─────────────────── */}
                    <Mapbox.ShapeSource
                        id="eventSource"
                        shape={eventGeoJSON}
                        onPress={(e: any) => handleShapePress(e, filteredEvents)}
                    >
                        <Mapbox.CircleLayer
                            id="eventInactive"
                            filter={['!', ['to-boolean', ['get', 'isActive']]]}
                            style={{
                                circleRadius: 8,
                                circleColor: EVENT_COLOR,
                                circleStrokeWidth: 1.5,
                                circleStrokeColor: EVENT_BORDER,
                                circlePitchAlignment: 'map',
                            }}
                        />
                        <Mapbox.CircleLayer
                            id="eventActive"
                            filter={['to-boolean', ['get', 'isActive']]}
                            style={{
                                circleRadius: 12,
                                circleColor: EVENT_ACTIVE_COLOR,
                                circleStrokeWidth: 2.5,
                                circleStrokeColor: EVENT_COLOR,
                                circlePitchAlignment: 'map',
                            }}
                        />
                    </Mapbox.ShapeSource>

                    {/* ── USER LOCATION — blue pulsing dot ───────────────── */}
                    {userLocation && (
                        <Mapbox.ShapeSource id="userSource" shape={userGeoJSON}>
                            {/* Outer glow ring */}
                            <Mapbox.CircleLayer
                                id="userGlow"
                                style={{
                                    circleRadius: 18,
                                    circleColor: 'rgba(59, 130, 246, 0.15)',
                                    circleStrokeWidth: 0,
                                    circlePitchAlignment: 'map',
                                }}
                            />
                            {/* Inner solid dot */}
                            <Mapbox.CircleLayer
                                id="userDot"
                                style={{
                                    circleRadius: 7,
                                    circleColor: '#3B82F6',
                                    circleStrokeWidth: 2.5,
                                    circleStrokeColor: '#FFFFFF',
                                    circlePitchAlignment: 'map',
                                }}
                            />
                        </Mapbox.ShapeSource>
                    )}
                </Mapbox.MapView>
            ) : (
                <View style={[styles.map, styles.mapLoading]}>
                    <Text style={styles.mapLoadingText}>Loading map…</Text>
                </View>
            )}

            {/* ── Overlays ───────────────────────────────────────────────── */}
            <View style={styles.overlay}>

                {/* Search + filter bar */}
                <View style={styles.searchSection}>
                    {/* Glass-morphism search bar — layered approach */}
                    <View style={styles.searchContainer}>
                        {/* Dark tinted base layer */}
                        <View style={styles.searchGlassBase} pointerEvents="none" />
                        {/* Bright edge highlight (top) */}
                        <View style={styles.searchGlassHighlight} pointerEvents="none" />
                        <Icon name="search" size={16} color="#C0C4CC" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search venues, clubs, events..."
                            placeholderTextColor="#5A5F6B"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                style={styles.searchClearBtn}
                                onPress={() => setSearchQuery('')}
                                activeOpacity={0.7}
                            >
                                <Icon name="close" size={13} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterList}
                    >
                        {categoryFilters.map(filter => {
                            const isActive  = selectedCategory === filter.id;
                            const chipColor =
                                filter.id === 'clubs'  ? CLUB_COLOR  :
                                filter.id === 'events' ? EVENT_COLOR : '#FFFFFF';
                            return (
                                <TouchableOpacity
                                    key={filter.id}
                                    style={[
                                        styles.filterChip,
                                        isActive && { backgroundColor: chipColor, borderColor: chipColor },
                                    ]}
                                    onPress={() => setSelectedCategory(filter.id)}
                                    activeOpacity={0.7}
                                >
                                    <Icon
                                        name={filter.icon}
                                        size={13}
                                        color={isActive ? '#000' : '#9CA3AF'}
                                        style={styles.filterIcon}
                                    />
                                    <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                        {filter.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                </View>

                {/* ── Locate Me FAB ────────────────────────────────────── */}
                <TouchableOpacity
                    style={[styles.locateMeBtn, !!userLocation && styles.locateMeBtnActive]}
                    onPress={handleLocateMe}
                    activeOpacity={0.8}
                >
                    <Icon
                        name={userLocation ? 'navigate' : 'navigate-outline'}
                        size={20}
                        color={userLocation ? '#000' : '#fff'}
                    />
                </TouchableOpacity>

                {/* ── Zoom controls — top-right, below search bar ──────── */}
                <View style={styles.zoomControls} pointerEvents="box-none">
                    <TouchableOpacity
                        style={[styles.zoomBtn, zoomLevel >= MAX_ZOOM && styles.zoomBtnDisabled]}
                        onPress={handleZoomIn}
                        activeOpacity={0.75}
                    >
                        <Icon name="add" size={20} color={zoomLevel >= MAX_ZOOM ? '#4B5563' : '#fff'} />
                    </TouchableOpacity>
                    <View style={styles.zoomDivider} />
                    <TouchableOpacity
                        style={[styles.zoomBtn, zoomLevel <= MIN_ZOOM && styles.zoomBtnDisabled]}
                        onPress={handleZoomOut}
                        activeOpacity={0.75}
                    >
                        <Icon name="remove" size={20} color={zoomLevel <= MIN_ZOOM ? '#4B5563' : '#fff'} />
                    </TouchableOpacity>
                </View>

                {/* Single popup card — slides up when a marker is tapped */}
                {renderPopup()}
            </View>

            <BottomNav activeTab="Map" navigation={navigation} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    map: {
        flex: 1,
    },
    mapLoading: {
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapLoadingText: {
        color: CLUB_COLOR,
        fontSize: 14,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: 'box-none',
    },
    // ── Search + filters ─────────────────────────────────────────────────────
    searchSection: {
        paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 0) + 10,
        paddingHorizontal: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 30,
        paddingLeft: 16,
        paddingRight: 8,
        height: 48,
        // Outer border — subtle bright rim like glass edge
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.20)',
        marginBottom: 12,
        overflow: 'hidden',
        // Deep shadow for floating depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 8,
    },
    // Primary dark-glass base fill
    searchGlassBase: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(8, 8, 14, 0.72)',
        borderRadius: 30,
    },
    // Bright shimmer along the top edge — the "glass" illusion
    searchGlassHighlight: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.28)',
        borderRadius: 1,
    },
    searchIcon: {
        marginRight: 2,
        zIndex: 1,
    },
    searchInput: {
        flex: 1,
        color: '#EAEAEA',
        paddingLeft: 8,
        paddingRight: 4,
        fontSize: 14,
        zIndex: 1,
    },
    searchClearBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
        zIndex: 1,
    },
    filterList: {
        gap: 8,
        paddingBottom: 4,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: 'rgba(18, 18, 20, 0.96)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    filterIcon: {
        marginRight: 5,
    },
    filterText: {
        color: '#9CA3AF',
        fontSize: 13,
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#000',
    },
    // ── Legend ───────────────────────────────────────────────────────────────
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 14,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendLabel: {
        color: '#D1D5DB',
        fontSize: 11,
        fontWeight: '600',
    },
    legendCount: {
        color: '#6B7280',
        fontSize: 11,
        marginLeft: 'auto',
    },
    // ── Locate Me FAB ────────────────────────────────────────────────────────
    locateMeBtn: {
        position: 'absolute',
        bottom: 220,
        right: 16,
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(14, 14, 18, 0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    locateMeBtnActive: {
        backgroundColor: CLUB_COLOR,
        borderColor: CLUB_COLOR,
    },
    // ── Zoom controls ────────────────────────────────────────────────────────
    zoomControls: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 180 : (StatusBar.currentHeight ?? 0) + 130,
        right: 16,
        backgroundColor: 'rgba(14, 14, 18, 0.92)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    zoomBtn: {
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomBtnDisabled: {
        opacity: 0.4,
    },
    zoomDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 8,
    },
    // ── Popup card ────────────────────────────────────────────────────────────
    popup: {
        position: 'absolute',
        bottom: 90,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(14, 14, 18, 0.97)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 16,
        overflow: 'hidden',
    },
    popupClose: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    popupInner: {
        flexDirection: 'row',
        padding: 12,
    },
    popupImage: {
        width: 90,
        height: 110,
        borderRadius: 14,
    },
    popupContent: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'space-between',
    },
    popupBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    typeBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.6,
    },
    popupDetail: {
        fontSize: 12,
        fontWeight: '700',
    },
    popupName: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        marginTop: 4,
    },
    popupMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    popupSubtitle: {
        color: '#9CA3AF',
        fontSize: 12,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 10,
        marginTop: 6,
    },
    ctaText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '800',
    },
});

export default InteractiveMapScreen;
