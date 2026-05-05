import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    StatusBar,
    ImageBackground,
    Platform,
    Animated,
    Pressable,
    Image,
    Modal,
    TouchableWithoutFeedback,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNotifications } from '../context/NotificationContext';
import BottomNav from '../components/BottomNav';
import { getEvents, Event as SupabaseEvent } from '../services/database';

const STATUS_BAR_H = StatusBar.currentHeight ?? 0;

// ── Genre filter options ──────────────────────────────────────────────────────
const GENRES = ['All', 'EDM', 'Hip Hop', 'Reggaeton', 'Techno', 'House'];

// ── Mock events ───────────────────────────────────────────────────────────────
const MOCK_EVENTS = [
    {
        id: '1',
        name: 'Robin Kadin – The Comeback at Spy Bar',
        venue: 'Spy Bar',
        city: 'Barcelona',
        date: '2026-03-26',
        time: '00:00 - 05:00',
        category: 'Hip Hop',
        price: 40,
        featured: true,
        image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    },
    {
        id: '2',
        name: 'Reggaeton Nights',
        venue: 'Opium Barcelona',
        city: 'Barcelona',
        date: '2026-02-15',
        time: '23:30 - 05:00',
        category: 'Reggaeton',
        price: 20,
        image: 'https://exoduslasvegas.com/wp-content/uploads/2021/06/4.-image-2.jpg',
    },
    {
        id: '4',
        name: 'Fabric All-Nighter',
        venue: 'Fabric',
        city: 'London',
        date: '2026-02-14',
        time: '22:00 - 08:00',
        category: 'Techno',
        price: 20,
        image: 'https://i.pinimg.com/originals/a3/24/6f/a3246f2e863d7086077c3d969b5810b7.jpg',
    },
    {
        id: '5',
        name: 'House Nation',
        venue: 'Ministry of Sound',
        city: 'London',
        date: '2026-02-15',
        time: '22:00 - 06:00',
        category: 'House',
        price: 25,
        image: 'https://tse3.mm.bing.net/th/id/OIP.kWCpsVGRd3kzV2l77gFTEQHaEv?pid=ImgDet&w=194&h=123&c=7&dpr=1.7&o=7&rm=3',
    },
    {
        id: '6',
        name: 'Hollywood Takeover',
        venue: 'Academy LA',
        city: 'Los Angeles',
        date: '2026-02-14',
        time: '22:00 - 04:00',
        category: 'EDM',
        price: 35,
        featured: true,
        image: 'https://www.caesars.com/content/scaffold_pages/generic/caesars/clv/en/omnia-nightclub/_jcr_content/cards/card/image.stdimg.hd.xl.jpg/1662499996799.jpg',
    },
    {
        id: '7',
        name: 'Downtown Vibes',
        venue: 'Exchange LA',
        city: 'Los Angeles',
        date: '2026-02-15',
        time: '21:00 - 03:00',
        category: 'House',
        price: 30,
        image: 'https://taogroup.com/wp-content/uploads/2022/07/Omnia_SteveAoki_SammyDean_07.01.22.Highres-75-970x647.jpg',
    },
    {
        id: '8',
        name: 'Miami Vice Night',
        venue: 'LIV Miami',
        city: 'Miami',
        date: '2026-02-14',
        time: '23:00 - 06:00',
        category: 'Hip Hop',
        price: 50,
        featured: true,
        image: 'https://www.travelandleisure.com/thmb/oA9JDMII-uWfTxxKx1ovFtPHq1g=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/TAL-liv-nightclub-fontainebleau-las-vegas-BEACHCLUBLV0325-cb3801028ed74632a59e723c4336299f.jpg',
    },
    {
        id: '9',
        name: 'Ultra White Party',
        venue: 'E11EVEN Miami',
        city: 'Miami',
        date: '2026-02-15',
        time: '00:00 - 08:00',
        category: 'EDM',
        price: 45,
        featured: true,
        image: 'https://clubbookers.com/wp-content/uploads/2023/01/2-7.jpg',
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

// ── Animated Event Card Component ───────────────────────────────────────────────
const AnimatedEventCard = ({ event, onPress }: { event: any, onPress: () => void }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const getGenreIcon = (genre: string) => {
        const g = genre.toLowerCase();
        if (g.includes("hip") || g.includes("r&b") || g.includes("rap")) return "mic-outline";
        if (g.includes("house") || g.includes("tech") || g.includes("edm")) return "headset-outline";
        return "musical-notes-outline";
    };

    const handlePressIn = () => {
        Animated.timing(scaleAnim, {
            toValue: 0.96, // Slight shrink on press, equivalent to the hover bounce
            duration: 150,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={[styles.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
                <ImageBackground
                    source={{ uri: event.image_url || event.image || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800' }}
                    style={styles.card}
                    resizeMode="cover"
                >
                    {/* Perfect smooth gradient purely in Native Base */}
                    <LinearGradient 
                        colors={['transparent', '#0A0A0A']} 
                        locations={[0.65, 1]}
                        style={StyleSheet.absoluteFillObject} 
                    />

                    {/* Date pill - top left */}
                    <View style={styles.datePill}>
                        <Text style={styles.datePillText} numberOfLines={1}>
                            {formatDate(event.date)}
                        </Text>
                    </View>

                    {/* Genre pill - top right */}
                    <View style={styles.genrePill}>
                        <Icon name={getGenreIcon(event.genre || '')} size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.genrePillText} numberOfLines={1}>
                            {event.genre || 'Music'}
                        </Text>
                    </View>

                    {/* Text bottom left */}
                    <View style={styles.cardTextArea}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
                        <Text style={styles.cardSub} numberOfLines={1}>
                            {(event as any).venues?.name || 'Venue'}  •  {event.time}
                        </Text>
                    </View>
                </ImageBackground>
            </Animated.View>
        </Pressable>
    );
};

// ── Component ─────────────────────────────────────────────────────────────────
const EventsScreen = ({ navigation }: any) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeGenre, setActiveGenre] = useState('All');
    const [isCitySelectorVisible, setIsCitySelectorVisible] = useState(false);
    const [selectedCityId, setSelectedCityId] = useState<string | undefined>(undefined);
    const [dropdownTop, setDropdownTop] = useState(0);
    const [events, setEvents] = useState<SupabaseEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const citySelectorRef = useRef<any>(null);
    const { unreadCount } = useNotifications();

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            setLoading(true);
            const data = await getEvents();
            setEvents(data);
        } catch (error) {
            console.error('Failed to load events:', error);
        } finally {
            setLoading(false);
        }
    };

    const cities = [
        { id: '1', name: 'Barcelona', country: 'Spain', image: 'https://th.bing.com/th/id/R.8cbd7d2bdd9e6ab920e2af173250666e?rik=JkaObKPvwNGHxg&riu=http%3a%2f%2fgetwallpapers.com%2fwallpaper%2ffull%2f2%2fc%2f1%2f1088406-download-barcelona-city-wallpapers-1920x1200-pc.jpg&ehk=%2bHzgv9a9mj%2bU%2fnS7%2fE19yvJG%2fJH5MosUJP39wSY%2bMqk%3d&risl=&pid=ImgRaw&r=0' },
        { id: '2', name: 'London', country: 'United Kingdom', image: 'https://wallpaperaccess.com/full/32545.jpg' },
        { id: '3', name: 'Los Angeles', country: 'USA', image: 'https://tse2.mm.bing.net/th/id/OIP.3gTJPOUl6XsULwWZjnzHegHaEK?rs=1&pid=ImgDetMain&o=7&rm=3' },
        { id: '4', name: 'Miami', country: 'United States', image: 'https://wallpaperaccess.com/full/1717445.jpg' },
        { id: '5', name: 'Stockholm', country: 'Sweden', image: 'https://cdn.getyourguide.com/img/location/533bfb836c2d1.jpeg/88.jpg' },
    ];

    const selectedCity = cities.find(c => c.id === selectedCityId);
    const displayCityName = selectedCity ? selectedCity.name : 'All Cities';

    const filteredEvents = events.filter(event => {
        const venueName = (event as any).venues?.name || '';
        const matchesGenre = activeGenre === 'All' || event.genre?.toLowerCase().includes(activeGenre.toLowerCase());
        const matchesSearch =
            event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.genre?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesGenre && matchesSearch;
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── City Hero Image (Fixed Background) ───────────────────────── */}
            {(() => {
                const DEFAULT_BG = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80';
                const heroImg = selectedCity?.image ?? DEFAULT_BG;
                return (
                    <ImageBackground
                        source={{ uri: heroImg }}
                        style={[styles.cityHeroContainer, { zIndex: 0, elevation: 0 }]}
                        resizeMode="cover"
                    >
                        <LinearGradient
                            colors={['rgba(0,0,0,0.1)', '#000000']}
                            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' }}
                        />
                    </ImageBackground>
                );
            })()}

            {/* ── Fixed Top Section ──────────────────────────────────────────── */}
            <View style={{ zIndex: 1, elevation: 1 }}>
                {/* ── Clean Header ──────────────────────────────────────────── */}
                <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 16 }]}>
                    {/* City selector */}
                    <TouchableOpacity
                        ref={citySelectorRef}
                        style={styles.citySelector}
                        onPress={() => {
                            citySelectorRef.current?.measureInWindow((_x: number, y: number, _w: number, h: number) => {
                                setDropdownTop(y + h + 4); // 4px below the bottom edge of "All Cities"
                            });
                            setIsCitySelectorVisible(true);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text style={styles.cityName}>{displayCityName}</Text>
                        <Icon name="chevron-down" size={16} color="#fff" />
                    </TouchableOpacity>

                    {/* Bell */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Notifications')}
                        style={styles.bellBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Icon name="notifications-outline" size={24} color="#fff" />
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ── Search + Filters ─────────────────────────────────────── */}
                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Icon name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search events..."
                            placeholderTextColor="#6B7280"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* ── Genre Chips ──────────────────────────────────────────── */}
                <View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.genreRow}
                    >
                        {GENRES.map(genre => (
                            <Pressable
                                key={genre}
                                style={({ pressed }) => [
                                    styles.chip,
                                    activeGenre === genre && styles.chipActive,
                                    pressed && activeGenre !== genre && styles.chipHover
                                ]}
                                onPress={() => setActiveGenre(genre)}
                            >
                                {({ pressed }) => (
                                    <Text style={[
                                        styles.chipText,
                                        activeGenre === genre && styles.chipTextActive,
                                    ]}>
                                        {genre}
                                    </Text>
                                )}
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* ── Scrollable Events List ──────────────────────────────────────────── */}
            <ScrollView showsVerticalScrollIndicator={false} style={[styles.scroll, { backgroundColor: 'transparent', zIndex: 0, elevation: 0 }]}>
                {/* ── Section Header ───────────────────────────────────────── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>All Upcoming Events 🎉</Text>
                </View>

                {/* ── Event Cards ──────────────────────────────────────────── */}
                {loading ? (
                    <View style={styles.emptyState}>
                        <ActivityIndicator size="large" color="#FBBF24" />
                        <Text style={[styles.emptySubtitle, { marginTop: 16 }]}>Loading events...</Text>
                    </View>
                ) : filteredEvents.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="calendar-outline" size={64} color="#4B5563" />
                        <Text style={styles.emptyTitle}>No upcoming events</Text>
                        <Text style={styles.emptySubtitle}>Try a different genre</Text>
                    </View>
                ) : (
                    <View style={styles.cardList}>
                        {filteredEvents.map(event => (
                            <AnimatedEventCard
                                key={event.id}
                                event={event}
                                onPress={() => navigation.navigate('EventDetail', { event })}
                            />
                        ))}
                    </View>
                )}

                <View style={{ height: 110 }} />
            </ScrollView>

            {/* ── Dropdown City Selector Overlay ───────────────────────────────────────── */}
            <Modal
                transparent={true}
                visible={isCitySelectorVisible}
                animationType="fade"
                onRequestClose={() => setIsCitySelectorVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsCitySelectorVisible(false)}>
                    <View style={StyleSheet.absoluteFillObject} />
                </TouchableWithoutFeedback>
                <View style={styles.dropdownModalContainer}>
                    <View style={[styles.dropdownModal, { top: dropdownTop }]}>
                        <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                                setSelectedCityId(undefined);
                                setIsCitySelectorVisible(false);
                            }}
                        >
                            <Text style={[styles.dropdownText, !selectedCity && styles.dropdownTextActive]}>All Cities</Text>
                        </TouchableOpacity>
                        {cities.map(city => (
                            <TouchableOpacity
                                key={city.id}
                                style={styles.dropdownItem}
                                onPress={() => {
                                    setSelectedCityId(city.id);
                                    setIsCitySelectorVisible(false);
                                }}
                            >
                                <Text style={[styles.dropdownText, selectedCity?.id === city.id && styles.dropdownTextActive]}>
                                    {city.name}, {city.country}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
            {/* ── Bottom Navigation ─────────────────────────────────────────── */}
            <BottomNav activeTab="Events" navigation={navigation} />
        </View>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' }, // Pure black background
    scroll: { flex: 1 },

    // Hero Background
    cityHeroContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 175,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : STATUS_BAR_H + 20, // Moved up, show more city image below
        paddingBottom: 12,
        backgroundColor: 'transparent',
    },
    citySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cityName: {
        color: '#fff',
        fontSize: 26, // Larger to stand out vs dropdown city names
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    bellBtn: {
        padding: 4,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#FBBF24',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: { color: '#000', fontSize: 9, fontWeight: 'bold' },

    // Search
    searchSection: {
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 15, 15, 0.78)', // Slightly lighter/translucent dark
        borderRadius: 30, // fully rounded pill shape
        paddingHorizontal: 20,
        height: 50, // slightly shorter than 52
        borderWidth: 1, // keeping border but making it super subtle
        borderColor: '#333333', // Slightly lighter border to match lighter bg
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 14, // Smaller placeholder text
    },

    // Genre chips
    genreRow: {
        paddingHorizontal: 16,
        paddingBottom: 16, // Increased to push chips slightly down
        gap: 12,
    },
    chip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: '#000000', // Pure black like search bar
        borderWidth: 1,
        borderColor: '#222222', // Subtle outline matching search bar
    },
    chipActive: {
        backgroundColor: '#FFCA28', // Slightly warmer, brighter gold
        borderColor: '#FFCA28',
    },
    chipHover: {
        borderColor: '#FFCA28',
    },
    chipText: {
        color: '#A1A1AA', // muted text
        fontSize: 13,
        fontWeight: '500', // Making default text slightly less bold
    },
    chipTextActive: {
        color: '#000',
        fontWeight: '500', // Normal weight, not bold at all
    },

    // Section header
    sectionHeader: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 19,
        fontWeight: '800',
        letterSpacing: 0.2,
    },

    // ── Compact Event Cards ──────────────────────────────────────────
    cardList: {
        paddingHorizontal: 12, // Reduced padding to stretch cards wider
        gap: 20, // Increased gap matching reference
    },
    cardWrap: {
        borderRadius: 20, // Slightly more rounded in reference
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: '#111',
    },
    card: {
        height: 140, // Shortened slightly for banner proportion
        width: '100%',
        justifyContent: 'space-between',
    },
    datePill: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16, // rounded-full
    },
    datePillText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    genrePill: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16, // rounded-full
        gap: 6,
    },
    genrePillText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    cardTextArea: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16, // Increased padding
    },
    cardTitle: {
        color: '#fff',
        fontSize: 18, // Larger title to match reference
        fontWeight: '800', // Bolder title
        lineHeight: 22,
        marginBottom: 6,
    },
    cardSub: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12.5, // Slightly larger subtitle
        fontWeight: '500',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 14,
    },
    emptySubtitle: {
        color: '#6B7280',
        fontSize: 14,
        marginTop: 6,
    },

    // Bottom nav
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        backgroundColor: '#0A0A0A',
        borderTopWidth: 1,
        borderTopColor: '#1F1F1F',
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        paddingTop: 10,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
    },
    navText: {
        color: '#6B7280',
        fontSize: 11,
    },

    // Dropdown Modal
    dropdownModalContainer: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: 'box-none',
    },
    dropdownModal: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 88 : STATUS_BAR_H + 48, // Align directly with Search bar top border
        left: 16, // Align with left edge of Search bar
        width: 190,
        backgroundColor: '#1E1E26',
        borderRadius: 8,
        paddingBottom: 4, // removed paddingTop to flush the first item to the top edge
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#2D2D35',
    },
    dropdownItem: {
        paddingVertical: 12, // slightly more padding again for standard touch targets
        paddingHorizontal: 16,
    },
    dropdownText: {
        color: '#D1D5DB', // brighter softer gray
        fontSize: 15, // Slightly larger
        fontWeight: '500',
    },
    dropdownTextActive: {
        color: '#FFFFFF', // bright white
        fontWeight: '700',
    },
});

export default EventsScreen;
