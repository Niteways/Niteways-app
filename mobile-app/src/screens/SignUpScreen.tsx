import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform,
    ScrollView, TouchableOpacity, ImageBackground, StatusBar,
    Modal, FlatList, TextInput,
} from 'react-native';
import Input from '../components/Input';
import Button from '../components/Button';
import Checkbox from '../components/Checkbox';
import { authService } from '../services/auth';
import Icon from 'react-native-vector-icons/Ionicons';

// ── Country code data ────────────────────────────────────────────────────────
const COUNTRY_CODES = [
    { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
    { code: '+1', country: 'CA', flag: '🇨🇦', name: 'Canada' },
    { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
    { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
    { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
    { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
    { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
    { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
    { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Netherlands' },
    { code: '+46', country: 'SE', flag: '🇸🇪', name: 'Sweden' },
    { code: '+47', country: 'NO', flag: '🇳🇴', name: 'Norway' },
    { code: '+45', country: 'DK', flag: '🇩🇰', name: 'Denmark' },
    { code: '+358', country: 'FI', flag: '🇫🇮', name: 'Finland' },
    { code: '+41', country: 'CH', flag: '🇨🇭', name: 'Switzerland' },
    { code: '+43', country: 'AT', flag: '🇦🇹', name: 'Austria' },
    { code: '+32', country: 'BE', flag: '🇧🇪', name: 'Belgium' },
    { code: '+351', country: 'PT', flag: '🇵🇹', name: 'Portugal' },
    { code: '+30', country: 'GR', flag: '🇬🇷', name: 'Greece' },
    { code: '+48', country: 'PL', flag: '🇵🇱', name: 'Poland' },
    { code: '+420', country: 'CZ', flag: '🇨🇿', name: 'Czech Republic' },
    { code: '+36', country: 'HU', flag: '🇭🇺', name: 'Hungary' },
    { code: '+40', country: 'RO', flag: '🇷🇴', name: 'Romania' },
    { code: '+7', country: 'RU', flag: '🇷🇺', name: 'Russia' },
    { code: '+380', country: 'UA', flag: '🇺🇦', name: 'Ukraine' },
    { code: '+90', country: 'TR', flag: '🇹🇷', name: 'Turkey' },
    { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
    { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
    { code: '+974', country: 'QA', flag: '🇶🇦', name: 'Qatar' },
    { code: '+973', country: 'BH', flag: '🇧🇭', name: 'Bahrain' },
    { code: '+965', country: 'KW', flag: '🇰🇼', name: 'Kuwait' },
    { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
    { code: '+92', country: 'PK', flag: '🇵🇰', name: 'Pakistan' },
    { code: '+880', country: 'BD', flag: '🇧🇩', name: 'Bangladesh' },
    { code: '+94', country: 'LK', flag: '🇱🇰', name: 'Sri Lanka' },
    { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
    { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
    { code: '+82', country: 'KR', flag: '🇰🇷', name: 'South Korea' },
    { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
    { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
    { code: '+66', country: 'TH', flag: '🇹🇭', name: 'Thailand' },
    { code: '+62', country: 'ID', flag: '🇮🇩', name: 'Indonesia' },
    { code: '+63', country: 'PH', flag: '🇵🇭', name: 'Philippines' },
    { code: '+84', country: 'VN', flag: '🇻🇳', name: 'Vietnam' },
    { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
    { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico' },
    { code: '+54', country: 'AR', flag: '🇦🇷', name: 'Argentina' },
    { code: '+56', country: 'CL', flag: '🇨🇱', name: 'Chile' },
    { code: '+57', country: 'CO', flag: '🇨🇴', name: 'Colombia' },
    { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
    { code: '+234', country: 'NG', flag: '🇳🇬', name: 'Nigeria' },
    { code: '+254', country: 'KE', flag: '🇰🇪', name: 'Kenya' },
    { code: '+20', country: 'EG', flag: '🇪🇬', name: 'Egypt' },
    { code: '+212', country: 'MA', flag: '🇲🇦', name: 'Morocco' },
    { code: '+64', country: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
];

// ── Country Picker Modal ─────────────────────────────────────────────────────
interface CountryItem {
    code: string;
    country: string;
    flag: string;
    name: string;
}

interface CountryPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (item: CountryItem) => void;
    selected: CountryItem;
}

const CountryPickerModal: React.FC<CountryPickerModalProps> = ({ visible, onClose, onSelect, selected }) => {
    const [search, setSearch] = useState('');

    const filtered = COUNTRY_CODES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.includes(search)
    );

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={modalStyles.overlay}>
                <View style={modalStyles.sheet}>
                    {/* Header */}
                    <View style={modalStyles.header}>
                        <Text style={modalStyles.title}>Select Country Code</Text>
                        <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                            <Text style={modalStyles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search */}
                    <View style={modalStyles.searchRow}>
                        <TextInput
                            style={modalStyles.searchInput}
                            placeholder="Search country or code..."
                            placeholderTextColor="#6B7280"
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>

                    {/* List */}
                    <FlatList
                        data={filtered}
                        keyExtractor={(item, i) => `${item.country}-${i}`}
                        renderItem={({ item }) => {
                            const isSelected = item.country === selected.country && item.code === selected.code;
                            return (
                                <TouchableOpacity
                                    style={[modalStyles.item, isSelected && modalStyles.selectedItem]}
                                    onPress={() => { onSelect(item); onClose(); setSearch(''); }}
                                >
                                    <Text style={modalStyles.flag}>{item.flag}</Text>
                                    <Text style={modalStyles.countryName}>{item.name}</Text>
                                    <Text style={[modalStyles.countryCode, isSelected && modalStyles.selectedCode]}>
                                        {item.code}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                        ItemSeparatorComponent={() => <View style={modalStyles.separator} />}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            </View>
        </Modal>
    );
};

// ── Sign Up Screen ───────────────────────────────────────────────────────────
const SignUpScreen = ({ navigation }: any) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]); // Default: US +1
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSignUp = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            Alert.alert('Error', 'Please enter your first and last name');
            return;
        }
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }
        if (!mobile.trim() || mobile.length < 6) {
            Alert.alert('Error', 'Please enter a valid mobile number');
            return;
        }
        if (!password || password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (!termsAccepted) {
            Alert.alert('Error', 'You must agree to the Terms & Conditions and Privacy Policy');
            return;
        }

        try {
            setLoading(true);
            const fullPhone = `${selectedCountry.code}${mobile.trim()}`;
            const signUpData = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                mobile: fullPhone,
                password: password,
            };

            const result = await authService.signUp(signUpData);

            // If session exists immediately, email confirmation is disabled — go straight to app
            if (result?.session) {
                navigation.dispatch(
                    require('@react-navigation/native').CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'Main' }],
                    })
                );
            } else {
                // Email confirmation is required
                Alert.alert(
                    'Account Created!',
                    'Please check your email to verify your account, then come back and login.',
                    [{ text: 'Go to Login', onPress: () => navigation.replace('Login') }]
                );
            }
        } catch (error: any) {
            let errorMessage = error.message || 'Sign up failed. Please try again.';
            if (errorMessage.includes('already registered') || errorMessage.includes('already been registered')) {
                errorMessage = 'This email is already registered. Try logging in instead.';
            }
            Alert.alert('Sign Up Failed', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80' }}
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <CountryPickerModal
                visible={showCountryPicker}
                onClose={() => setShowCountryPicker(false)}
                onSelect={setSelectedCountry}
                selected={selectedCountry}
            />

            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.content}>
                            <TouchableOpacity
                                style={styles.backToWelcome}
                                onPress={() => navigation.navigate('Welcome')}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <Icon name="chevron-back" size={22} color="#FBBF24" />
                                <Text style={styles.backToWelcomeText}>Back</Text>
                            </TouchableOpacity>
                            <Text style={styles.brandTitle}>NITEWAYS</Text>
                            <Text style={styles.subtitle}>Join the exclusive movement</Text>

                            <View style={styles.form}>
                                {/* First + Last Name */}
                                <View style={styles.row}>
                                    <View style={styles.halfInput}>
                                        <Input
                                            placeholder="First Name"
                                            value={firstName}
                                            onChangeText={setFirstName}
                                            autoCapitalize="words"
                                            style={styles.input}
                                            placeholderTextColor="#9CA3AF"
                                        />
                                    </View>
                                    <View style={[styles.halfInput, { marginLeft: 10 }]}>
                                        <Input
                                            placeholder="Last Name"
                                            value={lastName}
                                            onChangeText={setLastName}
                                            autoCapitalize="words"
                                            style={styles.input}
                                            placeholderTextColor="#9CA3AF"
                                        />
                                    </View>
                                </View>

                                {/* Email */}
                                <Input
                                    placeholder="Email"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={styles.input}
                                    placeholderTextColor="#9CA3AF"
                                />

                                {/* Phone Row: Country Code + Number */}
                                <View style={styles.phoneRow}>
                                    <TouchableOpacity
                                        style={styles.countryCodeBtn}
                                        onPress={() => setShowCountryPicker(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                                        <Text style={styles.codeText}>{selectedCountry.code}</Text>
                                        <Text style={styles.chevron}>▾</Text>
                                    </TouchableOpacity>

                                    <View style={styles.phoneInputWrapper}>
                                        <Input
                                            placeholder="Mobile Number"
                                            value={mobile}
                                            onChangeText={setMobile}
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                            style={[styles.input, styles.phoneInput]}
                                            placeholderTextColor="#9CA3AF"
                                        />
                                    </View>
                                </View>

                                {/* Password */}
                                <Input
                                    placeholder="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    style={styles.input}
                                    placeholderTextColor="#9CA3AF"
                                />

                                {/* Confirm Password */}
                                <Input
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                    style={styles.input}
                                    placeholderTextColor="#9CA3AF"
                                />

                                {/* Terms */}
                                <View style={styles.checkboxContainer}>
                                    <Checkbox
                                        checked={termsAccepted}
                                        onChange={(val) => setTermsAccepted(val)}
                                        label="I agree to the Terms, Conditions, and Privacy Policy"
                                    />
                                </View>

                                <Button
                                    title="Sign Up"
                                    onPress={handleSignUp}
                                    loading={loading}
                                    style={styles.signUpButton}
                                />

                                <TouchableOpacity
                                    style={styles.linkContainer}
                                    onPress={() => navigation.navigate('Login')}
                                >
                                    <Text style={styles.linkText}>
                                        Already have an account? <Text style={styles.linkBold}>Log In</Text>
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </ImageBackground>
    );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 40 },
    content: { padding: 24, alignItems: 'center' },
    backToWelcome: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    backToWelcomeText: {
        color: '#FBBF24',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 4,
    },
    brandTitle: {
        fontSize: 36, fontWeight: '900', color: '#fff',
        letterSpacing: 4, marginBottom: 8, textAlign: 'center',
    },
    subtitle: {
        fontSize: 14, color: '#D1D5DB', textAlign: 'center',
        marginBottom: 32, letterSpacing: 1, textTransform: 'uppercase',
    },
    form: { width: '100%', gap: 16 },
    row: { flexDirection: 'row', width: '100%' },
    halfInput: { flex: 1 },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        color: '#fff',
    },
    // Phone row
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    countryCodeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 10,
        minWidth: 90,
    },
    flagText: { fontSize: 20 },
    codeText: { fontSize: 14, color: '#fff', fontWeight: '600' },
    chevron: { fontSize: 10, color: '#9CA3AF' },
    phoneInputWrapper: { flex: 1 },
    phoneInput: { marginBottom: 0 },
    // Checkbox
    checkboxContainer: {
        flexDirection: 'row', alignItems: 'center',
        marginBottom: 8, paddingHorizontal: 4,
    },
    signUpButton: { marginTop: 8 },
    linkContainer: { marginTop: 24, alignItems: 'center' },
    linkText: { fontSize: 14, color: '#9CA3AF' },
    linkBold: { fontWeight: '700', color: '#fff' },
});

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#111827',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    title: { color: '#fff', fontSize: 18, fontWeight: '700' },
    closeBtn: { padding: 4 },
    closeText: { color: '#9CA3AF', fontSize: 18 },
    searchRow: { padding: 12 },
    searchInput: {
        backgroundColor: '#1F2937',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#374151',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 12,
    },
    selectedItem: { backgroundColor: 'rgba(251,191,36,0.1)' },
    flag: { fontSize: 24 },
    countryName: { flex: 1, color: '#D1D5DB', fontSize: 15 },
    countryCode: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
    selectedCode: { color: '#FBBF24' },
    separator: { height: 1, backgroundColor: '#1F2937', marginLeft: 56 },
});

export default SignUpScreen;
