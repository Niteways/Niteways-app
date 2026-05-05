import React, { useCallback, useMemo, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { VP } from './venuePortalTheme';
import {
    ROLES,
    ALL_PERMISSIONS,
    ROLE_PERMISSIONS,
    createTeamMember,
    type TeamRole,
    type TeamMemberRow,
} from '../../services/venueTeam';

const { height: SCREEN_H } = Dimensions.get('window');

function PermissionRow({
    label,
    checked,
    onPress,
}: {
    label: string;
    checked: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={styles.permRow}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <View
                style={[styles.permCircle, checked && styles.permCircleChecked]}
            >
                {checked ? (
                    <Icon name="checkmark" size={12} color="#111111" />
                ) : null}
            </View>
            <Text style={styles.permLabel} numberOfLines={1}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

export function VenueAddTeamMemberModal({
    visible,
    venueId,
    onClose,
    onSaved,
}: {
    visible: boolean;
    venueId: string | null;
    onClose: () => void;
    onSaved?: (row: TeamMemberRow) => void;
}) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mode, setMode] = useState<'role' | 'manual'>('role');
    const [role, setRole] = useState<TeamRole | ''>('');
    const [rolePickerOpen, setRolePickerOpen] = useState(false);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focused, setFocused] = useState<'name' | 'email' | 'role' | null>(
        null,
    );

    const resetForm = useCallback(() => {
        setName('');
        setEmail('');
        setMode('role');
        setRole('');
        setRolePickerOpen(false);
        setPermissions([]);
        setError(null);
        setSaving(false);
        setFocused(null);
    }, []);

    const handleClose = useCallback(() => {
        if (saving) return;
        resetForm();
        onClose();
    }, [saving, resetForm, onClose]);

    const togglePermission = useCallback((id: string) => {
        setPermissions((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
        );
    }, []);

    /**
     * Split the flat permission list into two balanced columns so the
     * "Set Manually" block renders as a 2-col grid that matches the design.
     * Left col gets the even indices, right col gets the odd indices.
     */
    const permissionColumns = useMemo(() => {
        const left: typeof ALL_PERMISSIONS = [];
        const right: typeof ALL_PERMISSIONS = [];
        ALL_PERMISSIONS.forEach((p, idx) => {
            if (idx % 2 === 0) left.push(p);
            else right.push(p);
        });
        return { left, right };
    }, []);

    const rolePreview = useMemo(() => {
        if (!role) return null;
        const ids = ROLE_PERMISSIONS[role] ?? [];
        const labels = ids
            .slice(0, 4)
            .map((id) => ALL_PERMISSIONS.find((p) => p.id === id)?.label)
            .filter(Boolean);
        const extra = ids.length - labels.length;
        return (
            <Text style={styles.helpText}>
                This role includes: {labels.join(', ')}
                {extra > 0 ? ` +${extra} more` : ''}
            </Text>
        );
    }, [role]);

    const handleSubmit = useCallback(async () => {
        if (saving) return;
        setError(null);

        if (!venueId) {
            setError('No venue linked to this account yet.');
            return;
        }
        if (!role) {
            setError('Please choose a role.');
            return;
        }
        if (mode === 'manual' && permissions.length === 0) {
            setError('Please select at least one permission.');
            return;
        }

        setSaving(true);
        const res = await createTeamMember(venueId, {
            name,
            email,
            role,
            permissions: mode === 'manual' ? permissions : undefined,
        });
        setSaving(false);

        if (!res.ok) {
            setError(res.error);
            return;
        }
        onSaved?.(res.row);
        resetForm();
        onClose();
    }, [saving, venueId, role, mode, permissions, name, email, onSaved, onClose, resetForm]);

    const selectedRoleLabel =
        ROLES.find((r) => r.value === role)?.label ?? 'Select role';

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.backdrop}
            >
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Add Team Member</Text>
                        <TouchableOpacity
                            onPress={handleClose}
                            hitSlop={10}
                            accessibilityLabel="Close"
                        >
                            <Icon name="close" size={22} color={VP.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={{ maxHeight: SCREEN_H * 0.62 }}
                        contentContainerStyle={styles.body}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={[
                                styles.input,
                                focused === 'name' && styles.inputFocused,
                            ]}
                            placeholder="Enter name"
                            placeholderTextColor={VP.muted}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            autoCorrect={false}
                            onFocus={() => setFocused('name')}
                            onBlur={() =>
                                setFocused((cur) => (cur === 'name' ? null : cur))
                            }
                        />

                        <Text style={[styles.label, styles.labelMt]}>Email</Text>
                        <TextInput
                            style={[
                                styles.input,
                                focused === 'email' && styles.inputFocused,
                            ]}
                            placeholder="Enter email"
                            placeholderTextColor={VP.muted}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            onFocus={() => setFocused('email')}
                            onBlur={() =>
                                setFocused((cur) => (cur === 'email' ? null : cur))
                            }
                        />

                        <Text style={[styles.label, styles.labelMt]}>Permission Mode</Text>
                        <View style={styles.modeRow}>
                            <TouchableOpacity
                                style={[
                                    styles.modeBtn,
                                    mode === 'role' ? styles.modeBtnActive : styles.modeBtnIdle,
                                ]}
                                activeOpacity={0.85}
                                onPress={() => setMode('role')}
                            >
                                <Text
                                    style={[
                                        styles.modeBtnText,
                                        mode === 'role' ? styles.modeBtnTextActive : styles.modeBtnTextIdle,
                                    ]}
                                >
                                    Select Role
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modeBtn,
                                    mode === 'manual' ? styles.modeBtnActive : styles.modeBtnIdle,
                                ]}
                                activeOpacity={0.85}
                                onPress={() => setMode('manual')}
                            >
                                <Text
                                    style={[
                                        styles.modeBtnText,
                                        mode === 'manual' ? styles.modeBtnTextActive : styles.modeBtnTextIdle,
                                    ]}
                                >
                                    Set Manually
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.label, styles.labelMt]}>Role</Text>
                        <TouchableOpacity
                            style={[
                                styles.select,
                                (focused === 'role' || rolePickerOpen) &&
                                    styles.inputFocused,
                            ]}
                            activeOpacity={0.85}
                            onPress={() => {
                                setFocused('role');
                                setRolePickerOpen((v) => !v);
                            }}
                        >
                            <Text
                                style={[
                                    styles.selectText,
                                    !role && styles.selectPlaceholder,
                                ]}
                            >
                                {selectedRoleLabel}
                            </Text>
                            <Icon
                                name={rolePickerOpen ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={VP.muted}
                            />
                        </TouchableOpacity>
                        {rolePickerOpen && (
                            <View style={styles.selectList}>
                                {ROLES.map((r, idx) => (
                                    <TouchableOpacity
                                        key={r.value}
                                        style={[
                                            styles.selectOption,
                                            idx < ROLES.length - 1 && styles.selectOptionBorder,
                                            role === r.value && styles.selectOptionActive,
                                        ]}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            setRole(r.value);
                                            setRolePickerOpen(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.selectOptionText,
                                                role === r.value && styles.selectOptionTextActive,
                                            ]}
                                        >
                                            {r.label}
                                        </Text>
                                        {role === r.value && (
                                            <Icon name="checkmark" size={16} color="#111111" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        {mode === 'role' && rolePreview}

                        {mode === 'manual' && (
                            <View style={styles.permBlock}>
                                <Text style={[styles.label, styles.labelMt]}>
                                    Custom Permissions
                                </Text>
                                <View style={styles.permGrid}>
                                    <View style={styles.permCol}>
                                        {permissionColumns.left.map((p) => (
                                            <PermissionRow
                                                key={p.id}
                                                label={p.label}
                                                checked={permissions.includes(p.id)}
                                                onPress={() => togglePermission(p.id)}
                                            />
                                        ))}
                                    </View>
                                    <View style={styles.permCol}>
                                        {permissionColumns.right.map((p) => (
                                            <PermissionRow
                                                key={p.id}
                                                label={p.label}
                                                checked={permissions.includes(p.id)}
                                                onPress={() => togglePermission(p.id)}
                                            />
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                            activeOpacity={0.9}
                            onPress={handleSubmit}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#111111" />
                            ) : (
                                <Text style={styles.primaryBtnText}>Send Invite</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            activeOpacity={0.85}
                            onPress={handleClose}
                            disabled={saving}
                        >
                            <Text style={styles.secondaryBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: VP.bg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingVertical: 18,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    title: {
        color: VP.text,
        fontSize: 20,
        fontWeight: '800',
    },
    body: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    label: {
        color: VP.text,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 8,
    },
    labelMt: { marginTop: 14 },
    input: {
        height: 46,
        borderRadius: 10,
        backgroundColor: '#141418',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 14,
        color: VP.text,
        fontSize: 14,
    },
    inputFocused: {
        borderColor: VP.gold,
        borderWidth: 1.5,
    },
    modeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    modeBtn: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeBtnActive: {
        backgroundColor: '#FFCC33',
    },
    modeBtnIdle: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    modeBtnText: {
        fontSize: 14,
        fontWeight: '800',
    },
    modeBtnTextActive: { color: '#111111' },
    modeBtnTextIdle: { color: VP.text },
    select: {
        height: 46,
        borderRadius: 10,
        backgroundColor: '#141418',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectText: { color: VP.text, fontSize: 14, fontWeight: '600' },
    selectPlaceholder: { color: VP.muted, fontWeight: '500' },
    selectList: {
        marginTop: 6,
        borderRadius: 10,
        backgroundColor: '#141418',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    selectOption: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectOptionBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    selectOptionActive: {
        backgroundColor: 'rgba(251,191,36,0.18)',
    },
    selectOptionText: { color: VP.text, fontSize: 14, fontWeight: '600' },
    selectOptionTextActive: { color: '#FFCC33', fontWeight: '800' },
    helpText: {
        marginTop: 8,
        color: VP.muted,
        fontSize: 12,
        lineHeight: 17,
    },
    permBlock: {
        marginTop: 4,
    },
    permGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    permCol: {
        flex: 1,
    },
    permRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        gap: 10,
    },
    permCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: '#FFCC33',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    permCircleChecked: {
        backgroundColor: '#FFCC33',
        borderColor: '#FFCC33',
    },
    permLabel: { flex: 1, color: VP.text, fontSize: 13, fontWeight: '600' },
    errorText: {
        marginTop: 12,
        color: '#EF5350',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 4,
        gap: 10,
    },
    primaryBtn: {
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFCC33',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnDisabled: {
        opacity: 0.7,
    },
    primaryBtnText: {
        color: '#111111',
        fontSize: 15,
        fontWeight: '800',
    },
    secondaryBtn: {
        height: 48,
        borderRadius: 12,
        backgroundColor: '#141418',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryBtnText: {
        color: VP.text,
        fontSize: 15,
        fontWeight: '700',
    },
});
