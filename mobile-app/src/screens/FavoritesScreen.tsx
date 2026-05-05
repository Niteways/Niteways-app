import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar, ScrollView, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import BottomNav from '../components/BottomNav';
import { useFavorites } from '../context/FavoritesContext';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80';

const FavoritesScreen = ({ navigation }: any) => {
    const { favorites, toggleFavorite } = useFavorites();

    return (
        <View style={styles.container}>
            {/* Top Header - NITEWAYS + Close */}
            <View style={styles.topHeader}>
                <Text style={styles.brandTitle}>NITEWAYS</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Sub Header - Back + Favorites */}
            <View style={styles.subHeader}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                >
                    <Icon name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Favorites</Text>
            </View>

            {favorites.length === 0 ? (
                /* Empty State */
                <View style={styles.emptyContainer}>
                    <Icon name="heart-outline" size={64} color="#6B7280" />
                    <Text style={styles.emptyTitle}>No favorites yet</Text>
                    <Text style={styles.emptySubtitle}>Tap the heart icon on venues you love</Text>
                </View>
            ) : (
                /* Favorites List */
                <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 100 }}>
                    {favorites.map(venue => {
                        const image =
                            (venue.galleryImages && venue.galleryImages.length > 0)
                                ? venue.galleryImages[0]
                                : venue.imageUrl || FALLBACK_IMAGE;

                        return (
                            <TouchableOpacity
                                key={venue.id}
                                style={styles.card}
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('VenueDetail', { club: venue })}
                            >
                                <Image source={{ uri: image }} style={styles.cardImage} />
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardName} numberOfLines={1}>{venue.name}</Text>
                                    <View style={styles.cardRow}>
                                        <Text style={styles.cardPrice}>{venue.priceLevel || '$$'}</Text>
                                        <Text style={styles.cardDot}>•</Text>
                                        <Text style={styles.cardCategory}>{venue.category || 'Nightclub'}</Text>
                                    </View>
                                    {venue.tags && venue.tags.length > 0 && (
                                        <Text style={styles.cardTags} numberOfLines={1}>
                                            {venue.tags.join(' • ')}
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.removeBtn}
                                    onPress={() => toggleFavorite(venue)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Icon name="heart" size={22} color="#EF4444" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}

            {/* Bottom Navigation */}
            <BottomNav activeTab="Profile" navigation={navigation} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 16,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    brandTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    subHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 6,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    emptyTitle: {
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtitle: {
        color: '#6B7280',
        fontSize: 14,
        marginTop: 8,
    },
    list: {
        flex: 1,
        paddingHorizontal: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A2E',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
    },
    cardImage: {
        width: 80,
        height: 80,
    },
    cardInfo: {
        flex: 1,
        padding: 12,
    },
    cardName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    cardPrice: {
        color: '#9CA3AF',
        fontSize: 12,
    },
    cardDot: {
        color: '#6B7280',
        fontSize: 12,
        marginHorizontal: 6,
    },
    cardCategory: {
        color: '#9CA3AF',
        fontSize: 12,
    },
    cardTags: {
        color: '#6B7280',
        fontSize: 11,
        marginTop: 4,
    },
    removeBtn: {
        padding: 16,
    },
});

export default FavoritesScreen;
