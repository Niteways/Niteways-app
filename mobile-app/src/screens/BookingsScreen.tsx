import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, ActivityIndicator, Alert, RefreshControl, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { authService } from '../services/auth';
import { getUserTableBookings } from '../services/database';
import BottomNav from '../components/BottomNav';

interface Booking {
    id: string;
    venueName: string;
    venueImage: string;
    venueAddress: string;
    date: string;
    time: string;
    table: string;
    guests: number;
    status: "confirmed" | "pending" | "completed" | "cancelled" | "declined" | "no_show";
    price: number;
    depositPaid: number;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    bookingId: string;
    notes?: string;
    qrCode?: string;
}

const statusStyles: Record<string, { bg: string, text: string, border: string }> = {
    confirmed: { bg: 'rgba(20, 184, 166, 0.2)', text: '#14B8A6', border: 'rgba(20, 184, 166, 0.3)' }, // Teal
    pending: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' }, // Amber
    completed: { bg: '#1F2937', text: '#9CA3AF', border: '#374151' }, // Gray
    cancelled: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' }, // Red
    declined: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
    no_show: { bg: 'rgba(239, 68, 68, 0.1)', text: '#F87171', border: 'rgba(239, 68, 68, 0.2)' },
};

const BookingsScreen = ({ navigation }: any) => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<"upcoming" | "requests" | "past" | "cancelled">("upcoming");
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const user = await authService.getStoredUser();
            if (!user?.id) {
                setBookings([]);
                return;
            }

            const data = await getUserTableBookings(user.email || '');

            const mappedBookings: Booking[] = data.map((b: any) => ({
                id: b.id,
                venueName: b.venues?.name || 'Unknown Venue',
                venueImage: b.venues?.gallery_images?.[0] || b.venues?.image_url || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
                venueAddress: b.venues?.address || '',
                date: b.booking_date,
                time: b.booking_time || '--:--',
                table: b.table_number || 'Table',
                guests: b.party_size || 1,
                status: (b.status || 'pending') as any,
                price: b.price || 0,
                depositPaid: Math.round((b.price || 0) * 0.2),
                guestName: b.guest_name || user?.user_metadata?.first_name || 'Guest',
                guestEmail: b.guest_email || user?.email || '',
                guestPhone: b.guest_phone || user?.user_metadata?.mobile || '',
                bookingId: b.booking_id || b.id.substring(0, 8).toUpperCase(),
                notes: b.notes,
            }));

            setBookings(mappedBookings);
        } catch (error) {
            console.error('Error fetching bookings', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    const filteredBookings = bookings.filter(b => {
        if (activeFilter === "upcoming") return b.status === "confirmed";
        if (activeFilter === "requests") return b.status === "pending";
        if (activeFilter === "past") return b.status === "completed";
        if (activeFilter === "cancelled") return b.status === "cancelled" || b.status === "declined" || b.status === "no_show";
        return true;
    });

    const renderBookingItem = (booking: Booking) => {
        const isPast = booking.status === "completed";
        const isCancelled = booking.status === "cancelled" || booking.status === "declined";
        const style = statusStyles[booking.status] || statusStyles.pending;

        return (
            <TouchableOpacity
                key={booking.id}
                style={[styles.bookingCard, (isPast || isCancelled) && { opacity: 0.7 }]}
                onPress={() => navigation.navigate('BookingDetail', { booking })}
            >
                <View style={styles.cardHeader}>
                    <Image source={{ uri: booking.venueImage }} style={styles.venueImage} />
                    <View style={styles.cardContent}>
                        <View style={styles.cardTop}>
                            <Text style={styles.venueName}>{booking.venueName}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: style.bg, borderColor: style.border }]}>
                                <Text style={[styles.statusText, { color: style.text }]}>{booking.status.toUpperCase()}</Text>
                            </View>
                        </View>

                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <Icon name="calendar-outline" size={12} color="#9CA3AF" />
                                <Text style={styles.detailText}>{new Date(booking.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Icon name="time-outline" size={12} color="#9CA3AF" />
                                <Text style={styles.detailText}>{booking.time}</Text>
                            </View>
                        </View>

                        <View style={styles.detailsRow}>
                            <View style={styles.detailItem}>
                                <Icon name="location-outline" size={12} color="#9CA3AF" />
                                <Text style={styles.detailText}>Table {booking.table}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Icon name="people-outline" size={12} color="#9CA3AF" />
                                <Text style={styles.detailText}>{booking.guests} guests</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={[styles.price, (isPast || isCancelled) ? styles.mutedText : styles.whiteText]}>
                        €{booking.price}
                    </Text>
                    <View style={styles.viewDetails}>
                        <Text style={styles.viewDetailsText}>{isPast ? "Receipt Details" : "View Details"}</Text>
                        <Icon name="chevron-forward" size={14} color="#FBBF24" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            {/* Top Header - NITEWAYS + Close */}
            <View style={styles.topHeader}>
                <Text style={styles.brandTitle}>NITEWAYS</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Sub Header - Back + My Bookings */}
            <View style={styles.subHeader}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                >
                    <Icon name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bookings</Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabsContainer}>
                {[
                    { id: "upcoming", label: "Upcoming" },
                    { id: "requests", label: "Requests" },
                    { id: "past", label: "Past" },
                    { id: "cancelled", label: "Cancelled" },
                ].map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[
                            styles.tab,
                            activeFilter === tab.id && styles.activeTab
                        ]}
                        onPress={() => setActiveFilter(tab.id as any)}
                    >
                        <Text style={[
                            styles.tabText,
                            activeFilter === tab.id && styles.activeTabText
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F59E0B" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />}
                >
                    {filteredBookings.length > 0 ? (
                        filteredBookings.map(renderBookingItem)
                    ) : (
                        <View style={styles.emptyState}>
                            <Icon name="calendar-clear-outline" size={48} color="#4B5563" />
                            <Text style={styles.emptyTitle}>
                                {activeFilter === "upcoming" && "No upcoming bookings"}
                                {activeFilter === "requests" && "No pending requests"}
                                {activeFilter === "past" && "No past bookings"}
                                {activeFilter === "cancelled" && "No cancelled bookings"}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeFilter === "upcoming" && "Book a table at your favorite venue"}
                                {activeFilter === "requests" && "Your booking requests will appear here"}
                                {activeFilter === "past" && "Your past bookings will appear here"}
                                {activeFilter === "cancelled" && "Your cancelled bookings will appear here"}
                            </Text>
                        </View>
                    )}
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
        paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 0) + 20,
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
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
        marginBottom: 10,
    },
    tab: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#374151',
        backgroundColor: 'transparent',
    },
    activeTab: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
    },
    tabText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
    },
    activeTabText: {
        color: '#000',
        fontWeight: '600',
    },
    bottomNav: {
        height: 80,
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: '#1F2937',
        paddingBottom: 20,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    navText: {
        fontSize: 10,
        marginTop: 4,
        color: '#6B7280',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
        paddingTop: 0,
        paddingBottom: 40,
    },
    bookingCard: {
        backgroundColor: 'rgba(31, 41, 55, 0.3)',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1F2937',
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        padding: 12,
    },
    venueImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#374151',
    },
    cardContent: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    venueName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        color: '#9CA3AF',
        fontSize: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#1F2937',
        backgroundColor: 'rgba(31, 41, 55, 0.1)',
    },
    price: {
        fontSize: 14,
        fontWeight: '600',
    },
    whiteText: {
        color: '#fff',
    },
    mutedText: {
        color: '#9CA3AF',
    },
    viewDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewDetailsText: {
        color: '#FBBF24',
        fontSize: 12,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        color: '#9CA3AF',
        fontSize: 16,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        color: '#4B5563',
        fontSize: 14,
    },
});

export default BookingsScreen;
