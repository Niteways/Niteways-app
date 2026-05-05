import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { CommonActions } from '@react-navigation/native';

const AboutScreen = ({ navigation }: any) => {
    const handleBack = () => {
        navigation.goBack();
    };

    const openLink = (url: string) => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    const features = [
        { title: "Table Booking", desc: "Reserve VIP tables" },
        { title: "Guest Lists", desc: "Skip the queue" },
        { title: "Event Tickets", desc: "Secure your spot" },
        { title: "Member Rewards", desc: "Earn points & perks" },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                    <Icon name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About Niteways</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Logo & Brand */}
                <View style={styles.brandSection}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>N</Text>
                    </View>
                    <Text style={styles.brandTitle}>Niteways</Text>
                    <Text style={styles.brandSubtitle}>Your nightlife companion</Text>
                </View>

                {/* Description */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.descriptionText}>
                        Niteways is the ultimate platform for discovering the best nightlife experiences.
                        From exclusive clubs and lounges to unforgettable events, we connect you with
                        the most sought-after venues in your city.
                    </Text>
                    <Text style={[styles.descriptionText, { marginTop: 12 }]}>
                        Book VIP tables, skip the line with guest lists, purchase tickets to events,
                        and earn rewards through our loyalty program. Experience nightlife like never before.
                    </Text>
                </View>

                {/* Features */}
                <View style={styles.featuresSection}>
                    <Text style={styles.sectionHeader}>FEATURES</Text>
                    <View style={styles.featuresGrid}>
                        {features.map((feature, index) => (
                            <View key={index} style={styles.featureCard}>
                                <Text style={styles.featureTitle}>{feature.title}</Text>
                                <Text style={styles.featureDesc}>{feature.desc}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Links */}
                <View style={styles.linksSection}>
                    <Text style={styles.sectionHeader}>CONNECT</Text>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => openLink('https://niteways.com')}
                    >
                        <View style={styles.linkContent}>
                            <Icon name="globe-outline" size={20} color="#F59E0B" />
                            <Text style={styles.linkText}>Website</Text>
                        </View>
                        <Icon name="open-outline" size={16} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => openLink('https://instagram.com/niteways')}
                    >
                        <View style={styles.linkContent}>
                            <Icon name="logo-instagram" size={20} color="#F59E0B" />
                            <Text style={styles.linkText}>Instagram</Text>
                        </View>
                        <Icon name="open-outline" size={16} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => openLink('mailto:hello@niteways.com')}
                    >
                        <View style={styles.linkContent}>
                            <Icon name="mail-outline" size={20} color="#F59E0B" />
                            <Text style={styles.linkText}>Contact Us</Text>
                        </View>
                        <Icon name="open-outline" size={16} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Version */}
                <View style={styles.versionSection}>
                    <Text style={styles.versionText}>Version 1.0.0</Text>
                    <Text style={styles.versionText}>© 2024 Niteways. All rights reserved.</Text>
                </View>

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
    brandSection: {
        alignItems: 'center',
        marginVertical: 20,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#F59E0B', // Gold color from logo
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
    },
    brandTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    brandSubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    sectionContainer: {
        backgroundColor: 'rgba(31, 41, 55, 0.3)', // bg-muted/30
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
    },
    descriptionText: {
        color: '#D1D5DB', // text-foreground/slight dim
        fontSize: 14,
        lineHeight: 22,
    },
    featuresSection: {
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    featureCard: {
        width: '48%', // approximate for 2 cols
        backgroundColor: 'rgba(31, 41, 55, 0.3)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#fff',
        marginBottom: 4,
    },
    featureDesc: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    linksSection: {
        marginBottom: 24,
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(31, 41, 55, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
    },
    linkContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    linkText: {
        color: '#fff',
        marginLeft: 12,
        fontSize: 14,
    },
    versionSection: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    versionText: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
});

export default AboutScreen;
