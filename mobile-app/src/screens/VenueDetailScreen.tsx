import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    StatusBar,
    Dimensions,
    Linking,
    Platform,
    ImageBackground,
    FlatList,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { Nightclub, User } from '../types';
import TableBookingFlow from '../components/TableBookingFlow';
import GuestListFlow from '../components/GuestListFlow';
import { authService } from '../services/auth';
import Button from '../components/Button';
import CalendarPicker from '../components/CalendarPicker';
import TableLayoutMap from '../components/TableLayoutMap';
import { getTableLayout, TableItem } from '../data/tableLayouts';
import {
    createTicketPurchase,
    getVenueTicketsForDate,
    type VenueTicket,
} from '../services/database';

const { width } = Dimensions.get('window');

export interface VenueDetailScreenProps {
    navigation: any;
    route: {
        params: {
            club: Nightclub;
        };
    };
}

type TabType = 'tables' | 'tickets' | 'guestlist';

const VenueDetailScreen: React.FC<VenueDetailScreenProps> = ({ navigation, route }) => {
    const { club } = route.params;
    const [activeTab, setActiveTab] = useState<TabType>('tickets');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [showGuestListModal, setShowGuestListModal] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);
    const [tickets, setTickets] = useState<Array<VenueTicket & { available: number; soldOut: boolean }>>([]);
    const [ticketsLoading, setTicketsLoading] = useState(true);
    const [buyingTicketId, setBuyingTicketId] = useState<string | null>(null);

    const tableLayout = getTableLayout(club.id);

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        let mounted = true;
        const loadTickets = async () => {
            setTicketsLoading(true);
            try {
                const data = await getVenueTicketsForDate(String(club.id), selectedDate);
                if (mounted) setTickets(data);
            } catch (error) {
                console.warn('[VenueDetailScreen] load tickets', error);
                if (mounted) setTickets([]);
            } finally {
                if (mounted) setTicketsLoading(false);
            }
        };

        void loadTickets();
        return () => {
            mounted = false;
        };
    }, [club.id, selectedDate]);

    const loadUser = async () => {
        const storedUser = await authService.getStoredUser();
        setUser(storedUser);
    };

    // Reliable fallback images (picsum always works)
    const FALLBACK_IMAGES = [
        'https://picsum.photos/seed/club1/800/600',
        'https://picsum.photos/seed/club2/800/600',
        'https://picsum.photos/seed/club3/800/600',
    ];

    const getSafeUrl = (url?: string) => {
        if (!url || url.includes('example.com')) return FALLBACK_IMAGES[0];
        return url;
    };

    const galleryImages = (() => {
        if (club.galleryImages && club.galleryImages.length > 0) {
            return club.galleryImages.filter((img: string) => img && img.length > 0).map(img => getSafeUrl(img));
        }
        const primary = getSafeUrl(club.imageUrl);
        return [primary, FALLBACK_IMAGES[1], FALLBACK_IMAGES[2]];
    })();

    const clubDetails = {
        capacity: '25+',
        hours: '23:00 - 05:00',
        genre: club.tags?.join(' & ') || 'Electronic, House',
        description:
            club.description ||
            `${club.name}, arguably one of the most renowned nightlife destinations, is perfectly located in the heart of the city within an iconic building. This hotspot is a key destination for both the local elite and visitors, celebrated for its vibrant atmosphere and diverse musical offerings. The club features world-class DJs and a variety of music genres, catering to a wide range of musical tastes. Known for its exclusive nights, ${club.name} offers a dynamic nightlife experience, making it a cultural epicenter and a go-to place for unforgettable evenings.`,
        address: club.address || 'Address not available',
        instagram: club.name.toLowerCase().replace(/\s+/g, ''),
    };

    // Format selected date
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const dateLabel = isToday
        ? `Today, ${selectedDate.getDate()} ${months[selectedDate.getMonth()]}`
        : `${selectedDate.getDate()} ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

    const handleLocationPress = () => {
        if (club.address) {
            const url = `https://maps.google.com/?q=${encodeURIComponent(club.address)}`;
            Linking.openURL(url);
        }
    };

    const handleInstagramPress = () => {
        const url = `https://instagram.com/${clubDetails.instagram}`;
        Linking.openURL(url);
    };

    const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

    const getUserDisplayName = () => {
        if (user?.firstName) return `${user.firstName} ${user.lastName || ''}`.trim();
        return user?.name || user?.username || 'Guest User';
    };

    const handleBuyTicket = async (ticket: VenueTicket & { available: number; soldOut: boolean }) => {
        if (ticket.soldOut || buyingTicketId) return;
        if (!user?.email) {
            Alert.alert('Login Required', 'Please log in to buy tickets.');
            return;
        }

        setBuyingTicketId(ticket.id);
        try {
            await createTicketPurchase({
                venue_id: String(club.id),
                ticket_row_id: ticket.id,
                ticket_name: ticket.name,
                ticket_price: Number(ticket.price || 0),
                guest_name: getUserDisplayName(),
                guest_email: user.email,
                event_name: club.name,
                event_date: toDateInput(selectedDate),
                quantity: 1,
            });
            const refreshed = await getVenueTicketsForDate(String(club.id), selectedDate);
            setTickets(refreshed);
            Alert.alert('Ticket Purchased', `Your ${ticket.name} ticket for ${club.name} is confirmed.`);
        } catch (error: any) {
            Alert.alert('Purchase Failed', error?.message || 'Could not buy this ticket. Please try again.');
        } finally {
            setBuyingTicketId(null);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Booking Modal */}
            <TableBookingFlow
                visible={showBookingModal}
                onClose={() => setShowBookingModal(false)}
                club={club}
                user={user}
                selectedTable={selectedTable}
                selectedDate={selectedDate}
                navigation={navigation}
            />

            {/* Guest List Modal */}
            <GuestListFlow
                visible={showGuestListModal}
                onClose={() => setShowGuestListModal(false)}
                club={club}
                user={user}
            />

            {/* Calendar Picker Modal */}
            <CalendarPicker
                visible={showCalendar}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onClose={() => setShowCalendar(false)}
            />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Hero Image with NITEWAYS Header */}
                <View style={styles.heroContainer}>
                    <FlatList
                        data={galleryImages}
                        keyExtractor={(_, index: number) => index.toString()}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                            const newIndex = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                            setCurrentImageIndex(newIndex);
                        }}
                        renderItem={({ item }: { item: string }) => (
                            <ImageBackground
                                source={{ uri: item }}
                                style={{ width: Dimensions.get('window').width, height: '100%' }}
                                imageStyle={styles.heroImage}
                                resizeMode="cover"
                            >
                                <LinearGradient 
                                    colors={['transparent', '#0A0A0A']} 
                                    locations={[0, 1]}
                                    style={styles.gradientOverlay} 
                                />
                            </ImageBackground>
                        )}
                    />

                    {/* Back button (top-left) */}
                    <View style={styles.headerOverlay}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={styles.backButton}
                            accessibilityLabel="Go back"
                        >
                            <Icon name="chevron-back" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Gallery Dot Indicators */}
                    {galleryImages.length > 1 && (
                        <View style={styles.indicators}>
                            {galleryImages.map((_: string, index: number) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.indicator,
                                        currentImageIndex === index && styles.activeIndicator,
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* Venue Info Section */}
                <View style={styles.infoSection}>
                    {/* Category + Capacity Row */}
                    <View style={styles.headerRow}>
                        <View style={styles.categoryBadge}>
                            <View style={styles.greenDot} />
                            <Text style={styles.categoryText}>{club.category || 'Nightclub'}</Text>
                        </View>
                        <View style={styles.capacityBadge}>
                            <Icon name="people-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.capacityText}>{clubDetails.capacity}</Text>
                        </View>
                    </View>

                    {/* Venue Name */}
                    <Text style={styles.venueName}>{club.name}</Text>

                    {/* Price + Genre + Hours */}
                    <View style={styles.metaRow}>
                        <Text style={styles.metaText}>{club.priceLevel || '$$'}</Text>
                        <View style={styles.metaItem}>
                            <Icon name="musical-notes" size={14} color="#9CA3AF" />
                            <Text style={styles.metaText}>{clubDetails.genre}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Icon name="time-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.metaText}>{clubDetails.hours}</Text>
                        </View>
                    </View>

                    {/* Description */}
                    <Text style={styles.description}>{clubDetails.description}</Text>

                    {/* Action Buttons - 2x2 Grid */}
                    <View style={styles.actionGrid}>
                        <TouchableOpacity style={styles.actionButtonOutlined} onPress={handleLocationPress}>
                            <Icon name="location-outline" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Location</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButtonOutlined}>
                            <Icon name="book-outline" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Menu</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButtonSpotify}>
                            <Icon name="musical-note-outline" size={18} color="#fff" />
                            <Text style={styles.actionButtonTextSpotify}>Listen on Spotify</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButtonOutlined} onPress={handleInstagramPress}>
                            <Icon name="logo-instagram" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Instagram</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Date Picker Row */}
                    <TouchableOpacity style={styles.datePickerRow} onPress={() => setShowCalendar(true)} activeOpacity={0.7}>
                        <View style={styles.dateLeft}>
                            <Icon name="calendar-outline" size={18} color="#4ADE80" />
                            <Text style={styles.dateText}>{dateLabel}</Text>
                        </View>
                        <Icon name="calendar-outline" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    {/* Tabs */}
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'tables' && styles.activeTab]}
                            onPress={() => setActiveTab('tables')}
                        >
                            <Icon
                                name="people-outline"
                                size={16}
                                color={activeTab === 'tables' ? '#fff' : '#9CA3AF'}
                            />
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === 'tables' && styles.activeTabText,
                                ]}
                            >
                                Tables
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'tickets' && styles.activeTab]}
                            onPress={() => setActiveTab('tickets')}
                        >
                            <Icon
                                name="ticket-outline"
                                size={16}
                                color={activeTab === 'tickets' ? '#fff' : '#9CA3AF'}
                            />
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === 'tickets' && styles.activeTabText,
                                ]}
                            >
                                Tickets
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'guestlist' && styles.activeTab]}
                            onPress={() => setActiveTab('guestlist')}
                        >
                            <Icon
                                name="list-outline"
                                size={16}
                                color={activeTab === 'guestlist' ? '#fff' : '#9CA3AF'}
                            />
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === 'guestlist' && styles.activeTabText,
                                ]}
                            >
                                Guest List
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tab Content */}
                    <View style={styles.tabContent}>
                        {activeTab === 'tables' && (
                            <View>
                                <TableLayoutMap
                                    layout={tableLayout}
                                    selectedTableId={selectedTable?.id || null}
                                    onSelectTable={(table) => setSelectedTable(table)}
                                />
                                {selectedTable && (
                                    <View style={styles.selectedTableCard}>
                                        <View style={styles.selectedCardRow}>
                                            <View>
                                                <Text style={styles.selectedCardName}>{selectedTable.label}</Text>
                                                <Text style={styles.selectedCardCapacity}>
                                                    Capacity: {selectedTable.capacity} guests
                                                </Text>
                                            </View>
                                            <View style={styles.selectedCardPriceBlock}>
                                                <Text style={styles.selectedCardPrice}>
                                                    {selectedTable.currency}{selectedTable.price}
                                                </Text>
                                                <Text style={styles.selectedCardMinSpend}>Min. spend</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.bookTableButton}
                                            activeOpacity={0.8}
                                            onPress={() => setShowBookingModal(true)}
                                        >
                                            <Text style={styles.bookTableButtonText}>Book Table</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        {activeTab === 'tickets' && (
                            <View>
                                <View style={styles.tabHeader}>
                                    <Text style={styles.tabTitle}>Available Tickets</Text>
                                    <Text style={styles.tabSubtitle}>
                                        Tickets for {dateLabel}. Purchases are shared with the venue portal.
                                    </Text>
                                </View>
                                {ticketsLoading ? (
                                    <View style={styles.emptyTab}>
                                        <ActivityIndicator color="#FBBF24" />
                                        <Text style={styles.emptyText}>Loading tickets…</Text>
                                    </View>
                                ) : tickets.length === 0 ? (
                                    <View style={styles.emptyTab}>
                                        <Icon name="ticket-outline" size={48} color="#374151" />
                                        <Text style={styles.emptyTitle}>No Tickets Available</Text>
                                        <Text style={styles.emptyText}>Check back closer to the event date.</Text>
                                    </View>
                                ) : (
                                    <View style={styles.ticketList}>
                                        {tickets.map((ticket) => (
                                            <View key={ticket.id} style={styles.ticketCard}>
                                                <View style={styles.ticketTopRow}>
                                                    <View style={styles.ticketIconWrap}>
                                                        <Icon name="ticket-outline" size={22} color="#FBBF24" />
                                                    </View>
                                                    <View style={styles.ticketInfo}>
                                                        <Text style={styles.ticketName}>{ticket.name}</Text>
                                                        {ticket.description ? (
                                                            <Text style={styles.ticketDescription} numberOfLines={2}>
                                                                {ticket.description}
                                                            </Text>
                                                        ) : null}
                                                        <Text style={styles.ticketAvailability}>
                                                            {ticket.soldOut ? 'Sold out' : `${ticket.available} available`}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.ticketPrice}>€{Number(ticket.price || 0).toFixed(0)}</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.buyTicketButton,
                                                        ticket.soldOut && styles.buyTicketButtonDisabled,
                                                    ]}
                                                    activeOpacity={0.85}
                                                    disabled={ticket.soldOut || buyingTicketId === ticket.id}
                                                    onPress={() => void handleBuyTicket(ticket)}
                                                >
                                                    {buyingTicketId === ticket.id ? (
                                                        <ActivityIndicator color="#000" />
                                                    ) : (
                                                        <Text
                                                            style={[
                                                                styles.buyTicketButtonText,
                                                                ticket.soldOut && styles.buyTicketButtonTextDisabled,
                                                            ]}
                                                        >
                                                            {ticket.soldOut ? 'Sold Out' : 'Buy Ticket'}
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {activeTab === 'guestlist' && (
                            <View>
                                <View style={styles.tabHeader}>
                                    <Text style={styles.tabTitle}>Exclusive Guest List</Text>
                                    <Text style={styles.tabSubtitle}>Get on the list for streamlined entry</Text>
                                </View>
                                <Button title="Join Guest List" onPress={() => setShowGuestListModal(true)} />
                                <View style={styles.featureList}>
                                    <View style={styles.featureItem}>
                                        <Icon name="checkmark-circle" size={16} color="#4ADE80" />
                                        <Text style={styles.featureText}>Reduced Entry Fee</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <Icon name="checkmark-circle" size={16} color="#4ADE80" />
                                        <Text style={styles.featureText}>Valid until 11:30 PM</Text>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <Icon name="checkmark-circle" size={16} color="#4ADE80" />
                                        <Text style={styles.featureText}>Limited Availability</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    scrollView: {
        flex: 1,
    },
    // Hero
    heroContainer: {
        height: Dimensions.get('window').height * 0.22,
        backgroundColor: '#1A1A2E',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '35%',
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 32 : Math.max((StatusBar.currentHeight ?? 24) - 8, 4),
        paddingHorizontal: 12,
        paddingBottom: 4,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    indicators: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    activeIndicator: {
        backgroundColor: '#fff',
        width: 24,
    },
    // Info Section
    infoSection: {
        padding: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    greenDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#4ADE80',
    },
    categoryText: {
        color: '#D1D5DB',
        fontSize: 14,
        fontWeight: '500',
    },
    capacityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#374151',
    },
    capacityText: {
        color: '#9CA3AF',
        fontSize: 13,
        fontWeight: '600',
    },
    venueName: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    metaText: {
        color: '#9CA3AF',
        fontSize: 13,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    description: {
        color: '#D1D5DB',
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 24,
    },
    // Action Buttons
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    actionButtonOutlined: {
        flex: 1,
        minWidth: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#374151',
    },
    actionButtonSpotify: {
        flex: 1,
        minWidth: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: '#1DB954',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    actionButtonTextSpotify: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    // Date Picker
    datePickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1F2937',
        backgroundColor: '#111318',
        marginBottom: 20,
    },
    dateLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dateText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    // Tabs
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937',
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#FBBF24',
    },
    tabText: {
        color: '#9CA3AF',
        fontSize: 13,
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: '600',
    },
    tabContent: {
        minHeight: 200,
        paddingBottom: 40,
    },
    // Tab Content
    tabHeader: {
        marginBottom: 20,
    },
    tabTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    tabSubtitle: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    featureList: {
        marginTop: 20,
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    featureText: {
        color: '#D1D5DB',
        fontSize: 14,
    },
    ticketList: {
        gap: 12,
    },
    ticketCard: {
        backgroundColor: '#111827',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1F2937',
        padding: 16,
    },
    ticketTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 14,
    },
    ticketIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(251,191,36,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ticketInfo: {
        flex: 1,
    },
    ticketName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    ticketDescription: {
        color: '#9CA3AF',
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 6,
    },
    ticketAvailability: {
        color: '#4ADE80',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    ticketPrice: {
        color: '#FBBF24',
        fontSize: 20,
        fontWeight: '900',
    },
    buyTicketButton: {
        backgroundColor: '#FBBF24',
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
    },
    buyTicketButtonDisabled: {
        backgroundColor: '#374151',
    },
    buyTicketButtonText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '800',
    },
    buyTicketButtonTextDisabled: {
        color: '#9CA3AF',
    },
    emptyTab: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        backgroundColor: '#111827',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1F2937',
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 12,
        marginBottom: 4,
    },
    emptyText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    selectedTableCard: {
        backgroundColor: '#1A1D24',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
    },
    selectedCardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    selectedCardName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    selectedCardCapacity: {
        color: '#9CA3AF',
        fontSize: 13,
        marginTop: 4,
    },
    selectedCardPriceBlock: {
        alignItems: 'flex-end',
    },
    selectedCardPrice: {
        color: '#FBBF24',
        fontSize: 22,
        fontWeight: '800',
    },
    selectedCardMinSpend: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2,
    },
    bookTableButton: {
        backgroundColor: '#FBBF24',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    bookTableButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default VenueDetailScreen;
