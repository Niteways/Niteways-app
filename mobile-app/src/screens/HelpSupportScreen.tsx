import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, LayoutAnimation, UIManager, TextInput, Alert, ActivityIndicator, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Button from '../components/Button';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const faqs = [
    {
        question: "How do I book a table?",
        answer: "Navigate to a venue, select the 'Tables' tab, choose your preferred table from the floor map, select your date, and complete the booking form. You'll receive a confirmation once approved."
    },
    {
        question: "Can I cancel my booking?",
        answer: "Yes, you can cancel bookings from your Bookings page. Please note that cancellation policies vary by venue, and deposits may be non-refundable depending on timing."
    },
    {
        question: "How does the guest list work?",
        answer: "Sign up for a venue's guest list through the event or venue page. You'll receive confirmation when approved. Present your Member ID at the door for priority entry."
    },
    {
        question: "What are member loyalty levels?",
        answer: "Member levels (Bronze, Silver, Gold, Platinum) are earned through visits and spending. Higher levels unlock perks like priority booking, exclusive access, and discounts."
    },
    {
        question: "How do I purchase tickets?",
        answer: "Go to the Events page, select an event, choose your ticket type and quantity, then complete the purchase. E-tickets will be available in your Bookings section."
    },
    {
        question: "Can I change my booking date?",
        answer: "To change your booking, please cancel the existing booking and create a new one for your preferred date. Contact venue support if you need assistance."
    },
];

const HelpSupportScreen = ({ navigation }: any) => {
    const [activeTab, setActiveTab] = useState<"faq" | "chat">("faq");
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleFaq = (index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedFaq(expandedFaq === index ? null : index);
    };

    const handleSubmitChat = async () => {
        if (!email.trim() || !message.trim()) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setIsSubmitting(true);
        // Simulate sending message
        await new Promise(resolve => setTimeout(resolve, 1000));
        Alert.alert("Success", "Message sent! We'll respond within 24 hours.");
        setMessage("");
        setIsSubmitting(false);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                    <Icon name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "faq" && styles.activeTab]}
                    onPress={() => setActiveTab("faq")}
                >
                    <Icon name="help-circle-outline" size={18} color={activeTab === "faq" ? "#7C3AED" : "#9CA3AF"} />
                    <Text style={[styles.tabText, activeTab === "faq" && styles.activeTabText]}>FAQ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "chat" && styles.activeTab]}
                    onPress={() => setActiveTab("chat")}
                >
                    <Icon name="chatbubble-ellipses-outline" size={18} color={activeTab === "chat" ? "#7C3AED" : "#9CA3AF"} />
                    <Text style={[styles.tabText, activeTab === "chat" && styles.activeTabText]}>Contact Us</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {activeTab === "faq" ? (
                    <View style={styles.faqContainer}>
                        <Text style={styles.helperText}>Find answers to commonly asked questions below.</Text>
                        {faqs.map((faq, index) => (
                            <View key={index} style={styles.faqItem}>
                                <TouchableOpacity
                                    style={styles.faqHeader}
                                    onPress={() => toggleFaq(index)}
                                >
                                    <View style={styles.faqHeaderLeft}>
                                        <Icon name="help-circle" size={20} color="#7C3AED" />
                                        <Text style={styles.faqQuestion}>{faq.question}</Text>
                                    </View>
                                    <Icon
                                        name="chevron-forward"
                                        size={16}
                                        color="#6B7280"
                                        style={{
                                            transform: [{ rotate: expandedFaq === index ? '90deg' : '0deg' }]
                                        }}
                                    />
                                </TouchableOpacity>
                                {expandedFaq === index && (
                                    <View style={styles.faqContent}>
                                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.chatContainer}>
                        <View style={styles.chatHeader}>
                            <Icon name="chatbubbles" size={48} color="#7C3AED" />
                            <Text style={styles.chatTitle}>Need help?</Text>
                            <Text style={styles.chatSubtitle}>
                                Send us a message and we'll get back to you within 24 hours.
                            </Text>
                        </View>

                        <View style={styles.formContainer}>
                            <Text style={styles.label}>Your Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="you@example.com"
                                placeholderTextColor="#6B7280"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <Text style={[styles.label, { marginTop: 16 }]}>Message</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Describe your issue or question..."
                                placeholderTextColor="#6B7280"
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                numberOfLines={5}
                                textAlignVertical="top"
                            />

                            <Button
                                title={isSubmitting ? "Sending..." : "Send Message"}
                                onPress={handleSubmitChat}
                                loading={isSubmitting}
                                style={styles.submitButton}
                            />
                        </View>
                    </View>
                )}
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
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#7C3AED',
    },
    tabText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
    activeTabText: {
        color: '#7C3AED',
    },
    scrollContent: {
        padding: 20,
    },
    helperText: {
        color: '#9CA3AF',
        fontSize: 14,
        marginBottom: 16,
    },
    faqContainer: {
        // gap: 12, // Gap is not supported in older RN versions, using margin instead
    },
    faqItem: {
        backgroundColor: 'rgba(31, 41, 55, 0.3)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    faqHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    faqQuestion: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 12,
    },
    faqContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    faqAnswer: {
        color: '#9CA3AF',
        fontSize: 14,
        lineHeight: 20,
        paddingLeft: 32,
    },
    chatContainer: {
        flex: 1,
    },
    chatHeader: {
        alignItems: 'center',
        paddingVertical: 20,
        marginBottom: 20,
    },
    chatTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginTop: 12,
        marginBottom: 4,
    },
    chatSubtitle: {
        color: '#9CA3AF',
        fontSize: 14,
        textAlign: 'center',
    },
    formContainer: {
        //
    },
    label: {
        color: '#D1D5DB',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(31, 41, 55, 0.5)',
        borderWidth: 1,
        borderColor: '#374151',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#fff',
    },
    textArea: {
        minHeight: 120,
    },
    submitButton: {
        marginTop: 24,
    },
});

export default HelpSupportScreen;
