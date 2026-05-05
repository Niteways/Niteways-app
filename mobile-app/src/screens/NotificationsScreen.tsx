import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNotifications } from '../context/NotificationContext';

// Simple date formatter to avoid external dependency issues
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
};

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationsScreenProps {
    navigation: any;
}

const getNotificationIcon = (type: string, isConfirmed: boolean) => {
    if (isConfirmed) return 'checkmark-circle';

    switch (type) {
        case 'booking':
            return 'calendar';
        case 'ticket':
            return 'ticket';
        case 'guestlist':
            return 'people';
        default:
            return 'notifications';
    }
};

const NotificationsScreen = ({ navigation }: NotificationsScreenProps) => {
    const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();

    // Mark all notifications as read when screen is opened
    useEffect(() => {
        if (unreadCount > 0) {
            markAllAsRead();
        }
    }, []); // Only run once when component mounts

    const renderNotification = ({ item }: { item: Notification }) => {
        const isConfirmed = item.title.includes('Confirmed');
        const iconName = getNotificationIcon(item.type, isConfirmed);

        return (
            <TouchableOpacity
                style={[
                    styles.notificationCard,
                    !item.isRead && styles.unreadCard,
                ]}
                onPress={() => markAsRead(item.id)}
            >
                <View style={styles.iconContainer}>
                    <View
                        style={[
                            styles.iconCircle,
                            isConfirmed && styles.confirmedCircle,
                        ]}
                    >
                        <Icon
                            name={iconName}
                            size={20}
                            color={isConfirmed ? '#FBBF24' : '#9CA3AF'}
                        />
                    </View>
                </View>

                <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                        <Text
                            style={[
                                styles.notificationTitle,
                                !item.isRead && styles.unreadTitle,
                            ]}
                        >
                            {item.title}
                        </Text>
                        <Text style={styles.notificationDate}>
                            {formatDate(item.createdAt)}
                        </Text>
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                        {item.message}
                    </Text>
                </View>

                {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    {unreadCount > 0 && (
                        <Text style={styles.headerSubtitle}>
                            {unreadCount} unread
                        </Text>
                    )}
                </View>
            </View>

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Icon name="notifications-outline" size={64} color="#4B5563" />
                    <Text style={styles.emptyTitle}>No notifications yet</Text>
                    <Text style={styles.emptySubtitle}>
                        You'll see booking updates and announcements here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderNotification}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                />
            )}
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 48,
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1F2937',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    listContainer: {
        padding: 16,
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#374151',
        position: 'relative',
    },
    unreadCard: {
        backgroundColor: '#1F2937',
        borderColor: '#FBBF24',
        borderWidth: 1,
    },
    iconContainer: {
        marginRight: 12,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#374151',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmedCircle: {
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#fff',
        flex: 1,
        marginRight: 8,
    },
    unreadTitle: {
        color: '#FBBF24',
    },
    notificationDate: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    notificationMessage: {
        fontSize: 13,
        color: '#9CA3AF',
        lineHeight: 18,
    },
    unreadDot: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FBBF24',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#9CA3AF',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
    },
});

export default NotificationsScreen;
