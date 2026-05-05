import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    StatusBar,
    Image,
    Platform,
    Dimensions,
    Linking,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80';

interface EventDetailScreenProps {
    route: any;
    navigation: any;
}

const EventDetailScreen: React.FC<EventDetailScreenProps> = ({ route, navigation }) => {
    // Safety guard — if params are missing, go back
    if (!route.params?.event) {
        navigation.goBack();
        return null;
    }

    const { event } = route.params;
    const [activeTab, setActiveTab] = useState<'tables' | 'tickets' | 'guestlist'>('tables');
    const [imgError, setImgError] = useState(false);

    // Normalise fields — support both Supabase shape and legacy mock shape
    const title    = event.title   || event.name     || 'Event';
    const venue    = event.venues?.name || event.venue  || 'Venue';
    const genre    = event.genre   || event.category || '';
    const price    = event.ticket_price ?? event.price ?? null;
    const time     = event.time    || '';
    const imageUri = imgError ? FALLBACK_IMAGE : (event.image_url || event.image || FALLBACK_IMAGE);

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    const handleLocation = () => {
        const query = encodeURIComponent(`${venue}`);
        Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() =>
            Alert.alert('Maps', `Search for "${venue}" on Google Maps.`)
        );
    };

    const handleInstagram = () => {
        Linking.openURL('https://www.instagram.com/').catch(() =>
            Alert.alert('Instagram', 'Could not open Instagram.')
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Hero Image */}
            <View style={styles.heroContainer}>
                <Image
                    source={{ uri: imageUri }}
                    style={styles.heroImage}
                    resizeMode="cover"
                    onError={() => setImgError(true)}
                />
                {/* Gradient fade into black at the bottom */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.45)', '#000']}
                    style={styles.heroGradient}
                    pointerEvents="none"
                />
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Event Info */}
                <View style={styles.infoSection}>
                    {/* Venue Name and Age Limit */}
                    <View style={styles.topRow}>
                        <Text style={styles.venueName}>{venue}</Text>
                        <View style={styles.ageTag}>
                            <Text style={styles.ageText}>21+</Text>
                        </View>
                    </View>

                    {/* Event Name */}
                    <Text style={styles.eventTitle}>{title}</Text>

                    {/* Price Level */}
                    <View style={styles.detailsRow}>
                        <Text style={styles.priceLevel}>€€€</Text>
                        {!!time && (
                            <View style={styles.detailItem}>
                                <Icon name="time-outline" size={14} color="#9CA3AF" />
                                <Text style={styles.detailText}>{time}</Text>
                            </View>
                        )}
                        {price != null && (
                            <View style={styles.detailItem}>
                                <Icon name="ticket-outline" size={14} color="#9CA3AF" />
                                <Text style={styles.detailText}>From €{price}</Text>
                            </View>
                        )}
                    </View>

                    {/* Music Genre */}
                    {!!genre && (
                        <View style={styles.genreRow}>
                            <Icon name="musical-notes" size={14} color="#9CA3AF" />
                            <Text style={styles.detailText}>{genre}</Text>
                        </View>
                    )}

                    {/* Event Date */}
                    {!!event.date && (
                        <View style={styles.dateRow}>
                            <Icon name="calendar-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.detailText}>{formatDate(event.date)}</Text>
                        </View>
                    )}

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Description */}
                    <Text style={styles.description}>
                        {event.description
                            ? event.description
                            : `Experience an unforgettable night of music, dancing, and entertainment at ${venue}. This exclusive event features top DJs and performers bringing you the best${genre ? ` ${genre}` : ''} music.`
                        }
                    </Text>

                    {/* Quick Actions */}
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity style={styles.actionButton} onPress={handleLocation}>
                            <Icon name="location" size={18} color="#fff" />
                            <Text style={styles.actionText}>Location</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={handleInstagram}>
                            <Icon name="logo-instagram" size={18} color="#fff" />
                            <Text style={styles.actionText}>Instagram</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'tables' && styles.activeTab]}
                        onPress={() => setActiveTab('tables')}
                    >
                        <Icon
                            name="people"
                            size={18}
                            color={activeTab === 'tables' ? '#FBBF24' : '#9CA3AF'}
                        />
                        <Text style={[styles.tabText, activeTab === 'tables' && styles.activeTabText]}>
                            Tables
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'tickets' && styles.activeTab]}
                        onPress={() => setActiveTab('tickets')}
                    >
                        <Icon
                            name="ticket"
                            size={18}
                            color={activeTab === 'tickets' ? '#FBBF24' : '#9CA3AF'}
                        />
                        <Text style={[styles.tabText, activeTab === 'tickets' && styles.activeTabText]}>
                            Tickets
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'guestlist' && styles.activeTab]}
                        onPress={() => setActiveTab('guestlist')}
                    >
                        <Icon
                            name="list"
                            size={18}
                            color={activeTab === 'guestlist' ? '#FBBF24' : '#9CA3AF'}
                        />
                        <Text style={[styles.tabText, activeTab === 'guestlist' && styles.activeTabText]}>
                            Guest List
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                <View style={styles.tabContent}>
                    {activeTab === 'tables' && (
                        <View style={styles.emptyState}>
                            <Icon name="people-outline" size={48} color="#4B5563" />
                            <Text style={styles.emptyTitle}>No tables available</Text>
                            <Text style={styles.emptySubtitle}>This event doesn't offer table reservations.</Text>
                        </View>
                    )}

                    {activeTab === 'tickets' && (
                        <View style={styles.emptyState}>
                            <Icon name="ticket-outline" size={48} color="#4B5563" />
                            <Text style={styles.emptyTitle}>No tickets available</Text>
                            <Text style={styles.emptySubtitle}>This event doesn't offer ticket sales.</Text>
                        </View>
                    )}

                    {activeTab === 'guestlist' && (
                        <View style={styles.emptyState}>
                            <Icon name="list-outline" size={48} color="#4B5563" />
                            <Text style={styles.emptyTitle}>Guest list not available</Text>
                            <Text style={styles.emptySubtitle}>This event doesn't have a guest list signup.</Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    heroContainer: {
        height: SCREEN_HEIGHT * 0.20,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1F2937',
    },
    heroGradient: {
        ...StyleSheet.absoluteFillObject,
        top: '50%',     // gradient starts halfway down
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 0) + 12,
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    infoSection: {
        padding: 16,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    venueName: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    ageTag: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#374151',
    },
    ageText: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '600',
    },
    eventTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    priceLevel: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    genreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#374151',
        marginVertical: 16,
    },
    description: {
        color: '#9CA3AF',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 20,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#374151',
        backgroundColor: '#000',
    },
    actionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
        paddingHorizontal: 16,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#FBBF24',
    },
    tabText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
    },
    tabContent: {
        padding: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
        backgroundColor: '#1F2937',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#374151',
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
    },
    emptySubtitle: {
        color: '#9CA3AF',
        fontSize: 14,
        marginTop: 4,
    },
});

export default EventDetailScreen;
