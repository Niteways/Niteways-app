import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert, ActivityIndicator, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Button from '../components/Button';
import { supabase } from '../config/supabase';

const BookingDetailScreen = ({ navigation, route }: any) => {
    const { booking } = route.params;
    const [isCancelling, setIsCancelling] = useState(false);

    const handleCancelBooking = async () => {
        Alert.alert(
            'Cancel Booking',
            'Are you sure you want to cancel this booking? Deposits may be non-refundable.',
            [
                { text: 'No, Keep it', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        setIsCancelling(true);
                        try {
                            const { error } = await supabase
                                .from('table_bookings')
                                .update({ status: 'cancelled' })
                                .eq('id', booking.id);
                            if (error) throw error;
                            Alert.alert('Success', 'Booking cancelled successfully');
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to cancel booking');
                            setIsCancelling(false);
                        }
                    }
                }
            ]
        );
    };

    const StatusBadge = ({ status }: { status: string }) => {
        let bg = 'rgba(245, 158, 11, 0.2)';
        let text = '#F59E0B';
        let border = 'rgba(245, 158, 11, 0.3)';

        if (status === 'confirmed') {
            bg = 'rgba(20, 184, 166, 0.2)';
            text = '#14B8A6';
            border = 'rgba(20, 184, 166, 0.3)';
        } else if (status === 'cancelled') {
            bg = 'rgba(239, 68, 68, 0.2)';
            text = '#EF4444';
            border = 'rgba(239, 68, 68, 0.3)';
        } else if (status === 'completed') {
            bg = '#1F2937';
            text = '#9CA3AF';
            border = '#374151';
        }

        return (
            <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
                <Text style={[styles.badgeText, { color: text }]}>{status.toUpperCase()}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                    <Icon name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Details</Text>
                <StatusBadge status={booking.status} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Venue Info */}
                <View style={styles.venueInfo}>
                    <Image source={{ uri: booking.venueImage }} style={styles.venueImage} />
                    <View style={styles.venueText}>
                        <Text style={styles.venueName}>{booking.venueName}</Text>
                        <View style={styles.locationRow}>
                            <Icon name="location-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.venueAddress} numberOfLines={1}>{booking.venueAddress}</Text>
                        </View>
                    </View>
                </View>

                {/* Booking ID */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Booking Reference</Text>
                    <Text style={styles.bookingId}>{booking.bookingId}</Text>
                </View>

                {/* Date & Time Grid */}
                <View style={styles.grid}>
                    <View style={styles.infoBox}>
                        <View style={styles.labelRow}>
                            <Icon name="calendar-outline" size={12} color="#9CA3AF" />
                            <Text style={styles.infoLabel}>Date</Text>
                        </View>
                        <Text style={styles.infoValue}>
                            {new Date(booking.date).toLocaleDateString(undefined, {
                                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                            })}
                        </Text>
                    </View>
                    <View style={styles.infoBox}>
                        <View style={styles.labelRow}>
                            <Icon name="time-outline" size={12} color="#9CA3AF" />
                            <Text style={styles.infoLabel}>Time</Text>
                        </View>
                        <Text style={styles.infoValue}>{booking.time}</Text>
                    </View>
                </View>

                {/* Table & Guests Grid */}
                <View style={styles.grid}>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>Table</Text>
                        <Text style={styles.infoValue}>{booking.table}</Text>
                    </View>
                    <View style={styles.infoBox}>
                        <View style={styles.labelRow}>
                            <Icon name="people-outline" size={12} color="#9CA3AF" />
                            <Text style={styles.infoLabel}>Guests</Text>
                        </View>
                        <Text style={styles.infoValue}>{booking.guests} people</Text>
                    </View>
                </View>

                {/* Contact Info */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                </View>
                <View style={styles.contactBox}>
                    {/* <Text style={styles.infoLabel}>Contact Information</Text> */}
                    <View style={styles.contactRow}>
                        <Icon name="mail-outline" size={16} color="#9CA3AF" />
                        <Text style={styles.contactText}>{booking.guestEmail}</Text>
                    </View>
                    <View style={styles.contactRow}>
                        <Icon name="call-outline" size={16} color="#9CA3AF" />
                        <Text style={styles.contactText}>{booking.guestPhone}</Text>
                    </View>
                </View>

                {/* Notes */}
                {booking.notes ? (
                    <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>Special Request</Text>
                        <Text style={styles.notesText}>{booking.notes}</Text>
                    </View>
                ) : null}

                {/* Payment Summary */}
                <View style={styles.paymentBox}>
                    <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Table Price</Text>
                        <Text style={styles.paymentValue}>€{booking.price}</Text>
                    </View>
                    <View style={styles.paymentRow}>
                        <View style={styles.labelRow}>
                            <Icon name="card-outline" size={12} color="#9CA3AF" />
                            <Text style={styles.paymentLabel}>Deposit Paid</Text>
                        </View>
                        <Text style={styles.depositValue}>-€{booking.depositPaid}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.paymentRow}>
                        <Text style={styles.totalLabel}>Remaining Balance</Text>
                        <Text style={styles.totalValue}>€{booking.price - booking.depositPaid}</Text>
                    </View>
                </View>

                {/* Actions */}
                {(booking.status === 'confirmed' || booking.status === 'pending') && (
                    <View style={styles.actions}>
                        <Button
                            title="Contact Venue"
                            onPress={() => { }}
                            style={styles.contactButton}
                        />
                        <View style={{ width: 12 }} />
                        <Button
                            title={isCancelling ? "Cancelling..." : "Cancel Booking"}
                            onPress={handleCancelBooking}
                            loading={isCancelling}
                            style={styles.cancelButton}
                        />
                        {/* 
                        <TouchableOpacity style={styles.outlineButton} onPress={() => { }}>
                            <Text style={styles.outlineButtonText}>Contact Venue</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.destructiveButton} 
                            onPress={handleCancelBooking}
                            disabled={isCancelling}
                        >
                            {isCancelling ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.destructiveButtonText}>Cancel Booking</Text>
                            )}
                        </TouchableOpacity>
                        */}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 0) + 16,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1F2937', // transparent or gray
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        flex: 1,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 20,
        paddingTop: 10,
    },
    venueInfo: {
        flexDirection: 'row',
        marginBottom: 24,
        alignItems: 'center',
    },
    venueImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#374151',
    },
    venueText: {
        flex: 1,
        marginLeft: 16,
    },
    venueName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    venueAddress: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    infoBox: {
        backgroundColor: 'rgba(31, 41, 55, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1F2937',
        flex: 1,
    },
    grid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 0,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    infoLabel: {
        color: '#6B7280', // muted
        fontSize: 12,
    },
    infoValue: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
    },
    bookingId: {
        color: '#7C3AED',
        fontSize: 16,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontWeight: '600',
    },
    sectionHeader: {
        marginBottom: 8,
        marginTop: 12,
    },
    sectionTitle: {
        color: '#9CA3AF',
        fontSize: 12,
    },
    contactBox: {
        backgroundColor: 'rgba(31, 41, 55, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1F2937',
        gap: 12,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    contactText: {
        color: '#fff',
        fontSize: 14,
    },
    notesBox: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    notesLabel: {
        color: '#F59E0B',
        fontSize: 12,
        marginBottom: 4,
    },
    notesText: {
        color: '#D1D5DB',
        fontSize: 14,
    },
    paymentBox: {
        backgroundColor: 'rgba(31, 41, 55, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#1F2937',
        gap: 12,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentLabel: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    paymentValue: {
        color: '#fff',
        fontSize: 14,
    },
    depositValue: {
        color: '#7C3AED',
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: '#374151',
        marginVertical: 4,
    },
    totalLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    totalValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        marginTop: 8,
    },
    contactButton: {
        flex: 1,
        backgroundColor: 'rgba(31, 41, 55, 0.5)',
        borderWidth: 1,
        borderColor: '#374151',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#7F1D1D', // Dark red
    },
});

export default BookingDetailScreen;
