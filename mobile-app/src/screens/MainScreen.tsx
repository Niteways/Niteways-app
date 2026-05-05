import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList, StatusBar, Image, Platform, Dimensions, ImageBackground, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import VenueCard from '../components/VenueCard';
import BottomNav from '../components/BottomNav';
import { Nightclub } from '../types';
import { CitySelectorModal } from '../components/CitySelectorModal';
import { useNotifications } from '../context/NotificationContext';
import { useFavorites } from '../context/FavoritesContext';
import LiquidSearchBar from '../components/LiquidSearchBar';
import { getCities, getVenues, City, Venue } from '../services/database';

// Mock Data (temporary until backend connection)

const MainScreen = ({ navigation }: any) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isCitySelectorVisible, setIsCitySelectorVisible] = useState(false);
    const [selectedCityId, setSelectedCityId] = useState<string | undefined>(undefined);
    const [cities, setCities] = useState<City[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const { unreadCount } = useNotifications();
    const { toggleFavorite, isFavorite } = useFavorites();

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        loadVenues();
    }, [selectedCityId]);

    const loadData = async () => {
        try {
            const citiesData = await getCities();
            setCities(citiesData);
        } catch (error) {
            console.error('Failed to load cities:', error);
        }
    };

    const loadVenues = async () => {
        try {
            setLoading(true);
            const venuesData = await getVenues(selectedCityId);
            setVenues(venuesData);
        } catch (error) {
            console.error('Failed to load venues:', error);
        } finally {
            setLoading(false);
        }
    };

    // City-specific background images
    const cityBackgrounds: { [key: string]: string } = {
        'Barcelona': 'https://th.bing.com/th/id/R.8cbd7d2bdd9e6ab920e2af173250666e?rik=JkaObKPvwNGHxg&riu=http%3a%2f%2fgetwallpapers.com%2fwallpaper%2ffull%2f2%2fc%2f1%2f1088406-download-barcelona-city-wallpapers-1920x1200-pc.jpg&ehk=%2bHzgv9a9mj%2bU%2fnS7%2fE19yvJG%2fJH5MosUJP39wSY%2bMqk%3d&risl=&pid=ImgRaw&r=0',
        'London': 'https://wallpaperaccess.com/full/32545.jpg',
        'Los Angeles': 'https://tse2.mm.bing.net/th/id/OIP.3gTJPOUl6XsULwWZjnzHegHaEK?rs=1&pid=ImgDetMain&o=7&rm=3',
        'Miami': 'https://wallpaperaccess.com/full/1717445.jpg',
        'Stockholm': 'https://cdn.getyourguide.com/img/location/533bfb836c2d1.jpeg/88.jpg',
    };

    const selectedCity = cities.find(c => c.id === selectedCityId);
    const displayCityName = selectedCity ? selectedCity.name : 'Select City';
    const DEFAULT_BG = 'https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=1000';
    // Use Supabase city image if available, then fallback to hardcoded map, then default
    const backgroundImage = selectedCity
        ? (selectedCity as any).image_url || cityBackgrounds[selectedCity.name] || DEFAULT_BG
        : DEFAULT_BG;

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.citySelector}
                onPress={() => setIsCitySelectorVisible(true)}
            >
                <Text style={styles.cityText}>{displayCityName}</Text>
                <Icon name="chevron-down" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => {
                    console.log('🔔 Bell tapped!');
                    navigation.navigate('Notifications');
                }}
                style={{
                    padding: 8,
                }}
            >
                <View style={{ position: 'relative' }}>
                    <Icon name="notifications-outline" size={24} color="#fff" />
                    <View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            backgroundColor: '#FBBF24',
                            borderRadius: 10,
                            minWidth: 18,
                            height: 18,
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingHorizontal: 4,
                            display: unreadCount > 0 ? 'flex' : 'none',
                        }}
                    >
                        <Text
                            style={{
                                color: '#000',
                                fontSize: 10,
                                fontWeight: 'bold',
                            }}
                        >
                            {unreadCount}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );

    const renderSearchBar = () => (
        <View style={styles.searchContainer}>
            <LiquidSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="What club are you looking for?"
            />
        </View>
    );

    const renderSection = (title: string, data: Nightclub[]) => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.sectionCount}>{data.length}</Text>
            </View>
            <FlatList
                horizontal
                data={data}
                renderItem={({ item }) => (
                    <VenueCard
                        venue={item}
                        onPress={() => navigation.navigate('VenueDetail', { club: item })}
                        onHeartPress={() => toggleFavorite(item)}
                        isFavorited={isFavorite(item.id)}
                        width={220}
                    />
                )}
                keyExtractor={item => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sectionList}
            />
        </View>
    );

    // Filter logic
    let filteredVenues = venues;

    // Filter by search query
    if (searchQuery) {
        filteredVenues = filteredVenues.filter(v =>
            v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.address?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // Map Supabase venue to Nightclub shape expected by VenueCard
    const toNightclub = (v: Venue): any => ({
        id: v.id,
        name: v.name,
        description: v.description,
        city: v.cities?.name || '',
        country: v.cities?.country || '',
        imageUrl: v.image_url,
        image: v.image_url,
        category: 'Nightclub',
        location: v.address,
        latitude: v.latitude,
        longitude: v.longitude,
        genre: v.genre,
        vibe: v.vibe,
        minAge: v.min_age,
        dressCode: v.dress_code,
    });

    const nightclubs = filteredVenues.map(toNightclub);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header with City Background Image */}
            {backgroundImage ? (
                <ImageBackground
                    source={{ uri: backgroundImage }}
                    style={styles.headerBackgroundContainer}
                    imageStyle={styles.headerBackgroundImage}
                >
                    <LinearGradient 
                        colors={['transparent', '#000']} 
                        locations={[0, 1]}
                        style={styles.cityGradientOverlay} 
                    />
                    <View style={[styles.headerOverlay, { paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 16 }]}>
                        {/* Fixed Header */}
                        {renderHeader()}

                        {/* Search Bar */}
                        {renderSearchBar()}
                    </View>
                </ImageBackground>
            ) : (
                <View style={styles.headerBackgroundContainerNoImage}>
                    <View style={[styles.headerOverlay, { paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 36 }]}>
                        {/* Fixed Header */}
                        {renderHeader()}

                        {/* Search Bar */}
                        {renderSearchBar()}
                    </View>
                </View>
            )}

            {/* Scrollable Content */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={{ alignItems: 'center', paddingTop: 60, paddingBottom: 40 }}>
                        <ActivityIndicator size="large" color="#FBBF24" />
                        <Text style={{ color: '#9CA3AF', marginTop: 12, fontSize: 14 }}>Loading venues...</Text>
                    </View>
                ) : (
                    <>
                        {renderSection(`Popular in ${displayCityName} 🔥`, nightclubs)}
                        {renderSection(`Nightclubs in ${displayCityName} 🎭`, nightclubs)}
                    </>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Navigation */}
            <BottomNav activeTab="Home" navigation={navigation} />

            {/* City Selector Modal */}
            <CitySelectorModal
                visible={isCitySelectorVisible}
                onClose={() => setIsCitySelectorVisible(false)}
                cities={cities}
                selectedCity={selectedCity}
                onCitySelect={setSelectedCityId}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000', // Black background
    },
    headerBackgroundContainer: {
        overflow: 'hidden',
    },
    headerBackgroundContainerNoImage: {
        // Compact layout for All Cities (no background image)
    },
    headerBackgroundImage: {
        opacity: 0.9,
        resizeMode: 'cover',
    },
    headerOverlay: {
        paddingBottom: 0,
    },
    cityGradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '35%',
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 80,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 0 : 60,
        marginBottom: 20,
    },
    citySelector: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cityText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        marginRight: 6,
    },
    notificationButton: {
        position: 'relative',
        padding: 4,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#FBBF24', // Yellow/Gold
        borderRadius: 10,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#000',
        fontSize: 10,
        fontWeight: 'bold',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 0,
    },
    searchBar: {
        backgroundColor: '#0F0F12',
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#262629',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        padding: 0, // Reset default padding
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionCount: {
        color: '#6B7280',
        fontSize: 12,
    },
    sectionList: {
        paddingHorizontal: 20,
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: '#1F2937',
        paddingBottom: 20, // For home indicator
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    navIconContainer: {
        marginBottom: 2,
    },
    navText: {
        fontSize: 10,
        marginTop: 4,
        color: '#9CA3AF',
    },
    activeNavText: {
        color: '#FBBF24',
    },
});

export default MainScreen;
