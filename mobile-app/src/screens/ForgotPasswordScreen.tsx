import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, ImageBackground, StatusBar } from 'react-native';
import Input from '../components/Input';
import Button from '../components/Button';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../config/supabase';

const ForgotPasswordScreen = ({ navigation }: any) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());

            if (error) {
                Alert.alert('Could not send email', error.message);
                return;
            }

            Alert.alert(
                'Check your email',
                'If this email is registered in our project, you will receive a password reset link from Supabase. Use it to set a new password, then sign in again.',
                [{ text: 'Back to Login', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to send reset email. Please try again.');
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

            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.content}>
                            <Text style={styles.emoji}>🔐</Text>
                            <Text style={styles.title}>Forgot Password?</Text>
                            <Text style={styles.subtitle}>
                                Enter your email address and we'll send you a link to reset your password.
                            </Text>

                            <View style={styles.form}>
                                <Input
                                    placeholder="Email Address"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={styles.input}
                                    placeholderTextColor="#9CA3AF"
                                />

                                <Button
                                    title="Send Reset Link"
                                    onPress={handleResetPassword}
                                    loading={loading}
                                />

                                <TouchableOpacity
                                    style={styles.linkContainer}
                                    onPress={() => navigation.goBack()}
                                >
                                    <Text style={styles.linkText}>
                                        Remembered it? <Text style={styles.linkBold}>Log In</Text>
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
        backgroundColor: 'rgba(0,0,0,0.75)',
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 16,
        paddingHorizontal: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 40,
        alignItems: 'center',
    },
    emoji: {
        fontSize: 48,
        marginBottom: 20,
        textAlign: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#D1D5DB',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
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
    linkContainer: {
        marginTop: 16,
        alignItems: 'center',
    },
    linkText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    linkBold: {
        fontWeight: '600',
        color: '#7C3AED',
    },
});

export default ForgotPasswordScreen;
