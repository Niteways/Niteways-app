import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, Platform, StatusBar } from 'react-native';
import { authService } from '../services/auth';
import { CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import MemberCard from '../components/MemberCard';
import BottomNav from '../components/BottomNav';
import { User } from '../types';

const { width } = Dimensions.get('window');

const ActionButton = ({ icon, label, onPress }: any) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
        <Icon name={icon} size={24} color="#fff" />
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

const MenuItem = ({ icon, label, onPress, isLogout = false }: any) => (
    <TouchableOpacity
        style={[styles.menuItem, isLogout && styles.logoutItem]}
        onPress={onPress}
    >
        <View style={styles.menuItemLeft}>
            <Icon
                name={icon}
                size={20}
                color={isLogout ? "#EF4444" : "#9CA3AF"}
            />
            <Text style={[styles.menuText, isLogout && styles.logoutText]}>{label}</Text>
        </View>
        {!isLogout && <Icon name="chevron-forward" size={16} color="#4B5563" />}
    </TouchableOpacity>
);

const ProfileScreen = ({ navigation }: any) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const storedUser = await authService.getStoredUser();
            if (storedUser) {
                // Map Supabase user to User shape
                setUser({
                    ...storedUser,
                    firstName: storedUser.user_metadata?.first_name || storedUser.firstName || '',
                    lastName: storedUser.user_metadata?.last_name || storedUser.lastName || '',
                    name: `${storedUser.user_metadata?.first_name || ''} ${storedUser.user_metadata?.last_name || ''}`.trim(),
                    email: storedUser.email || '',
                });
            }
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await authService.logout();
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'Welcome' }],
                            })
                        );
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>NITEWAYS</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Icon name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Member Card */}
                <MemberCard
                    name={user?.name || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Member Name')}
                    userId={user?.id ? `USR-${String(user.id).slice(-6).toUpperCase()}` : 'USR-000'}
                    status="Gold"
                />

                {/* Quick Actions */}
                <View style={styles.actionsContainer}>
                    <ActionButton icon="time-outline" label="Bookings" onPress={() => navigation.navigate('Bookings')} />
                    <ActionButton
                        icon="person-outline"
                        label="Edit Profile"
                        onPress={() => navigation.navigate('EditProfile')}
                    />
                    <ActionButton icon="heart-outline" label="Favorites" onPress={() => navigation.navigate('Favorites')} />
                </View>

                {/* Menu List */}
                <View style={styles.menuContainer}>
                    <MenuItem icon="information-circle-outline" label="About Niteways" onPress={() => navigation.navigate('About')} />
                    <MenuItem icon="shield-checkmark-outline" label="Security" onPress={() => navigation.navigate('Security')} />
                    <MenuItem icon="document-text-outline" label="Terms & Conditions" onPress={() => navigation.navigate('Terms')} />
                    <MenuItem icon="settings-outline" label="Settings" onPress={() => navigation.navigate('AppSettings')} />
                    <MenuItem icon="help-circle-outline" label="Help & Support" onPress={() => navigation.navigate('HelpSupport')} />
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <View style={styles.menuItemLeft}>
                        <Icon name="log-out-outline" size={20} color="#EF4444" />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </View>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

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
    scrollContent: {
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    actionButton: {
        backgroundColor: '#111', // Darker background for buttons
        width: (width - 40 - 20) / 3, // Calculate width considering padding and gap
        height: 80,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#374151',
    },
    actionLabel: {
        color: '#D1D5DB',
        fontSize: 12,
        marginTop: 8,
    },
    menuContainer: {
        gap: 10,
        marginBottom: 24,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: '#111',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1F2937',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuText: {
        color: '#fff',
        fontSize: 14,
        marginLeft: 12,
        fontWeight: '500',
    },
    logoutItem: {
        marginTop: 24,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#EF4444',
        borderRadius: 12,
        justifyContent: 'center',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#7F1D1D', // Dark red border
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.05)', // Very faint red bg
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 14,
        marginLeft: 12,
        fontWeight: '600',
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
    activeNavText: {
        color: '#fff',
    },
});

export default ProfileScreen;
