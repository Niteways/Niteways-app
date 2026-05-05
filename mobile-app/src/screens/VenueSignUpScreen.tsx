import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    ImageBackground,
    StatusBar,
    Modal,
    FlatList,
    TouchableWithoutFeedback,
} from 'react-native';
import Input from '../components/Input';
import Button from '../components/Button';
import { authService } from '../services/auth';
import { getCities, City } from '../services/database';
import { CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

const VenueSignUpScreen = ({ navigation }: any) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [venueName, setVenueName] = useState('');
    const [cities, setCities] = useState<City[]>([]);
    const [selectedCity, setSelectedCity] = useState<City | null>(null);
    const [cityModal, setCityModal] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getCities()
            .then(setCities)
            .catch(() => setCities([]));
    }, []);

    const handleSignUp = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            Alert.alert('Missing info', 'Please enter your first and last name.');
            return;
        }
        if (!email.trim() || !password) {
            Alert.alert('Missing info', 'Please enter email and password.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Passwords', 'Passwords do not match.');
            return;
        }
        if (!venueName.trim()) {
            Alert.alert('Missing info', 'Please enter your venue name.');
            return;
        }
        if (!selectedCity) {
            Alert.alert('Missing info', 'Please select a city for your venue.');
            return;
        }

        try {
            setLoading(true);
            const authData = await authService.signUpVenue({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                phone: phone.trim(),
                password,
                venueName: venueName.trim(),
                cityId: selectedCity.id,
            });

            if (authData.session) {
                navigation.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'VenuePortal' }],
                    })
                );
            } else {
                Alert.alert(
                    'Account created',
                    'Check your email to verify your account, then log in. You will land in the venue app.',
                    [{ text: 'OK', onPress: () => navigation.replace('Login') }]
                );
            }
        } catch (error: any) {
            let msg = error?.message || 'Sign up failed.';
            if (msg.includes('already registered')) {
                msg = 'This email is already registered. Try logging in.';
            }
            Alert.alert('Sign up failed', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80' }}
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.flex}
                >
                    <ScrollView
                        contentContainerStyle={styles.scroll}
                        keyboardShouldPersistTaps="handled"
                    >
                        <TouchableOpacity
                            style={styles.backRow}
                            onPress={() => navigation.navigate('Welcome')}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Icon name="chevron-back" size={22} color="#FBBF24" />
                            <Text style={styles.backText}>Account type</Text>
                        </TouchableOpacity>

                        <Text style={styles.brand}>NITEWAYS</Text>
                        <Text style={styles.subtitle}>Register your venue</Text>

                        <Text style={styles.sectionLabel}>Owner</Text>
                        <View style={styles.row}>
                            <View style={styles.half}>
                                <Input
                                    placeholder="First name"
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    style={styles.input}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                            <View style={[styles.half, { marginLeft: 10 }]}>
                                <Input
                                    placeholder="Last name"
                                    value={lastName}
                                    onChangeText={setLastName}
                                    style={styles.input}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>
                        <Input
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={styles.input}
                            placeholderTextColor="#9CA3AF"
                        />
                        <Input
                            placeholder="Phone (optional)"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            style={styles.input}
                            placeholderTextColor="#9CA3AF"
                        />

                        <Text style={styles.sectionLabel}>Venue</Text>
                        <Input
                            placeholder="Venue name"
                            value={venueName}
                            onChangeText={setVenueName}
                            style={styles.input}
                            placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity
                            style={styles.cityBtn}
                            onPress={() => setCityModal(true)}
                            activeOpacity={0.7}
                        >
                            <Text style={selectedCity ? styles.cityText : styles.cityPlaceholder}>
                                {selectedCity ? `${selectedCity.name}, ${selectedCity.country}` : 'Select city'}
                            </Text>
                            <Icon name="chevron-down" size={18} color="#9CA3AF" />
                        </TouchableOpacity>

                        <Input
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            style={styles.input}
                            placeholderTextColor="#9CA3AF"
                        />
                        <Input
                            placeholder="Confirm password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            style={styles.input}
                            placeholderTextColor="#9CA3AF"
                        />

                        <Button title="Create venue account" onPress={handleSignUp} loading={loading} style={styles.btn} />

                        <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginText}>
                                Already registered? <Text style={styles.loginBold}>Log in</Text>
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>

            <Modal visible={cityModal} transparent animationType="fade">
                <TouchableWithoutFeedback onPress={() => setCityModal(false)}>
                    <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>
                <View style={styles.modalSheet}>
                    <Text style={styles.modalTitle}>City</Text>
                    <FlatList
                        data={cities}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.cityRow}
                                onPress={() => {
                                    setSelectedCity(item);
                                    setCityModal(false);
                                }}
                            >
                                <Text style={styles.cityRowText}>
                                    {item.name}, {item.country}
                                </Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.emptyCities}>No cities in database. Add cities in Supabase admin.</Text>
                        }
                    />
                </View>
            </Modal>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)' },
    flex: { flex: 1 },
    scroll: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 8 : 8,
        paddingBottom: 40,
    },
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        alignSelf: 'flex-start',
    },
    backText: {
        color: '#FBBF24',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 4,
    },
    brand: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 4,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 24,
        marginTop: 6,
    },
    sectionLabel: {
        color: '#FBBF24',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 10,
        marginTop: 8,
    },
    row: { flexDirection: 'row' },
    half: { flex: 1 },
    input: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        color: '#fff',
        marginBottom: 12,
    },
    cityBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
    },
    cityText: { color: '#fff', fontSize: 16 },
    cityPlaceholder: { color: '#6B7280', fontSize: 16 },
    btn: { marginTop: 8 },
    loginLink: { alignItems: 'center', marginTop: 20 },
    loginText: { color: '#9CA3AF', fontSize: 14 },
    loginBold: { fontWeight: '700', color: '#fff' },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalSheet: {
        position: 'absolute',
        left: 24,
        right: 24,
        maxHeight: '50%',
        top: '25%',
        backgroundColor: '#111',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#374151',
        paddingVertical: 12,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    cityRow: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#374151',
    },
    cityRowText: { color: '#E5E7EB', fontSize: 15 },
    emptyCities: {
        color: '#6B7280',
        padding: 16,
        fontSize: 14,
    },
});

export default VenueSignUpScreen;
