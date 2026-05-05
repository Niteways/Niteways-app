import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal, FlatList, ActivityIndicator, StatusBar, Animated, Image } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { User } from '../types';
import Input from '../components/Input';
import Button from '../components/Button';
import { authService } from '../services/auth';

// Complete list of country codes
const countryCodes = [
    { code: "+46", country: "SE", flag: "🇸🇪", name: "Sweden" },
    { code: "+1", country: "US", flag: "🇺🇸", name: "United States" },
    { code: "+44", country: "GB", flag: "🇬🇧", name: "United Kingdom" },
    { code: "+49", country: "DE", flag: "🇩🇪", name: "Germany" },
    { code: "+33", country: "FR", flag: "🇫🇷", name: "France" },
    { code: "+34", country: "ES", flag: "🇪🇸", name: "Spain" },
    { code: "+39", country: "IT", flag: "🇮🇹", name: "Italy" },
    { code: "+31", country: "NL", flag: "🇳🇱", name: "Netherlands" },
    { code: "+47", country: "NO", flag: "🇳🇴", name: "Norway" },
    { code: "+45", country: "DK", flag: "🇩🇰", name: "Denmark" },
    { code: "+358", country: "FI", flag: "🇫🇮", name: "Finland" },
    { code: "+41", country: "CH", flag: "🇨🇭", name: "Switzerland" },
    { code: "+43", country: "AT", flag: "🇦🇹", name: "Austria" },
    { code: "+32", country: "BE", flag: "🇧🇪", name: "Belgium" },
    { code: "+351", country: "PT", flag: "🇵🇹", name: "Portugal" },
    { code: "+30", country: "GR", flag: "🇬🇷", name: "Greece" },
    { code: "+48", country: "PL", flag: "🇵🇱", name: "Poland" },
    { code: "+420", country: "CZ", flag: "🇨🇿", name: "Czech Republic" },
    { code: "+36", country: "HU", flag: "🇭🇺", name: "Hungary" },
    { code: "+353", country: "IE", flag: "🇮🇪", name: "Ireland" },
    { code: "+7", country: "RU", flag: "🇷🇺", name: "Russia" },
    { code: "+380", country: "UA", flag: "🇺🇦", name: "Ukraine" },
    { code: "+90", country: "TR", flag: "🇹🇷", name: "Turkey" },
    { code: "+971", country: "AE", flag: "🇦🇪", name: "UAE" },
    { code: "+966", country: "SA", flag: "🇸🇦", name: "Saudi Arabia" },
    { code: "+972", country: "IL", flag: "🇮🇱", name: "Israel" },
    { code: "+91", country: "IN", flag: "🇮🇳", name: "India" },
    { code: "+86", country: "CN", flag: "🇨🇳", name: "China" },
    { code: "+81", country: "JP", flag: "🇯🇵", name: "Japan" },
    { code: "+82", country: "KR", flag: "🇰🇷", name: "South Korea" },
    { code: "+65", country: "SG", flag: "🇸🇬", name: "Singapore" },
    { code: "+60", country: "MY", flag: "🇲🇾", name: "Malaysia" },
    { code: "+66", country: "TH", flag: "🇹🇭", name: "Thailand" },
    { code: "+62", country: "ID", flag: "🇮🇩", name: "Indonesia" },
    { code: "+63", country: "PH", flag: "🇵🇭", name: "Philippines" },
    { code: "+84", country: "VN", flag: "🇻🇳", name: "Vietnam" },
    { code: "+61", country: "AU", flag: "🇦🇺", name: "Australia" },
    { code: "+64", country: "NZ", flag: "🇳🇿", name: "New Zealand" },
    { code: "+55", country: "BR", flag: "🇧🇷", name: "Brazil" },
    { code: "+52", country: "MX", flag: "🇲🇽", name: "Mexico" },
    { code: "+54", country: "AR", flag: "🇦🇷", name: "Argentina" },
    { code: "+57", country: "CO", flag: "🇨🇴", name: "Colombia" },
    { code: "+56", country: "CL", flag: "🇨🇱", name: "Chile" },
    { code: "+51", country: "PE", flag: "🇵🇪", name: "Peru" },
    { code: "+20", country: "EG", flag: "🇪🇬", name: "Egypt" },
    { code: "+27", country: "ZA", flag: "🇿🇦", name: "South Africa" },
    { code: "+234", country: "NG", flag: "🇳🇬", name: "Nigeria" },
    { code: "+254", country: "KE", flag: "🇰🇪", name: "Kenya" },
    { code: "+212", country: "MA", flag: "🇲🇦", name: "Morocco" },
];

