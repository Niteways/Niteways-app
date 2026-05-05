import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const TermsScreen = ({ navigation }: any) => {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                    <Icon name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Terms & Conditions</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Last Updated Box */}
                <View style={styles.lastUpdatedCard}>
                    <Icon name="document-text" size={24} color="#7C3AED" />
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.lastUpdatedLabel}>Last Updated</Text>
                        <Text style={styles.lastUpdatedValue}>January 2026</Text>
                    </View>
                </View>

                {/* Content Sections */}
                <View style={styles.contentContainer}>
                    <Section
                        title="1. Acceptance of Terms"
                        content="By accessing and using the Niteways application, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our services."
                    />

                    <Section
                        title="2. User Account"
                        content="To access certain features of the app, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account."
                    />

                    <Section
                        title="3. Booking & Reservations"
                        content="Table reservations and guest list sign-ups are subject to venue approval. We do not guarantee availability of tables or entry to venues. Cancellation policies vary by venue and are displayed at the time of booking."
                    />

                    <Section
                        title="4. Payments"
                        content="All payments are processed securely through our payment partners. Prices displayed are subject to change without notice. Deposits may be required for certain reservations and may be non-refundable."
                    />

                    <Section
                        title="5. User Conduct"
                        content="Users must conduct themselves appropriately when using our services and visiting partner venues. Any violation of venue rules or local laws may result in account suspension and denial of service."
                    />

                    <Section
                        title="6. Privacy"
                        content="Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information."
                    />

                    <Section
                        title="7. Limitation of Liability"
                        content="Niteways shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service."
                    />

                    <Section
                        title="8. Changes to Terms"
                        content="We reserve the right to modify these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms."
                    />

                    <Section
                        title="9. Contact"
                        content="For questions about these Terms & Conditions, please contact us at legal@niteways.com."
                    />
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const Section = ({ title, content }: { title: string, content: string }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionContent}>{content}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 0) + 16,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937',
        backgroundColor: 'rgba(0,0,0,0.95)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1F2937',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    lastUpdatedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(31, 41, 55, 0.3)', // bg-muted/30
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    lastUpdatedLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    lastUpdatedValue: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2,
    },
    contentContainer: {
        gap: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    sectionContent: {
        color: '#9CA3AF',
        fontSize: 14,
        lineHeight: 24,
    },
});

export default TermsScreen;
