import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform, KeyboardAvoidingView, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Input from '../components/Input';
import Button from '../components/Button';

const SecurityScreen = ({ navigation }: any) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', "Passwords don't match");
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);
        try {
            // Mock API call - in real app, call authService.changePassword()
            await new Promise(resolve => setTimeout(resolve, 1500));

            Alert.alert('Success', 'Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            Alert.alert('Error', 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle2FA = () => {
        setTwoFactorEnabled(!twoFactorEnabled);
        // Mock API call would go here
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                    <Icon name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Security</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Change Password Section */}
                <View style={styles.sectionHeader}>
                    <Icon name="lock-closed" size={20} color="#7C3AED" />
                    <Text style={styles.sectionTitle}>Change Password</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Current Password</Text>
                    <Input
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>New Password</Text>
                    <Input
                        placeholder="Enter new password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>Confirm New Password</Text>
                    <Input
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />

                    <Button
                        title="Update Password"
                        onPress={handleChangePassword}
                        loading={isLoading}
                        style={styles.updateButton}
                    />
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Two-Factor Authentication */}
                <View style={styles.sectionHeader}>
                    <Icon name="shield-checkmark" size={20} color="#7C3AED" />
                    <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
                </View>

                <View style={styles.twoFactorCard}>
                    <View style={styles.twoFactorInfo}>
                        <Icon name="phone-portrait-outline" size={24} color="#9CA3AF" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.settingTitle}>Enable 2FA</Text>
                            <Text style={styles.settingDesc}>Add an extra layer of security</Text>
                        </View>
                    </View>
                    <Switch
                        trackColor={{ false: '#374151', true: '#7C3AED' }}
                        thumbColor={twoFactorEnabled ? '#fff' : '#f4f3f4'}
                        ios_backgroundColor="#374151"
                        onValueChange={handleToggle2FA}
                        value={twoFactorEnabled}
                    />
                </View>

                <Text style={styles.helpText}>
                    Two-factor authentication adds an additional layer of security to your account by requiring a verification code when you sign in.
                </Text>

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
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    form: {
        marginBottom: 24,
    },
    label: {
        color: '#D1D5DB',
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '500',
    },
    updateButton: {
        marginTop: 20,
        backgroundColor: '#D97706', // Gold/Warning color for change password
    },
    divider: {
        height: 1,
        backgroundColor: '#1F2937',
        marginVertical: 24,
    },
    twoFactorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(31, 41, 55, 0.3)', // bg-muted/30
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    twoFactorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    settingDesc: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2,
    },
    helpText: {
        color: '#6B7280',
        fontSize: 12,
        lineHeight: 18,
    },
});

export default SecurityScreen;
