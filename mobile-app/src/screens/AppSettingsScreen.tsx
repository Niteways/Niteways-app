import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Platform,
    StatusBar,
    Alert,
    Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const SettingsSection = ({ title, icon, color = "#F7C948", children }: any) => (
    <View style={styles.section}>
        <View style={styles.sectionHeader}>
            {icon && <Icon name={icon} size={20} color={color} />}
            <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        </View>
        <View style={styles.sectionContent}>
            {children}
        </View>
    </View>
);

const SettingItem = ({ icon, title, subtitle, value, onValueChange, showSwitch = true, isDestructive = false }: any) => (
    <View style={styles.settingItem}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {icon && <Icon name={icon} size={20} color="#9CA3AF" style={{ marginRight: 16 }} />}
            <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, isDestructive && styles.destructiveText]}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
        </View>
        {showSwitch && (
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#3F3F46', true: '#F7C948' }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : '#fff'}
                ios_backgroundColor="#3F3F46"
            />
        )}
    </View>
);

const AppSettingsScreen = ({ navigation }: any) => {
    const [settings, setSettings] = useState({
        pushNotifications: true,
        emailNotifications: true,
        bookingReminders: true,
        marketingEmails: false,
        darkMode: true,
        hapticFeedback: true,
        soundEffects: true,
        language: "en",
    });
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);

    const languages = [
        { label: "English", value: "en" },
        { label: "Español", value: "es" },
        { label: "Svenska", value: "sv" },
        { label: "Deutsch", value: "de" },
        { label: "Français", value: "fr" },
    ];

    const currentLanguageName = languages.find(l => l.value === settings.language)?.label || "English";

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "This action is permanent and cannot be undone. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: () => Alert.alert("Request Sent", "Account deletion requires contacting support.")
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                >
                    <Icon name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>App Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <SettingsSection title="Notifications" icon="notifications-outline">
                    <View style={styles.permissionCard}>
                        <View style={styles.permissionInfo}>
                            <Icon name="notifications-off-outline" size={24} color="#9CA3AF" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.permissionTitle}>Web Push Notifications</Text>
                                <Text style={styles.permissionSubtitle}>Blocked - enable in browser settings</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.enableButton}>
                            <Text style={styles.enableButtonText}>Enable</Text>
                        </TouchableOpacity>
                    </View>

                    <SettingItem 
                        title="Email Notifications" 
                        subtitle="Booking confirmations & updates" 
                        value={settings.emailNotifications}
                        onValueChange={() => toggleSetting('emailNotifications')}
                    />
                    <SettingItem 
                        title="Booking Reminders" 
                        subtitle="Remind me before events" 
                        value={settings.bookingReminders}
                        onValueChange={() => toggleSetting('bookingReminders')}
                    />
                    <SettingItem 
                        title="Marketing Emails" 
                        subtitle="Promotions & special offers" 
                        value={settings.marketingEmails}
                        onValueChange={() => toggleSetting('marketingEmails')}
                    />
                </SettingsSection>

                <SettingsSection title="Appearance" icon="moon-outline">
                    <SettingItem 
                        title="Dark Mode" 
                        subtitle="Use dark theme" 
                        value={settings.darkMode}
                        onValueChange={() => toggleSetting('darkMode')}
                    />
                </SettingsSection>

                <SettingsSection title="Language" icon="globe-outline">
                    <TouchableOpacity 
                        style={styles.languageSelector} 
                        activeOpacity={0.7}
                        onPress={() => setShowLanguagePicker(true)}
                    >
                        <Text style={styles.languageText}>{currentLanguageName}</Text>
                        <Icon name="chevron-down" size={16} color="#9CA3AF" />
                    </TouchableOpacity>

                    <Modal visible={showLanguagePicker} transparent animationType="fade">
                        <TouchableOpacity 
                            style={styles.modalOverlay} 
                            activeOpacity={1} 
                            onPress={() => setShowLanguagePicker(false)}
                        >
                            <View style={styles.languageModal}>
                                {languages.map((lang) => (
                                    <TouchableOpacity 
                                        key={lang.value} 
                                        style={styles.languageItem}
                                        onPress={() => {
                                            setSettings(prev => ({ ...prev, language: lang.value }));
                                            setShowLanguagePicker(false);
                                        }}
                                    >
                                        <View style={styles.checkSpace}>
                                            {settings.language === lang.value && (
                                                <Icon name="checkmark" size={18} color="#fff" />
                                            )}
                                        </View>
                                        <Text style={[
                                            styles.languageItemText,
                                            settings.language === lang.value && styles.activeLanguageText
                                        ]}>
                                            {lang.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </TouchableOpacity>
                    </Modal>
                </SettingsSection>

                <SettingsSection title="Feedback" color="#fff">
                    <SettingItem 
                        icon="vibrate-outline"
                        title="Haptic Feedback" 
                        subtitle="Vibration on interactions" 
                        value={settings.hapticFeedback}
                        onValueChange={() => toggleSetting('hapticFeedback')}
                    />
                    <SettingItem 
                        icon="volume-medium-outline"
                        title="Sound Effects" 
                        subtitle="Play sounds on actions" 
                        value={settings.soundEffects}
                        onValueChange={() => toggleSetting('soundEffects')}
                    />
                </SettingsSection>

                <View style={[styles.section, { borderTopWidth: 1, borderTopColor: '#1F2937', paddingTop: 24, marginTop: 8 }]}>
                    <View style={styles.sectionHeader}>
                        <Icon name="trash-outline" size={20} color="#EF4444" />
                        <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Danger Zone</Text>
                    </View>
                    
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                        <Text style={styles.deleteButtonText}>Delete Account</Text>
                    </TouchableOpacity>
                    <Text style={styles.dangerNote}>This action is permanent and cannot be undone.</Text>
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
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1C1C1E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    sectionContent: {
        gap: 10,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#121212',
        padding: 16,
        borderRadius: 16,
        marginBottom: 4,
    },
    settingInfo: {
        flex: 1,
        paddingRight: 16,
    },
    settingTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    settingSubtitle: {
        color: '#9CA3AF',
        fontSize: 13,
        marginTop: 2,
    },
    permissionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#121212',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    permissionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    permissionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    permissionSubtitle: {
        color: '#9CA3AF',
        fontSize: 13,
        marginTop: 2,
    },
    enableButton: {
        backgroundColor: '#1C1C1E',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    enableButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    languageSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#121212',
        padding: 18,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1F2937',
    },
    languageText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    feedbackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    feedbackIcon: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        borderWidth: 1,
        borderColor: '#EF4444',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    deleteButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '700',
    },
    dangerNote: {
        color: '#6B7280',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 16,
    },
    destructiveText: {
        color: '#EF4444',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    languageModal: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    languageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    checkSpace: {
        width: 32,
        alignItems: 'flex-start',
    },
    languageItemText: {
        color: '#D1D5DB',
        fontSize: 17,
        fontWeight: '500',
    },
    activeLanguageText: {
        color: '#fff',
        fontWeight: '700',
    }
});

export default AppSettingsScreen;
