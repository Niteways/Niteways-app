import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    Alert,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { User, Nightclub } from '../types';
import { TableItem } from '../data/tableLayouts';
import { createTableBooking } from '../services/database';
import { supabase } from '../config/supabase';

interface TableBookingFlowProps {
    visible: boolean;
    onClose: () => void;
    club: Nightclub;
    user: User | null;
    selectedTable: TableItem | null;
    selectedDate: Date;
    navigation?: any;
}

const STEPS = ['Booking Details', 'Confirmation'];

const TableBookingFlow: React.FC<TableBookingFlowProps> = ({
    visible,
    onClose,
    club,
    user,
    selectedTable,
    selectedDate,
    navigation,
}) => {
    const [step, setStep] = useState(0);
    const [guestCount, setGuestCount] = useState(2);
    const [specialRequests, setSpecialRequests] = useState('');
    const [loading, setLoading] = useState(false);

    const userName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`
        : 'Guest User';
    const userEmail = user?.email || 'guest@email.com';

    const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

    const handleNext = () => {
        if (step === 0) setStep(1);
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
        else onClose();
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                Alert.alert('Please log in', 'You need to be logged in to make a booking.');
                setLoading(false);
                return;
            }

            await createTableBooking({
                venue_id: String(club.id),
                guest_name: userName,
                guest_email: session.user.email || userEmail,
                guest_phone: user?.mobile || null,
                table_number: selectedTable?.label || 'General',
                party_size: guestCount,
                booking_date: toDateInput(selectedDate),
                // The current UI does not collect a booking time yet; use a venue-friendly default.
                booking_time: '22:00:00',
                price: selectedTable?.price || 0,
                notes: specialRequests,
            });

            setStep(2);
        } catch (error: any) {
            console.error('Booking error:', error);
            Alert.alert('Booking Failed', error?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(0);
        setGuestCount(2);
        setSpecialRequests('');
        onClose();
    };

    // ─── Step Indicator ──────────────────────────────
    const renderStepIndicator = () => (
        <View style={styles.stepRow}>
            {STEPS.map((_, index) => {
                const isActive = index <= step;
                const isCurrent = index === step;
                return (
                    <React.Fragment key={index}>
                        <View style={[
                            styles.stepCircle,
                            isActive ? styles.stepActive : styles.stepInactive,
                        ]}>
                            {index < step ? (
                                <Icon name="checkmark" size={16} color="#000" />
                            ) : (
                                <Text style={[
                                    styles.stepNumber,
                                    isActive ? styles.stepNumberActive : styles.stepNumberInactive,
                                ]}>{index + 1}</Text>
                            )}
                        </View>
                        {index < STEPS.length - 1 && (
                            <View style={[
                                styles.stepLine,
                                index < step ? styles.lineActive : styles.lineInactive,
                            ]} />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );

    // ─── Step 1: Booking Details ─────────────────────
    const renderDetailsStep = () => (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Booking Details</Text>

            {/* User Info Card */}
            <View style={styles.userCard}>
                <Text style={styles.userCardLabel}>Booking for</Text>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.userEmail}>{userEmail}</Text>
            </View>

            {/* Guest Count */}
            <Text style={styles.fieldLabel}>Number of Guests</Text>
            <View style={styles.guestRow}>
                <TouchableOpacity
                    style={styles.guestBtn}
                    onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
                >
                    <Text style={styles.guestBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.guestCount}>{guestCount}</Text>
                <TouchableOpacity
                    style={styles.guestBtn}
                    onPress={() => setGuestCount(Math.min(selectedTable?.capacity || 20, guestCount + 1))}
                >
                    <Text style={styles.guestBtnText}>+</Text>
                </TouchableOpacity>
            </View>

            {/* Special Requests */}
            <Text style={styles.fieldLabel}>Special Requests</Text>
            <View style={styles.textAreaContainer}>
                <TextInput
                    style={styles.textArea}
                    value={specialRequests}
                    onChangeText={setSpecialRequests}
                    placeholder="Any special requests or notes..."
                    placeholderTextColor="#555"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>
        </ScrollView>
    );

    // ─── Step 2: Confirmation ────────────────────────
    const renderConfirmStep = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const deposit = selectedTable
            ? Math.round(selectedTable.price * 0.15)
            : 0;

        return (
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Review Your Booking</Text>

                <View style={styles.reviewCard}>
                    <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Venue</Text>
                        <Text style={styles.reviewValue}>{club.name}</Text>
                    </View>
                    <View style={styles.reviewSep} />
                    <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Date</Text>
                        <Text style={styles.reviewValue}>{dateStr}</Text>
                    </View>
                    <View style={styles.reviewSep} />
                    <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Table</Text>
                        <Text style={styles.reviewValue}>{selectedTable?.label || 'N/A'}</Text>
                    </View>
                    <View style={styles.reviewSep} />
                    <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Guests</Text>
                        <Text style={styles.reviewValue}>{guestCount}</Text>
                    </View>
                    <View style={styles.reviewSep} />
                    <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Name</Text>
                        <Text style={styles.reviewValue}>{userName}</Text>
                    </View>
                    <View style={styles.reviewSep} />
                    <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Deposit Required</Text>
                        <Text style={styles.reviewDeposit}>
                            {selectedTable?.currency}{deposit.toLocaleString()}
                        </Text>
                    </View>
                </View>

                <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                        By confirming this booking, you agree to the venue's cancellation policy. A deposit may be required to secure your reservation.
                    </Text>
                </View>
            </ScrollView>
        );
    };

    // ─── Step 3: Success Screen ────────────────────────
    const renderSuccessStep = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        });

        // Price from the table selected
        const total = selectedTable ? `${selectedTable.currency}${selectedTable.price}` : '€1500';
        const labelStr = selectedTable ? selectedTable.label : 'T2';

        return (
            <View style={styles.successContainer}>
                {/* Yellow Checkmark Icon */}
                <View style={styles.successIconWrapper}>
                    <Icon name="checkmark" size={40} color="#FBBF24" />
                </View>

                <Text style={styles.successTitle}>Booking Request Sent!</Text>

                <Text style={styles.successSubtitle}>
                    Your table request at <Text style={{ fontWeight: 'bold', color: '#fff' }}>{club.name}</Text> for {dateStr} has been sent. You'll be notified once confirmed.
                </Text>

                {/* Dark Gray Status Card */}
                <View style={styles.successCard}>
                    <View style={styles.successRow}>
                        <Text style={styles.successLabel}>Table</Text>
                        <Text style={styles.successValueBold}>{labelStr}</Text>
                    </View>
                    <View style={styles.successSep} />
                    <View style={styles.successRow}>
                        <Text style={styles.successLabel}>Guests</Text>
                        <Text style={styles.successValueBold}>{guestCount}</Text>
                    </View>
                    <View style={styles.successSep} />
                    <View style={styles.successRow}>
                        <Text style={styles.successLabel}>Status</Text>
                        <Text style={styles.successStatus}>Pending Approval</Text>
                    </View>
                    <View style={styles.successSep} />
                    <View style={styles.successRow}>
                        <Text style={styles.successLabel}>Total</Text>
                        <Text style={styles.successValueTotal}>{total}</Text>
                    </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    style={styles.viewBookingsBtn}
                    onPress={() => {
                        handleClose();
                        if (navigation) {
                            navigation.navigate('Bookings');
                        }
                    }}
                >
                    <Text style={styles.viewBookingsText}>View My Bookings</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modal, step === 2 && styles.modalSuccess]}>

                    {/* Headers + Steps only show if not on Success step */}
                    {step !== 2 && (
                        <>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={styles.headerTitle}>Book a Table</Text>
                                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                                    <Icon name="close" size={22} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Step Indicator */}
                            <View style={styles.stepContainer}>
                                {renderStepIndicator()}
                            </View>
                        </>
                    )}

                    {/* Content */}
                    <View style={styles.content}>
                        {step === 0 && renderDetailsStep()}
                        {step === 1 && renderConfirmStep()}
                        {step === 2 && renderSuccessStep()}
                    </View>

                    {/* Footer only shows if not on Success step */}
                    {step !== 2 && (
                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={handleBack}>
                                <Icon name="chevron-back" size={18} color="#9CA3AF" />
                                <Text style={styles.cancelText}>
                                    {step === 0 ? 'Cancel' : 'Back'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.nextBtn,
                                    loading && styles.nextBtnDisabled,
                                ]}
                                onPress={step === 1 ? handleConfirm : handleNext}
                                disabled={loading}
                            >
                                <Text style={styles.nextBtnText}>
                                    {loading ? 'Processing...' : step === 1 ? 'Confirm Booking' : 'Next'}
                                </Text>
                                {!loading && <Icon name="chevron-forward" size={18} color="#000" />}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: '#0D0D12',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        width: '100%',
        height: '75%',
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: '#1A1A22',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 16,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1A1A22',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Step Indicator
    stepContainer: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepActive: {
        backgroundColor: '#FBBF24',
    },
    stepInactive: {
        backgroundColor: '#1F2937',
        borderWidth: 1,
        borderColor: '#374151',
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    stepNumberActive: {
        color: '#000',
    },
    stepNumberInactive: {
        color: '#9CA3AF',
    },
    stepLine: {
        flex: 1,
        height: 2,
        marginHorizontal: 8,
    },
    lineActive: {
        backgroundColor: '#FBBF24',
    },
    lineInactive: {
        backgroundColor: '#374151',
    },

    // Content
    content: {
        flex: 1,
        minHeight: 300,
    },
    scrollContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },

    // User Card
    userCard: {
        backgroundColor: '#141419',
        borderRadius: 14,
        padding: 18,
        borderWidth: 1,
        borderColor: '#1F2937',
        marginBottom: 24,
    },
    userCardLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        marginBottom: 6,
    },
    userName: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    userEmail: {
        color: '#9CA3AF',
        fontSize: 14,
    },

    // Guest Count
    fieldLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    guestRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    guestBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1A1A22',
        borderWidth: 1,
        borderColor: '#374151',
        alignItems: 'center',
        justifyContent: 'center',
    },
    guestBtnText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '300',
    },
    guestCount: {
        color: '#fff',
        fontSize: 26,
        fontWeight: 'bold',
        marginHorizontal: 24,
        minWidth: 30,
        textAlign: 'center',
    },

    // Special Requests
    textAreaContainer: {
        backgroundColor: '#141419',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#1F2937',
        marginBottom: 20,
    },
    textArea: {
        color: '#fff',
        fontSize: 14,
        padding: 16,
        minHeight: 100,
    },

    // Review / Confirmation
    reviewCard: {
        backgroundColor: '#141419',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#1F2937',
        marginBottom: 20,
        overflow: 'hidden',
    },
    reviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    reviewSep: {
        height: 1,
        backgroundColor: '#1F2937',
    },
    reviewLabel: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    reviewValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    reviewDeposit: {
        color: '#FBBF24',
        fontSize: 16,
        fontWeight: 'bold',
    },
    warningBox: {
        backgroundColor: 'rgba(251, 191, 36, 0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.25)',
        padding: 16,
        marginBottom: 20,
    },
    warningText: {
        color: '#FBBF24',
        fontSize: 13,
        lineHeight: 20,
    },

    // Footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'ios' ? 28 : 20,
        borderTopWidth: 1,
        borderTopColor: '#1A1A22',
    },
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    cancelText: {
        color: '#9CA3AF',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 4,
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FBBF24',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
        gap: 6,
    },
    nextBtnDisabled: {
        opacity: 0.6,
    },
    nextBtnText: {
        color: '#000',
        fontSize: 15,
        fontWeight: 'bold',
    },

    // ─── Success Screen Styles (Step 3) ──────────────
    modalSuccess: {
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    successContainer: {
        width: '100%',
        marginTop: 20,
    },
    successIconWrapper: {
        alignSelf: 'center',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#453823', // Dark gold/brown background from reference
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    successSubtitle: {
        color: '#9CA3AF',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 10,
    },
    successCard: {
        backgroundColor: '#1A1A22',
        borderRadius: 12,
        width: '100%',
        paddingVertical: 10,
        marginBottom: 32,
    },
    successRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    successSep: {
        height: 1,
        backgroundColor: '#2A2A35',
        marginHorizontal: 20,
    },
    successLabel: {
        color: '#9CA3AF',
        fontSize: 15,
    },
    successValueBold: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    successStatus: {
        color: '#FBBF24',
        fontSize: 15,
        fontWeight: 'bold',
    },
    successValueTotal: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    viewBookingsBtn: {
        backgroundColor: '#FBBF24',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    viewBookingsText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default TableBookingFlow;
