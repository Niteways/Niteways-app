import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, ImageBackground, StatusBar } from 'react-native';
import Input from '../components/Input';
import Button from '../components/Button';
import { authService } from '../services/auth';
import { CommonActions } from '@react-navigation/native';

const LoginScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        try {
            setLoading(true);
            await authService.signIn(email.trim(), password);
            const role = await authService.getAppRole();

            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [
                        { name: role === 'venue_owner' ? 'VenuePortal' : 'Main' },
                    ],
                })
            );
        } catch (error: any) {
            let errorMessage = error.message || 'Login failed. Please check your credentials.';

            // Supabase-specific error messages made user-friendly
            if (errorMessage.includes('Invalid login credentials')) {
                errorMessage = 'Incorrect email or password. Please try again.';
            } else if (errorMessage.includes('Email not confirmed')) {
                errorMessage = 'Your email is not confirmed yet. Please check your inbox or ask your admin to confirm your account.';
            } else if (errorMessage.includes('User not found')) {
                errorMessage = 'No account found with this email. Please sign up first.';
            } else {
                // Unexpected errors only — avoids LogBox red screen for normal auth failures
                console.warn('Login failed:', errorMessage, error);
            }

            Alert.alert('Login Failed', errorMessage);
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

            {/* Dark Overlay */}
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.content}>
                            {/* Branding */}
                            <Text style={styles.brandTitle}>NITEWAYS</Text>
                            <Text style={styles.subtitle}>Sign in to access the exclusive</Text>

                            <View style={styles.form}>
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
                                    placeholder="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    style={styles.input}
                                    placeholderTextColor="#9CA3AF"
                                />

                                <Button
                                    title="Sign In"
                                    onPress={handleLogin}
                                    loading={loading}
                                    style={styles.signInButton}
                                />

                                <TouchableOpacity
                                    style={styles.forgotPasswordContainer}
                                    onPress={() => navigation.navigate('ForgotPassword')}
                                >
                                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.linkContainer}
                                    onPress={() => navigation.navigate('Welcome')}
                                >
                                    <Text style={styles.linkText}>
                                        Don't have an account? <Text style={styles.linkBold}>Get started</Text>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)', // Dark overlay for readability
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    brandTitle: {
        fontSize: 42,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 4,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#D1D5DB', // Light gray
        textAlign: 'center',
        marginBottom: 48,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    form: {
        width: '100%',
        gap: 16,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        color: '#fff',
    },
    signInButton: {
        marginTop: 8,
    },
    forgotPasswordContainer: {
        alignItems: 'center',
        marginTop: 16,
    },
    forgotPasswordText: {
        color: '#D1D5DB',
        fontSize: 14,
        fontWeight: '500',
    },
    linkContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    linkText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    linkBold: {
        fontWeight: '700',
        color: '#fff',
    },
});

export default LoginScreen;
