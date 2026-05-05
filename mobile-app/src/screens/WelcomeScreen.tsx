import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ImageBackground,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const WelcomeScreen = ({ navigation }: any) => {
    return (
        <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80' }}
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <Text style={styles.logo}>NITEWAYS</Text>
                    <Text style={styles.tagline}>The global nightlife platform</Text>
                    <Text style={styles.hint}>Discover venues, book tables, and go out</Text>

                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => navigation.navigate('SignUp')}
                        activeOpacity={0.7}
                    >
                        <Icon name="sparkles-outline" size={22} color="#000" style={styles.btnIcon} />
                        <View style={styles.btnTextCol}>
                            <Text style={styles.primaryTitle}>Get started</Text>
                            <Text style={styles.primarySub}>Create a guest account</Text>
                        </View>
                        <Icon name="chevron-forward" size={20} color="#000" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginLink}
                        onPress={() => navigation.navigate('Login')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.loginText}>
                            Already have an account? <Text style={styles.loginBold}>Log in</Text>
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.venueStaffHint}>
                        Venue team? Log in with your invited account — venue sign-up is not open in the app yet.
                    </Text>
                </View>
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
        backgroundColor: 'rgba(0,0,0,0.82)',
        justifyContent: 'flex-end',
        paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    },
    content: {
        paddingHorizontal: 24,
    },
    logo: {
        fontSize: 40,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 6,
        textAlign: 'center',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 15,
        color: '#D1D5DB',
        textAlign: 'center',
        marginBottom: 8,
    },
    hint: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 32,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FBBF24',
        borderRadius: 14,
        paddingVertical: 18,
        paddingHorizontal: 18,
        marginBottom: 20,
    },
    btnIcon: {
        marginRight: 14,
    },
    btnTextCol: {
        flex: 1,
    },
    primaryTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#000',
    },
    primarySub: {
        fontSize: 13,
        color: 'rgba(0,0,0,0.65)',
        marginTop: 2,
    },
    loginLink: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    loginText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    loginBold: {
        fontWeight: '700',
        color: '#fff',
    },
    venueStaffHint: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 17,
        marginTop: 20,
        paddingHorizontal: 8,
    },
});

export default WelcomeScreen;