// ── Calendar-style Date Picker Component ─────────────────────────────────────
const CalendarPicker = ({ selectedDate, onSelect }: { 
    selectedDate: string; // MM/DD/YYYY
    onSelect: (date: string) => void;
}) => {
    const parseDate = (dateStr: string) => {
        if (!dateStr || dateStr === 'MM/DD/YYYY') return new Date();
        const [m, d, y] = dateStr.split('/').map(Number);
        return new Date(y, m - 1, d);
    };

    const initialDate = parseDate(selectedDate);
    const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    const [selected, setSelected] = useState(initialDate);
    const [isFastPicker, setIsFastPicker] = useState(false);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthShortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const YEARS = Array.from({ length: 121 }, (_, i) => new Date().getFullYear() - i);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const prevMonthDays = getDaysInMonth(prevYear, prevMonth);
        
        const days = [];

        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: prevMonthDays - i, current: false });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, current: true });
        }
        const totalCells = 42;
        const nextDays = totalCells - days.length;
        for (let i = 1; i <= nextDays; i++) {
            days.push({ day: i, current: false });
        }
        return days;
    };

    const isSelectedDay = (day: number, current: boolean) => {
        return current && 
               selected.getDate() === day && 
               selected.getMonth() === viewDate.getMonth() && 
               selected.getFullYear() === viewDate.getFullYear();
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
        setViewDate(newDate);
    };

    const formatDate = (date: Date) => {
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${m}/${d}/${date.getFullYear()}`;
    };

    const selectMonthYear = (month: number, year: number) => {
        const newDate = new Date(year, month, 1);
        setViewDate(newDate);
        setIsFastPicker(false);
    };

    return (
        <View style={calendarStyles.container}>
            <View style={calendarStyles.header}>
                <TouchableOpacity 
                    style={calendarStyles.monthYearContainer}
                    onPress={() => setIsFastPicker(!isFastPicker)}
                >
                    <Text style={calendarStyles.monthYearText}>
                        {monthShortNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                    </Text>
                    <Icon name={isFastPicker ? "chevron-up" : "chevron-down"} size={14} color="#666" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <View style={calendarStyles.navButtons}>
                    <TouchableOpacity onPress={() => changeMonth(-1)} style={calendarStyles.navBtn}>
                        <Icon name="chevron-up" size={18} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => changeMonth(1)} style={calendarStyles.navBtn}>
                        <Icon name="chevron-down" size={18} color="#666" />
                    </TouchableOpacity>
                </View>
            </View>

            {isFastPicker ? (
                <View style={calendarStyles.fastPickerContainer}>
                    <FlatList
                        data={YEARS}
                        keyExtractor={(y) => y.toString()}
                        renderItem={({ item: year }) => {
                            const showMonths = viewDate.getFullYear() === year;
                            return (
                                <View>
                                    <View style={calendarStyles.fastYearRow}>
                                        <Text style={calendarStyles.fastYearText}>{year}</Text>
                                    </View>
                                    {showMonths && (
                                        <View style={calendarStyles.fastMonthsGrid}>
                                            {monthShortNames.map((mName, mIdx) => {
                                                const isActive = viewDate.getMonth() === mIdx && viewDate.getFullYear() === year;
                                                return (
                                                    <TouchableOpacity 
                                                        key={mIdx} 
                                                        style={[
                                                            calendarStyles.fastMonthItem,
                                                            isActive && calendarStyles.fastMonthActive
                                                        ]}
                                                        onPress={() => selectMonthYear(mIdx, year)}
                                                    >
                                                        <Text style={[
                                                            calendarStyles.fastMonthText,
                                                            isActive && calendarStyles.fastMonthActiveText
                                                        ]}>{mName}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}
                                    {/* If not the selected year, we might show a shorter version or just nothing. 
                                        But based on the image, it seems the selected year is the one that shows months.
                                        However, the user wants to "select the year". 
                                        Let's allow clicking the Year row to toggle it or just show all years as headers.
                                    */}
                                    {!showMonths && (
                                        <TouchableOpacity 
                                            style={calendarStyles.yearToggleArea}
                                            onPress={() => setViewDate(new Date(year, viewDate.getMonth(), 1))}
                                        />
                                    )}
                                </View>
                            );
                        }}
                        showsVerticalScrollIndicator={false}
                        initialScrollIndex={YEARS.indexOf(viewDate.getFullYear())}
                        getItemLayout={(_, index) => {
                            // Rough estimation of height
                            const isCurrent = YEARS[index] === viewDate.getFullYear();
                            const h = isCurrent ? 160 : 40; 
                            return { length: 40, offset: 40 * index, index }; // simplified for now
                        }}
                    />
                </View>
            ) : (
                <>
                    <View style={calendarStyles.weekDays}>
                        {daysOfWeek.map(d => <Text key={d} style={calendarStyles.weekDayText}>{d}</Text>)}
                    </View>

                    <View style={calendarStyles.daysGrid}>
                        {renderDays().map((item, i) => (
                            <TouchableOpacity 
                                key={i} 
                                style={[
                                    calendarStyles.dayCell,
                                    isSelectedDay(item.day, item.current) && calendarStyles.selectedCell
                                ]}
                                onPress={() => {
                                    if (item.current) {
                                        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), item.day);
                                        setSelected(newDate);
                                        onSelect(formatDate(newDate));
                                    }
                                }}
                            >
                                <Text style={[
                                    calendarStyles.dayText, 
                                    !item.current && calendarStyles.notCurrentMonthText
                                ]}>
                                    {item.day}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            )}

            <View style={calendarStyles.footer}>
                <TouchableOpacity onPress={() => onSelect("")}>
                    <Text style={calendarStyles.footerBtnText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                    const today = new Date();
                    setSelected(today);
                    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
                    onSelect(formatDate(today));
                }}>
                    <Text style={calendarStyles.footerBtnText}>Today</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const calendarStyles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 8,
        width: 320,
        padding: 16,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    monthYearContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    monthYearText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    navButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    navBtn: {
        padding: 4,
    },
    weekDays: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },
    weekDayText: {
        fontSize: 13,
        color: '#555',
        width: 36,
        textAlign: 'center',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 2,
    },
    selectedCell: {
        borderWidth: 2,
        borderColor: '#000',
        borderRadius: 4,
        backgroundColor: '#f3f4f6',
    },
    dayText: {
        fontSize: 14,
        color: '#000',
    },
    notCurrentMonthText: {
        color: '#ccc',
    },
    fastPickerContainer: {
        height: 280,
    },
    fastYearRow: {
        backgroundColor: '#f3f4f6',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    fastYearText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    fastMonthsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingVertical: 8,
    },
    fastMonthItem: {
        width: '25%',
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fastMonthActive: {
        borderWidth: 2,
        borderColor: '#000',
        backgroundColor: '#f3f4f6',
        borderRadius: 4,
    },
    fastMonthText: {
        fontSize: 14,
        color: '#333',
    },
    fastMonthActiveText: {
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingHorizontal: 4,
    },
    footerBtnText: {
        fontSize: 15,
        color: '#3b82f6',
        fontWeight: '500',
    },
    yearToggleArea: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
    }
});

const EditProfileScreen = ({ navigation }: any) => {
    const [title, setTitle] = useState("Mr");
    const [showTitlePicker, setShowTitlePicker] = useState(false);
    const TITLES = ["Mr", "Ms", "Mrs", "Other"];

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [selectedCountry, setSelectedCountry] = useState(countryCodes.find(c => c.country === 'US') || countryCodes[1]);
    const [birthday, setBirthday] = useState('');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0, width: 0 });
    const triggerRef = useRef<TouchableOpacity>(null);
    const [countrySearch, setCountrySearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);

    const handleImagePick = () => {
        launchImageLibrary({
            mediaType: 'photo',
            quality: 1,
            selectionLimit: 1,
        }, (response) => {
            if (response.didCancel) return;
            if (response.errorMessage) {
                Alert.alert('Error', response.errorMessage);
                return;
            }
            if (response.assets && response.assets.length > 0) {
                setProfileImage(response.assets[0].uri || null);
            }
        });
    };

    React.useEffect(() => {
        const loadUser = async () => {
            const user = await authService.getStoredUser();
            if (user) {
                const meta = user.user_metadata || {};
                const firstName = meta.first_name || user.firstName || '';
                const lastName = meta.last_name || user.lastName || '';
                if (firstName || lastName) {
                    setName(`${firstName} ${lastName}`.trim());
                } else {
                    setName(user.name || "");
                }
                setEmail(user.email || "");
                const bday = meta.birthday || user.birthday;
                if (bday) setBirthday(bday);
                const mobile = meta.mobile || user.mobile || "";
                const matched = countryCodes.find(c => mobile.startsWith(c.code));
                if (matched) {
                    setSelectedCountry(matched);
                    setPhone(mobile.slice(matched.code.length));
                } else {
                    setPhone(mobile);
                }
            }
        };
        loadUser();
    }, []);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter your full name');
            return;
        }
        try {
            setLoading(true);
            const parts = name.trim().split(' ');
            const firstName = parts[0];
            const lastName = parts.slice(1).join(' ') || '';
            const fullPhone = phone.trim() ? `${selectedCountry.code}${phone.trim()}` : '';
            await authService.updateProfile({ firstName, lastName, email, mobile: fullPhone || undefined, birthday: birthday || undefined });
            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            const message = error.response?.data?.message;
            const errorMsg = Array.isArray(message) ? message.join('\n') : message || 'Failed to save profile';
            Alert.alert('Error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const filteredCountries = countryCodes.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.includes(countrySearch)
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                >
                    <Icon name="chevron-back" size={24} color="#9CA3AF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.avatarSection}>
                    <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePick} activeOpacity={0.8}>
                        <View style={styles.avatarPlaceholder}>
                            {profileImage ? (
                                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                            ) : (
                                <Icon name="person-outline" size={50} color="#9CA3AF" />
                            )}
                        </View>
                        <View style={styles.cameraButton}>
                            <Icon name="camera" size={16} color="#000" />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <View style={styles.labelContainer}>
                        <Icon name="people-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.labelText}>TITLE</Text>
                    </View>
                    <View style={{ position: 'relative', zIndex: 100 }}>
                        <TouchableOpacity 
                            style={[styles.input, styles.dropdownInput]} 
                            onPress={() => setShowTitlePicker(!showTitlePicker)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.inputText}>{title}</Text>
                            <Icon name={showTitlePicker ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                        
                        {showTitlePicker && (
                            <View style={styles.inlineDropdown}>
                                {TITLES.map((t) => (
                                    <TouchableOpacity 
                                        key={t} 
                                        style={styles.inlineDropdownItem}
                                        onPress={() => {
                                            setTitle(t);
                                            setShowTitlePicker(false);
                                        }}
                                    >
                                        <View style={styles.inlineDropdownIconSpace}>
                                            {title === t && <Icon name="checkmark" size={18} color="#fff" />}
                                        </View>
                                        <Text style={[styles.inlineDropdownText, title === t && styles.inlineDropdownTextActive]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <View style={styles.labelContainer}>
                        <Icon name="person-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.labelText}>FULL NAME</Text>
                    </View>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Your name"
                        placeholderTextColor="#6B7280"
                    />

                    <View style={styles.labelContainer}>
                        <Icon name="mail-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.labelText}>EMAIL</Text>
                    </View>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholderTextColor="#6B7280"
                        keyboardType="email-address"
                    />

                    <View style={styles.labelContainer}>
                        <Icon name="call-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.labelText}>PHONE</Text>
                    </View>
                    <View style={styles.phoneRow}>
                        <View style={{ flex: 0 }}>
                            <TouchableOpacity
                                ref={triggerRef}
                                style={styles.countryCodeContainer}
                                onPress={() => {
                                    if (triggerRef.current) {
                                        triggerRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
                                            setDropdownPosition({ x, y: y + height, width });
                                            setShowCountryPicker(true);
                                        });
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.countryCodeText}>{selectedCountry?.country}{selectedCountry?.code}</Text>
                                <Icon name={showCountryPicker ? "chevron-up" : "chevron-down"} size={14} color="#9CA3AF" />
                            </TouchableOpacity>

                            <Modal visible={showCountryPicker} transparent animationType="fade">
                                <TouchableOpacity 
                                    style={styles.dropdownOverlay} 
                                    activeOpacity={1} 
                                    onPress={() => setShowCountryPicker(false)}
                                >
                                    <View style={[
                                        styles.inlineDropdown, 
                                        { 
                                            position: 'absolute',
                                            top: dropdownPosition.y + 4, 
                                            left: dropdownPosition.x,
                                            width: 240, 
                                            height: 250,
                                            zIndex: 999 
                                        }
                                    ]}>
                                        <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
                                            {countryCodes.map((c, i) => {
                                                const isSelected = c.country === selectedCountry?.country && c.code === selectedCountry?.code;
                                                return (
                                                    <TouchableOpacity
                                                        key={i}
                                                        style={styles.inlineDropdownItem}
                                                        onPress={() => {
                                                            setSelectedCountry(c);
                                                            setShowCountryPicker(false);
                                                        }}
                                                    >
                                                        <View style={styles.inlineDropdownIconSpace}>
                                                            {isSelected && <Icon name="checkmark" size={16} color="#fff" />}
                                                        </View>
                                                        <Text style={[styles.inlineDropdownText, isSelected && { color: '#fff', fontWeight: '700' }]}>
                                                            {c.country}  {c.code}
                                                        </Text>
                                                        <Text style={[styles.countryNameMuted, { marginLeft: 8 }]} numberOfLines={1}>
                                                            {c.name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                        <View style={styles.dropdownBottomArrow}>
                                            <Icon name="chevron-down" size={16} color="#9CA3AF" />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </Modal>
                        </View>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="70 123 4567"
                            placeholderTextColor="#6B7280"
                            keyboardType="phone-pad"
                            maxLength={12}
                        />
                    </View>

                    <View style={styles.labelContainer}>
                        <Icon name="calendar-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.labelText}>BIRTHDAY</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.input, styles.dropdownInput]}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={birthday ? styles.inputText : styles.datePlaceholder}>
                            {birthday || 'MM/DD/YYYY'}
                        </Text>
                        <Icon name="calendar" size={16} color="#fff" />
                    </TouchableOpacity>

                    <View style={[styles.labelContainer, { marginTop: 20, marginBottom: 12 }]}>
                        <Icon name="link-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.labelText}>CONNECTED ACCOUNTS</Text>
                    </View>

                    {/* Social Cards */}
                    <View style={styles.socialCard}>
                        <View style={styles.socialRowLeft}>
                            <Icon name="logo-instagram" size={20} color="#D946EF" />
                            <Text style={styles.socialText}>Instagram</Text>
                        </View>
                        <TouchableOpacity style={styles.connectButton}>
                            <Text style={styles.connectButtonText}>Connect</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.socialCard}>
                        <View style={styles.socialRowLeft}>
                            <Icon name="logo-facebook" size={20} color="#3B82F6" />
                            <Text style={styles.socialText}>Facebook</Text>
                        </View>
                        <TouchableOpacity style={styles.connectButton}>
                            <Text style={styles.connectButtonText}>Connect</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.saveContainer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
            </View>

            <Modal visible={showDatePicker} animationType="fade" transparent>
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setShowDatePicker(false)}
                >
                    <CalendarPicker 
                        selectedDate={birthday}
                        onSelect={(date) => {
                            setBirthday(date);
                            if (date) setShowDatePicker(false);
                        }}
                    />
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
        paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight ?? 0) + 16,
        paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1F2937'
    },
    backButton: { padding: 4, marginRight: 8 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    scrollContent: { padding: 20, paddingBottom: 100 },
    avatarSection: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
    avatarContainer: { position: 'relative' },
    avatarPlaceholder: {
        width: 110, height: 110, borderRadius: 55, backgroundColor: '#27272A',
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
    },
    avatarImage: {
        width: '100%', height: '100%', borderRadius: 55,
    },
    cameraButton: {
        position: 'absolute', bottom: 4, right: 4,
        backgroundColor: '#F59E0B', width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000'
    },
    form: { marginBottom: 20 },
    labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginTop: 12, gap: 6 },
    labelText: { color: '#9CA3AF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    input: {
        backgroundColor: '#27272A', borderRadius: 14, paddingHorizontal: 16, height: 52,
        color: '#fff', fontSize: 15, fontWeight: '500'
    },
    inputText: { color: '#fff', fontSize: 15, fontWeight: '500' },
    dropdownInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, borderRadius: 14 },
    inlineDropdown: {
        backgroundColor: '#18181B', borderRadius: 14, marginTop: 4, paddingVertical: 4,
        borderWidth: 1, borderColor: '#27272A', position: 'absolute', top: '100%', left: 0, right: 0,
        zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10
    },
    inlineDropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
    inlineDropdownIconSpace: { width: 24, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    inlineDropdownText: { color: '#D1D5DB', fontSize: 15, fontWeight: '500' },
    inlineDropdownTextActive: { color: '#fff', fontWeight: '700' },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    countryCodeContainer: {
        backgroundColor: '#27272A', borderRadius: 14, paddingHorizontal: 16, height: 52,
        flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 90, justifyContent: 'space-between'
    },
    countryCodeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    datePlaceholder: { color: '#6B7280', fontSize: 15 },
    socialCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#27272A', borderRadius: 14, paddingHorizontal: 16, height: 52, marginBottom: 10
    },
    socialRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    socialText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    connectButton: { borderWidth: 1, borderColor: '#3F3F46', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#18181B' },
    connectButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    countryNameMuted: { color: '#6B7280', fontSize: 13, flex: 1 },
    dropdownBottomArrow: {
        alignItems: 'center',
        paddingVertical: 6,
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        backgroundColor: '#18181B',
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
    },
    saveContainer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, paddingTop: 16, backgroundColor: '#000'
    },
    saveButton: { backgroundColor: '#F7C948', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12 },
    saveButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    dropdownOverlay: { flex: 1, backgroundColor: 'transparent' },
    modalContent: {
        backgroundColor: '#18181B', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        width: '100%', position: 'absolute', bottom: 0, maxHeight: '80%', paddingBottom: 30
    },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 20, borderBottomWidth: 1, borderBottomColor: '#27272A'
    },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    modalCloseBtn: { padding: 4 },
    modalCloseText: { color: '#9CA3AF', fontSize: 18 },
    searchRow: { padding: 12 },
    searchInput: { backgroundColor: '#27272A', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14 },
    countryItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
    selectedItem: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
    countryItemFlag: { fontSize: 24 },
    countryItemName: { flex: 1, color: '#D1D5DB', fontSize: 15 },
    countryItemCode: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
    selectedCode: { color: '#F59E0B' },
});

export default EditProfileScreen;
