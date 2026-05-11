import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
    LayoutAnimation,
    Platform,
    UIManager,
    Image,
    Linking,
    Dimensions,
    AppState,
    Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker, { isCancel, isInProgress, types } from 'react-native-document-picker';
import { VP } from './venuePortalTheme';
import { useVenuePortal } from '../../context/VenuePortalContext';
import {
    DAY_KEYS,
    DAY_LABELS,
    DEFAULT_OPENING_HOURS,
    fetchVenueProfile,
    removeVenueMenuPdf,
    removeVenuePhoto,
    subscribeVenueRowChanges,
    updateVenueProfile,
    uploadVenueMenuPdf,
    uploadVenuePhoto,
    type DayKey,
    type DaySpecificAges,
    type OpeningHoursJson,
    type VenueProfile,
} from '../../services/venueInfo';
import VenueDetailScreen from '../VenueDetailScreen';
import type { Nightclub } from '../../types';

/**
 * Venue Info screen â€” opened from More hub > "Venue Info".
 * Single global Save Changes button; each section is collapsible.
 */

const BG = '#000000';
const CARD = '#1A1A1F';
const SOFT_BORDER = 'rgba(255,255,255,0.06)';
const FIELD_BG = '#141418';
const FIELD_BORDER = 'rgba(255,255,255,0.1)';
const GOLD = '#FFCC00';
const GOLD_SOFT = 'rgba(255,204,0,0.15)';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SectionKey = 'basic' | 'location' | 'hours' | 'music' | 'rules' | 'links';

type Draft = Omit<VenueProfile, 'id'>;

const EMPTY_DRAFT: Draft = {
    name: '',
    category: null,
    description: '',
    address: '',
    city_id: null,
    email: '',
    phone: '',
    music_genre: '',
    entrance_rules: '',
    default_age_limit: null,
    day_specific_ages: {},
    dress_code: '',
    instagram_handle: '',
    spotify_link: '',
    menu_url: '',
    google_maps_url: '',
    gallery_images: [],
    opening_hours_json: { ...DEFAULT_OPENING_HOURS },
    latitude: null,
    longitude: null,
};

type Props = {
    onBack: () => void;
};

export default function VenueVenueInfoScreen({ onBack }: Props) {
    const { venueId } = useVenuePortal();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState<Draft>({ ...EMPTY_DRAFT });
    const [original, setOriginal] = useState<Draft>({ ...EMPTY_DRAFT });
    const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
        basic: false,
        location: false,
        hours: false,
        music: false,
        rules: false,
        links: false,
    });
    const [previewOpen, setPreviewOpen] = useState(false);
    const [remoteStale, setRemoteStale] = useState(false);
    const dirtyRef = useRef(false);
    const savingRef = useRef(false);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setField = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
        setDraft((d) => ({ ...d, [key]: value }));
    }, []);

    const toggleSection = useCallback((key: SectionKey) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const load = useCallback(async (opts?: { silent?: boolean }) => {
        if (!venueId) {
            if (!opts?.silent) setLoading(false);
            return;
        }
        if (!opts?.silent) setLoading(true);
        try {
            const profile = await fetchVenueProfile(venueId);
            if (profile) {
                const asDraft: Draft = {
                    name: profile.name,
                    category: profile.category,
                    description: profile.description,
                    address: profile.address,
                    city_id: profile.city_id,
                    email: profile.email,
                    phone: profile.phone,
                    music_genre: profile.music_genre,
                    entrance_rules: profile.entrance_rules,
                    default_age_limit: profile.default_age_limit,
                    day_specific_ages: { ...profile.day_specific_ages },
                    dress_code: profile.dress_code,
                    instagram_handle: profile.instagram_handle,
                    spotify_link: profile.spotify_link,
                    menu_url: profile.menu_url,
                    google_maps_url: profile.google_maps_url,
                    gallery_images: profile.gallery_images,
                    opening_hours_json: profile.opening_hours_json,
                    latitude: profile.latitude,
                    longitude: profile.longitude,
                };
                setDraft(asDraft);
                setOriginal(asDraft);
                setRemoteStale(false);
            }
        } finally {
            if (!opts?.silent) setLoading(false);
        }
    }, [venueId]);

    useEffect(() => {
        void load();
    }, [load]);

    const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(original), [draft, original]);

    useEffect(() => {
        dirtyRef.current = dirty;
    }, [dirty]);

    useEffect(() => {
        savingRef.current = saving;
    }, [saving]);

    useEffect(() => {
        if (!venueId) return;
        const bump = () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                debounceTimerRef.current = null;
                if (savingRef.current) return;
                if (!dirtyRef.current) {
                    void load();
                } else {
                    setRemoteStale(true);
                }
            }, 250);
        };
        const { unsubscribe } = subscribeVenueRowChanges(venueId, bump);
        return () => {
            unsubscribe();
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [venueId, load]);

    useEffect(() => {
        const sub = AppState.addEventListener('change', (next) => {
            if (next === 'active' && venueId && !dirtyRef.current && !savingRef.current) {
                void load();
            }
        });
        return () => sub.remove();
    }, [venueId, load]);

    const onSave = useCallback(async () => {
        if (!venueId) {
            Alert.alert('No venue linked', 'Link this account to a venue before saving.');
            return;
        }
        if (!draft.name.trim()) {
            Alert.alert('Venue name required', 'Please enter a venue name.');
            setExpanded((p) => ({ ...p, basic: true }));
            return;
        }
        setSaving(true);
        try {
            const res = await updateVenueProfile(venueId, {
                name: draft.name,
                category: draft.category,
                description: draft.description,
                address: draft.address,
                email: draft.email,
                phone: draft.phone,
                music_genre: draft.music_genre,
                entrance_rules: draft.entrance_rules,
                default_age_limit: draft.default_age_limit,
                day_specific_ages: draft.day_specific_ages,
                dress_code: draft.dress_code,
                instagram_handle: draft.instagram_handle,
                spotify_link: draft.spotify_link,
                menu_url: draft.menu_url,
                google_maps_url: draft.google_maps_url,
                opening_hours_json: draft.opening_hours_json,
            });
            if (!res.ok) {
                Alert.alert('Could not save', res.error || 'Please try again.');
                return;
            }
            await load({ silent: true });
            if (res.missingColumns && res.missingColumns.length) {
                Alert.alert(
                    'Partially saved',
                    `Saved, but these columns are missing from your venues table: ${res.missingColumns.join(
                        ', '
                    )}. Run the latest migration to enable them.`
                );
            } else {
                Alert.alert('Saved', 'Venue info updated.');
            }
        } finally {
            setSaving(false);
        }
    }, [venueId, draft, load]);


    /**
     * Photos are persisted eagerly (not via the global Save button) so that:
     *  - the uploaded file in Supabase Storage never becomes orphaned,
     *  - add/delete feels instant to the user.
     */
    const persistGallery = useCallback(
        async (next: string[]): Promise<boolean> => {
            if (!venueId) {
                Alert.alert('No venue linked', 'Link this account to a venue first.');
                return false;
            }
            const res = await updateVenueProfile(venueId, { gallery_images: next });
            if (!res.ok) {
                Alert.alert('Could not update photos', res.error || 'Please try again.');
                return false;
            }
            setDraft((d) => ({ ...d, gallery_images: next }));
            setOriginal((o) => ({ ...o, gallery_images: next }));
            return true;
        },
        [venueId]
    );

    /**
     * Menu PDF: persisted eagerly for the same reasons as photos â€” the uploaded
     * object in storage should never outlive a rejected DB write.
     */
    const persistMenuUrl = useCallback(
        async (next: string): Promise<boolean> => {
            if (!venueId) {
                Alert.alert('No venue linked', 'Link this account to a venue first.');
                return false;
            }
            const res = await updateVenueProfile(venueId, { menu_url: next });
            if (!res.ok) {
                Alert.alert('Could not update menu', res.error || 'Please try again.');
                return false;
            }
            setDraft((d) => ({ ...d, menu_url: next }));
            setOriginal((o) => ({ ...o, menu_url: next }));
            return true;
        },
        [venueId]
    );

    if (loading) {
        return (
            <View style={[styles.root, styles.centered]}>
                <ActivityIndicator color={GOLD} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backWrap}>
                    <Icon name="chevron-back" size={26} color={GOLD} />
                </TouchableOpacity>
                <View style={styles.topTitles}>
                    <Text style={styles.pageTitle}>Venue Info</Text>
                    <Text style={styles.pageSub}>Manage venue profile</Text>
                </View>
                <View style={styles.topBarSpacer} />
            </View>

            {remoteStale ? (
                <View style={styles.remoteStaleBanner}>
                    <Text style={styles.remoteStaleText}>
                        This venue was updated on the web portal (or elsewhere). Reload to see the latest, or keep
                        editing and save your version.
                    </Text>
                    <View style={styles.remoteStaleActions}>
                        <TouchableOpacity
                            style={styles.remoteStaleBtn}
                            onPress={() => {
                                setRemoteStale(false);
                                void load();
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.remoteStaleBtnText}>Reload</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.remoteStaleBtnOutline}
                            onPress={() => setRemoteStale(false)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.remoteStaleBtnOutlineText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}

            <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <TouchableOpacity
                    style={styles.previewBtn}
                    onPress={() => setPreviewOpen(true)}
                    activeOpacity={0.85}
                >
                    <Icon name="phone-portrait-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.previewBtnText}>App Preview</Text>
                </TouchableOpacity>

                <AccordionSection
                    icon="business-outline"
                    title="Basic Information"
                    subtitle="Venue name, contact & photos"
                    expanded={expanded.basic}
                    onToggle={() => toggleSection('basic')}
                >
                    <BasicInfoSection
                        venueId={venueId}
                        name={draft.name}
                        onName={(v) => setField('name', v)}
                        description={draft.description}
                        onDescription={(v) => setField('description', v)}
                        email={draft.email}
                        onEmail={(v) => setField('email', v)}
                        phone={draft.phone}
                        onPhone={(v) => setField('phone', v)}
                        gallery={draft.gallery_images}
                        onPersistGallery={persistGallery}
                    />
                </AccordionSection>

                <AccordionSection
                    icon="location-outline"
                    title="Location"
                    subtitle="Address & map"
                    expanded={expanded.location}
                    onToggle={() => toggleSection('location')}
                >
                    <LocationSection
                        address={draft.address}
                        onAddress={(v) => setField('address', v)}
                        googleMapsUrl={draft.google_maps_url}
                        onGoogleMapsUrl={(v) => setField('google_maps_url', v)}
                    />
                </AccordionSection>

                <AccordionSection
                    icon="time-outline"
                    title="Opening Hours"
                    subtitle="Schedule & days"
                    expanded={expanded.hours}
                    onToggle={() => toggleSection('hours')}
                >
                    <OpeningHoursSection
                        hours={draft.opening_hours_json}
                        onChange={(recipe) =>
                            setDraft((d) => ({
                                ...d,
                                opening_hours_json: recipe(d.opening_hours_json),
                            }))
                        }
                    />
                </AccordionSection>

                <AccordionSection
                    icon="musical-notes-outline"
                    title="Music"
                    subtitle="Genres & vibe"
                    expanded={expanded.music}
                    onToggle={() => toggleSection('music')}
                >
                    <MusicGenresSection
                        value={draft.music_genre}
                        onChange={(v) => setField('music_genre', v)}
                    />
                </AccordionSection>

                <AccordionSection
                    icon="shield-outline"
                    title="Entrance Rules"
                    subtitle="Age, dress code & policies"
                    expanded={expanded.rules}
                    onToggle={() => toggleSection('rules')}
                >
                    <EntranceRulesSection
                        defaultAge={draft.default_age_limit}
                        onDefaultAge={(v) => setField('default_age_limit', v)}
                        dayAges={draft.day_specific_ages}
                        onDayAges={(v) => setField('day_specific_ages', v)}
                        dressCode={draft.dress_code}
                        onDressCode={(v) => setField('dress_code', v)}
                        entranceRequirements={draft.entrance_rules}
                        onEntranceRequirements={(v) => setField('entrance_rules', v)}
                        openingHours={draft.opening_hours_json}
                    />
                </AccordionSection>

                <AccordionSection
                    icon="link-outline"
                    title="Links & Media"
                    subtitle="Social & menu"
                    expanded={expanded.links}
                    onToggle={() => toggleSection('links')}
                >
                    <LinksMediaSection
                        venueId={venueId}
                        instagram={draft.instagram_handle}
                        onInstagram={(v) => setField('instagram_handle', v)}
                        spotify={draft.spotify_link}
                        onSpotify={(v) => setField('spotify_link', v)}
                        menuUrl={draft.menu_url}
                        onPersistMenuUrl={persistMenuUrl}
                    />
                </AccordionSection>

                <TouchableOpacity
                    style={[
                        styles.saveBtn,
                        (saving || !venueId || !dirty) && styles.saveBtnDisabled,
                    ]}
                    onPress={() => void onSave()}
                    disabled={saving || !venueId || !dirty}
                    activeOpacity={0.88}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#111" style={styles.saveBtnIcon} />
                    ) : (
                        <Icon name="save-outline" size={20} color="#111" style={styles.saveBtnIcon} />
                    )}
                    <Text style={styles.saveBtnText}>
                        {saving ? 'Saving…' : dirty ? 'Save Changes' : 'No changes to save'}
                    </Text>
                </TouchableOpacity>

                {!venueId && (
                    <Text style={styles.warning}>
                        No venue linked to this account yet â€” sign in as a venue owner to edit.
                    </Text>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>

            <AppPreviewModal
                visible={previewOpen}
                onClose={() => setPreviewOpen(false)}
                draft={draft}
            />
        </View>
    );
}

// ============================================================================
// Accordion
// ============================================================================

function AccordionSection({
    icon,
    title,
    subtitle,
    expanded,
    onToggle,
    children,
}: {
    icon: string;
    title: string;
    subtitle: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHead} onPress={onToggle} activeOpacity={0.85}>
                <View style={styles.sectionIconWrap}>
                    <Icon name={icon} size={18} color={GOLD} />
                </View>
                <View style={styles.sectionTitles}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <Text style={styles.sectionSub}>{subtitle}</Text>
                </View>
                <Icon
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={VP.muted}
                />
            </TouchableOpacity>
            {expanded && <View style={styles.sectionBody}>{children}</View>}
        </View>
    );
}

// ============================================================================
// Sub-sections
// ============================================================================

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {children}
        </View>
    );
}

function BasicInfoSection({
    venueId,
    name,
    onName,
    description,
    onDescription,
    email,
    onEmail,
    phone,
    onPhone,
    gallery,
    onPersistGallery,
}: {
    venueId: string | null;
    name: string;
    onName: (v: string) => void;
    description: string;
    onDescription: (v: string) => void;
    email: string;
    onEmail: (v: string) => void;
    phone: string;
    onPhone: (v: string) => void;
    gallery: string[];
    onPersistGallery: (next: string[]) => Promise<boolean>;
}) {
    const [uploading, setUploading] = useState(false);
    const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

    const handleAddPhoto = useCallback(() => {
        if (!venueId) {
            Alert.alert('No venue linked', 'Link this account to a venue first.');
            return;
        }
        if (uploading) return;

        launchImageLibrary(
            { mediaType: 'photo', quality: 0.85, selectionLimit: 1 },
            async (res) => {
                if (res.didCancel) return;
                if (res.errorCode) {
                    Alert.alert('Could not open library', res.errorMessage || res.errorCode);
                    return;
                }
                const asset = res.assets?.[0];
                if (!asset?.uri) return;

                setUploading(true);
                try {
                    const up = await uploadVenuePhoto(venueId, asset.uri, asset.type);
                    if (!up.ok || !up.url) {
                        Alert.alert('Upload failed', up.error || 'Please try again.');
                        return;
                    }
                    const next = [...gallery, up.url];
                    const persisted = await onPersistGallery(next);
                    if (!persisted) {
                        await removeVenuePhoto(up.url);
                    }
                } finally {
                    setUploading(false);
                }
            }
        );
    }, [venueId, uploading, gallery, onPersistGallery]);

    const handleRemovePhoto = useCallback(
        (url: string) => {
            Alert.alert('Remove photo?', 'This photo will be deleted from your venue.', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        setDeletingUrl(url);
                        try {
                            const next = gallery.filter((x) => x !== url);
                            const ok = await onPersistGallery(next);
                            if (ok) {
                                await removeVenuePhoto(url);
                            }
                        } finally {
                            setDeletingUrl(null);
                        }
                    },
                },
            ]);
        },
        [gallery, onPersistGallery]
    );

    return (
        <>
            <Labeled label="Venue Name">
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={onName}
                    placeholder="Niteways"
                    placeholderTextColor="rgba(156,163,175,0.55)"
                    autoCapitalize="words"
                />
            </Labeled>

            <Labeled label="About">
                <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={description}
                    onChangeText={onDescription}
                    placeholder={'Tell guests what makes your venue special…'}
                    placeholderTextColor="rgba(156,163,175,0.55)"
                    multiline
                    textAlignVertical="top"
                />
            </Labeled>

            <Labeled label="Contact email">
                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={onEmail}
                    placeholder="info@yourvenue.com"
                    placeholderTextColor="rgba(156,163,175,0.55)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </Labeled>

            <Labeled label="Phone">
                <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={onPhone}
                    placeholder="+46 …"
                    placeholderTextColor="rgba(156,163,175,0.55)"
                    keyboardType="phone-pad"
                />
            </Labeled>

            <Labeled label="Photos">
                <View style={styles.photosGrid}>
                    {gallery.map((url) => {
                        const isDeleting = deletingUrl === url;
                        return (
                            <View key={url} style={styles.photoTile}>
                                <Image source={{ uri: url }} style={styles.photoImage} />
                                {isDeleting ? (
                                    <View style={styles.photoOverlay}>
                                        <ActivityIndicator color="#FFFFFF" />
                                    </View>
                                ) : null}
                                <TouchableOpacity
                                    style={styles.photoRemoveBtn}
                                    onPress={() => handleRemovePhoto(url)}
                                    hitSlop={8}
                                    activeOpacity={0.85}
                                    disabled={isDeleting}
                                >
                                    <Icon name="close" size={14} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                    <TouchableOpacity
                        style={styles.photoAddTile}
                        onPress={handleAddPhoto}
                        activeOpacity={0.85}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color={GOLD} />
                        ) : (
                            <Icon name="add" size={28} color="rgba(255,255,255,0.75)" />
                        )}
                    </TouchableOpacity>
                </View>
            </Labeled>
        </>
    );
}

function LocationSection({
    address,
    onAddress,
    googleMapsUrl,
    onGoogleMapsUrl,
}: {
    address: string;
    onAddress: (v: string) => void;
    googleMapsUrl: string;
    onGoogleMapsUrl: (v: string) => void;
}) {
    const trimmedUrl = googleMapsUrl.trim();
    const openMaps = useCallback(() => {
        if (!trimmedUrl) return;
        const candidate = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
        Linking.openURL(candidate).catch(() => {
            Alert.alert("Can't open link", 'The Google Maps link is invalid.');
        });
    }, [trimmedUrl]);
    const canOpen = trimmedUrl.length > 0;

    return (
        <>
            <Labeled label="Address">
                <TextInput
                    style={styles.input}
                    value={address}
                    onChangeText={onAddress}
                    placeholder="Sturegatan 1, 114 35 Stockholm"
                    placeholderTextColor="rgba(156,163,175,0.55)"
                />
            </Labeled>

            <Labeled label="Google Maps Link">
                <View style={styles.mapsLinkRow}>
                    <TextInput
                        style={[styles.input, styles.mapsLinkInput]}
                        value={googleMapsUrl}
                        onChangeText={onGoogleMapsUrl}
                        placeholder="https://maps.google.com/?q=..."
                        placeholderTextColor="rgba(156,163,175,0.55)"
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                    />
                    <TouchableOpacity
                        style={[styles.mapsOpenBtn, !canOpen && styles.mapsOpenBtnDisabled]}
                        onPress={openMaps}
                        disabled={!canOpen}
                        activeOpacity={0.85}
                        hitSlop={6}
                    >
                        <Icon
                            name="open-outline"
                            size={18}
                            color={canOpen ? VP.text : 'rgba(255,255,255,0.35)'}
                        />
                    </TouchableOpacity>
                </View>
            </Labeled>
        </>
    );
}

const MUSIC_GENRES: string[] = [
    'House',
    'Tech House',
    'Deep House',
    'Hip Hop',
    'R&B',
    'EDM',
    'Latin',
    'Pop',
    'Reggaeton',
    'Afrobeats',
];

/** Parses a free-text genres string into a Set of canonical MUSIC_GENRES entries. */
function parseGenresValue(raw: string): Set<string> {
    const selected = new Set<string>();
    const lookup = new Map(MUSIC_GENRES.map((g) => [g.toLowerCase(), g]));
    raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0)
        .forEach((s) => {
            const canonical = lookup.get(s);
            if (canonical) selected.add(canonical);
        });
    return selected;
}

function MusicGenresSection({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const selected = parseGenresValue(value);

    const toggle = (g: string) => {
        const next = new Set(selected);
        if (next.has(g)) {
            next.delete(g);
        } else {
            next.add(g);
        }
        const ordered = MUSIC_GENRES.filter((x) => next.has(x));
        onChange(ordered.join(', '));
    };

    return (
        <Labeled label="Music Genres">
            <View style={styles.genreRow}>
                {MUSIC_GENRES.map((g) => {
                    const on = selected.has(g);
                    return (
                        <TouchableOpacity
                            key={g}
                            style={[styles.genreChip, on && styles.genreChipOn]}
                            onPress={() => toggle(g)}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.genreChipText, on && styles.genreChipTextOn]}>
                                {g}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </Labeled>
    );
}

const DAY_SHORT: Record<DayKey, string> = {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
};

/** Parses an 'HH:MM' 24-hour string. Returns null on bad input. */
function parseHHMM(value: string): { h24: number; m: number } | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!m) return null;
    const h24 = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(h24) || !Number.isFinite(mm)) return null;
    if (h24 < 0 || h24 > 23 || mm < 0 || mm > 59) return null;
    return { h24, m: mm };
}

/** Formats 'HH:MM' 24-hour into '10:00 PM' 12-hour display. Falls back to raw on bad input. */
function formatTimeDisplay(value: string): string {
    const p = parseHHMM(value);
    if (!p) return value || 'â€”';
    const period = p.h24 >= 12 ? 'PM' : 'AM';
    let h12 = p.h24 % 12;
    if (h12 === 0) h12 = 12;
    return `${String(h12).padStart(2, '0')}:${String(p.m).padStart(2, '0')} ${period}`;
}

// ============================================================================
// Entrance Rules section
// ============================================================================

function parseAgeInput(v: string): number | null {
    if (!v.trim()) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(99, Math.round(n)));
}

function EntranceRulesSection({
    defaultAge,
    onDefaultAge,
    dayAges,
    onDayAges,
    dressCode,
    onDressCode,
    entranceRequirements,
    onEntranceRequirements,
    openingHours,
}: {
    defaultAge: number | null;
    onDefaultAge: (v: number | null) => void;
    dayAges: DaySpecificAges;
    onDayAges: (v: DaySpecificAges) => void;
    dressCode: string;
    onDressCode: (v: string) => void;
    entranceRequirements: string;
    onEntranceRequirements: (v: string) => void;
    openingHours: OpeningHoursJson;
}) {
    const openDays = DAY_KEYS.filter((k) => !openingHours[k].closed);
    const fallbackAge = defaultAge ?? 21;

    const setDayAge = (k: DayKey, raw: string) => {
        const parsed = parseAgeInput(raw);
        const next: DaySpecificAges = { ...dayAges };
        if (parsed == null) {
            delete next[k];
        } else {
            next[k] = parsed;
        }
        onDayAges(next);
    };

    return (
        <View style={styles.rulesSection}>
            <View style={styles.rulesCard}>
                <LabelWithIcon icon="shield-outline" label="Default age limit" />
                <Text style={styles.rulesHint}>
                    Applies every open night unless you override a specific day below.
                </Text>
                <View style={styles.rulesDefaultRow}>
                    <TextInput
                        style={[styles.input, styles.rulesDefaultInput]}
                        value={defaultAge != null ? String(defaultAge) : ''}
                        onChangeText={(v) => onDefaultAge(parseAgeInput(v))}
                        placeholder={String(fallbackAge)}
                        placeholderTextColor="rgba(156,163,175,0.45)"
                        keyboardType="number-pad"
                        maxLength={2}
                    />
                    <Text style={styles.rulesUnit}>years minimum</Text>
                </View>
            </View>

            <View style={styles.rulesCard}>
                <Text style={styles.rulesCardTitle}>Day-specific ages</Text>
                <Text style={styles.rulesHint}>
                    For nights your venue is open. Leave empty to use the default ({fallbackAge}). Tap the clear
                    icon to remove a custom age for that day.
                </Text>
                {openDays.length === 0 ? (
                    <Text style={styles.closedAllText}>
                        No open days yet. Choose opening days in Opening Hours first.
                    </Text>
                ) : (
                    <View style={styles.rulesDayList}>
                        {openDays.map((k) => {
                            const v = dayAges[k];
                            const hasOverride = v != null;
                            return (
                                <View
                                    key={k}
                                    style={[styles.ageDayRow, hasOverride ? styles.ageDayRowActive : undefined]}
                                >
                                    <View style={styles.ageDayNameCol}>
                                        <Text style={styles.ageDayShort}>{DAY_SHORT[k]}</Text>
                                        <Text style={styles.ageDayFull} numberOfLines={1}>
                                            {DAY_LABELS[k]}
                                        </Text>
                                    </View>
                                    <TextInput
                                        style={styles.ageDayInputFlex}
                                        value={hasOverride ? String(v) : ''}
                                        onChangeText={(t) => setDayAge(k, t)}
                                        placeholder={String(fallbackAge)}
                                        placeholderTextColor="rgba(156,163,175,0.4)"
                                        keyboardType="number-pad"
                                        maxLength={2}
                                    />
                                    <Text style={styles.ageSuffix}>yrs</Text>
                                    {hasOverride ? (
                                        <Pressable
                                            onPress={() => setDayAge(k, '')}
                                            hitSlop={10}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Clear age override for ${DAY_LABELS[k]}`}
                                            style={styles.ageClearHit}
                                        >
                                            <Icon name="close-circle" size={22} color="rgba(255,255,255,0.38)" />
                                        </Pressable>
                                    ) : (
                                        <View style={styles.ageClearPlaceholder} />
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>

            <View style={styles.rulesCard}>
                <LabelWithIcon icon="shirt-outline" label="Dress code" />
                <TextInput
                    style={styles.input}
                    value={dressCode}
                    onChangeText={onDressCode}
                    placeholder="e.g. Smart casual, no sportswear"
                    placeholderTextColor="rgba(156,163,175,0.55)"
                />
            </View>

            <View style={styles.rulesCard}>
                <LabelWithIcon icon="document-text-outline" label="Entrance requirements" />
                <Text style={styles.rulesHintFlat}>
                    Door policy, ID, reservations, or other rules guests should know.
                </Text>
                <TextInput
                    style={[styles.input, styles.inputMultiline, styles.rulesMultiline]}
                    value={entranceRequirements}
                    onChangeText={onEntranceRequirements}
                    placeholder="e.g. Table reservation only"
                    placeholderTextColor="rgba(156,163,175,0.55)"
                    multiline
                    textAlignVertical="top"
                />
            </View>
        </View>
    );
}

function LabelWithIcon({ icon, label }: { icon: string; label: string }) {
    return (
        <View style={styles.ruleIconRow}>
            <Icon name={icon} size={14} color={VP.text} />
            <Text style={styles.ruleLabel}>{label}</Text>
        </View>
    );
}

// ============================================================================
// Links & Media section
// ============================================================================

function LinksMediaSection({
    venueId,
    instagram,
    onInstagram,
    spotify,
    onSpotify,
    menuUrl,
    onPersistMenuUrl,
}: {
    venueId: string | null;
    instagram: string;
    onInstagram: (v: string) => void;
    spotify: string;
    onSpotify: (v: string) => void;
    menuUrl: string;
    onPersistMenuUrl: (next: string) => Promise<boolean>;
}) {
    const [uploading, setUploading] = useState(false);
    const [removing, setRemoving] = useState(false);

    const handlePickMenu = useCallback(async () => {
        if (!venueId) {
            Alert.alert('No venue linked', 'Link this account to a venue first.');
            return;
        }
        if (uploading) return;

        try {
            const result = await DocumentPicker.pickSingle({
                type: [types.pdf],
                copyTo: 'cachesDirectory',
            });
            const uri = result.fileCopyUri ?? result.uri;
            if (!uri) return;

            setUploading(true);
            const up = await uploadVenueMenuPdf(venueId, uri, result.name ?? null);
            if (!up.ok || !up.url) {
                Alert.alert('Upload failed', up.error || 'Please try again.');
                return;
            }
            const persisted = await onPersistMenuUrl(up.url);
            if (!persisted) {
                await removeVenueMenuPdf(up.url);
                return;
            }
            // If there was a previous menu uploaded to our bucket, drop the old file.
            if (menuUrl && menuUrl !== up.url) {
                await removeVenueMenuPdf(menuUrl);
            }
        } catch (e) {
            if (isCancel(e)) return;
            if (isInProgress(e)) return;
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert("Couldn't open picker", msg);
        } finally {
            setUploading(false);
        }
    }, [venueId, uploading, menuUrl, onPersistMenuUrl]);

    const handleViewMenu = useCallback(() => {
        if (!menuUrl) return;
        Linking.openURL(menuUrl).catch(() => {
            Alert.alert("Can't open menu", 'The saved URL is invalid.');
        });
    }, [menuUrl]);

    const handleRemoveMenu = useCallback(() => {
        if (!menuUrl) return;
        Alert.alert('Remove menu?', 'This menu PDF will be removed from your venue.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    setRemoving(true);
                    try {
                        const prev = menuUrl;
                        const ok = await onPersistMenuUrl('');
                        if (ok) {
                            await removeVenueMenuPdf(prev);
                        }
                    } finally {
                        setRemoving(false);
                    }
                },
            },
        ]);
    }, [menuUrl, onPersistMenuUrl]);

    const hasMenu = menuUrl.trim().length > 0;

    return (
        <>
            <LabelWithIcon icon="logo-instagram" label="Instagram" />
            <TextInput
                style={styles.input}
                value={instagram}
                onChangeText={onInstagram}
                placeholder="@niteways"
                placeholderTextColor="rgba(156,163,175,0.55)"
                autoCapitalize="none"
                autoCorrect={false}
            />

            <View style={{ marginTop: 18 }}>
                <LabelWithIcon icon="headset-outline" label="Spotify Playlist" />
                <TextInput
                    style={styles.input}
                    value={spotify}
                    onChangeText={onSpotify}
                    placeholder="https://open.spotify.com/playlist/..."
                    placeholderTextColor="rgba(156,163,175,0.55)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                />
            </View>

            <View style={{ marginTop: 18 }}>
                <LabelWithIcon icon="document-text-outline" label="Menu PDF" />
                {hasMenu ? (
                    <View style={styles.menuCurrentCard}>
                        <Icon name="document-text" size={22} color={GOLD} />
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={handleViewMenu}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.menuCurrentTitle} numberOfLines={1}>
                                Menu uploaded
                            </Text>
                            <Text style={styles.menuCurrentLink} numberOfLines={1}>
                                {menuUrl}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuIconBtn}
                            onPress={handlePickMenu}
                            disabled={uploading || removing}
                            activeOpacity={0.85}
                            hitSlop={6}
                        >
                            {uploading ? (
                                <ActivityIndicator color={VP.text} size="small" />
                            ) : (
                                <Icon name="refresh-outline" size={18} color={VP.text} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuIconBtn}
                            onPress={handleRemoveMenu}
                            disabled={uploading || removing}
                            activeOpacity={0.85}
                            hitSlop={6}
                        >
                            {removing ? (
                                <ActivityIndicator color={VP.coral} size="small" />
                            ) : (
                                <Icon name="trash-outline" size={18} color={VP.coral} />
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.uploadMenuBtn}
                        onPress={handlePickMenu}
                        disabled={uploading}
                        activeOpacity={0.85}
                    >
                        {uploading ? (
                            <ActivityIndicator color={VP.text} />
                        ) : (
                            <>
                                <Icon
                                    name="cloud-upload-outline"
                                    size={20}
                                    color={VP.text}
                                    style={{ marginRight: 8 }}
                                />
                                <Text style={styles.uploadMenuText}>Upload Menu</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </>
    );
}

function OpeningHoursSection({
    hours,
    onChange,
}: {
    hours: OpeningHoursJson;
    /** Functional updates avoid stale `hours` overwrites when toggling multiple days quickly. */
    onChange: (recipe: (prev: OpeningHoursJson) => OpeningHoursJson) => void;
}) {
    const [picker, setPicker] = useState<{ day: DayKey; field: 'open' | 'close' } | null>(null);

    const updateDay = (k: DayKey, patch: Partial<OpeningHoursJson[DayKey]>) => {
        onChange((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));
    };

    const toggleDayOpen = (k: DayKey) => {
        onChange((prev) => ({
            ...prev,
            [k]: { ...prev[k], closed: !prev[k].closed },
        }));
    };

    const openDays = DAY_KEYS.filter((k) => !hours[k].closed);
    const pickerDay = picker ? hours[picker.day] : null;
    const pickerValue = picker && pickerDay ? pickerDay[picker.field] : '';

    return (
        <>
            <Labeled label="Opening Days">
                <View style={styles.daysChipRow}>
                    {DAY_KEYS.map((k) => {
                        const on = !hours[k].closed;
                        return (
                            <TouchableOpacity
                                key={k}
                                style={[styles.dayChip, on && styles.dayChipOn]}
                                onPress={() => toggleDayOpen(k)}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>
                                    {DAY_SHORT[k]}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Labeled>

            <Labeled label="Opening Hours">
                {openDays.length === 0 ? (
                    <Text style={styles.closedAllText}>
                        No open days selected. Tap a day above to open it.
                    </Text>
                ) : (
                    <View style={{ gap: 10 }}>
                        {openDays.map((k) => {
                            const day = hours[k];
                            return (
                                <View key={k} style={styles.hoursRow}>
                                    <Text style={styles.hoursDay}>{DAY_SHORT[k]}</Text>
                                    <TouchableOpacity
                                        style={styles.timePill}
                                        onPress={() => setPicker({ day: k, field: 'open' })}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.timePillText}>
                                            {formatTimeDisplay(day.open)}
                                        </Text>
                                    </TouchableOpacity>
                                    <Text style={styles.hoursDash}>{'\u2013'}</Text>
                                    <TouchableOpacity
                                        style={styles.timePill}
                                        onPress={() => setPicker({ day: k, field: 'close' })}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.timePillText}>
                                            {formatTimeDisplay(day.close)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                )}
            </Labeled>

            <TimePickerModal
                visible={picker !== null}
                value={pickerValue}
                title={
                    picker
                        ? `${DAY_LABELS[picker.day]} \u00b7 ${
                              picker.field === 'open' ? 'Opening time' : 'Closing time'
                          }`
                        : ''
                }
                onCancel={() => setPicker(null)}
                onConfirm={(next) => {
                    if (picker) {
                        const { day, field } = picker;
                        onChange((prev) => ({
                            ...prev,
                            [day]: { ...prev[day], [field]: next },
                        }));
                    }
                    setPicker(null);
                }}
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// Time picker modal (custom 3-column picker â€” no native deps)
// ---------------------------------------------------------------------------

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0..59
const PERIODS: Array<'AM' | 'PM'> = ['AM', 'PM'];

function to24(h12: number, period: 'AM' | 'PM'): number {
    if (period === 'AM') return h12 === 12 ? 0 : h12;
    return h12 === 12 ? 12 : h12 + 12;
}

function TimePickerModal({
    visible,
    value,
    title,
    onCancel,
    onConfirm,
}: {
    visible: boolean;
    value: string;
    title: string;
    onCancel: () => void;
    onConfirm: (next: string) => void;
}) {
    const parsed = parseHHMM(value);
    const initPeriod: 'AM' | 'PM' = parsed && parsed.h24 >= 12 ? 'PM' : 'AM';
    const initH12 = parsed ? (parsed.h24 % 12 === 0 ? 12 : parsed.h24 % 12) : 9;
    const initM = parsed ? parsed.m : 0;

    const [h12, setH12] = useState<number>(initH12);
    const [minute, setMinute] = useState<number>(initM);
    const [period, setPeriod] = useState<'AM' | 'PM'>(initPeriod);

    useEffect(() => {
        if (!visible) return;
        const p = parseHHMM(value);
        if (p) {
            setPeriod(p.h24 >= 12 ? 'PM' : 'AM');
            setH12(p.h24 % 12 === 0 ? 12 : p.h24 % 12);
            setMinute(p.m);
        } else {
            setPeriod('AM');
            setH12(9);
            setMinute(0);
        }
    }, [visible, value]);

    const handleDone = () => {
        const h24 = to24(h12, period);
        onConfirm(`${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.tpOverlay}>
                <View style={styles.tpCard}>
                    <Text style={styles.tpTitle} numberOfLines={1}>
                        {title}
                    </Text>
                    <View style={styles.tpWheelsRow}>
                        <WheelColumn
                            items={HOURS_12.map((h) => String(h).padStart(2, '0'))}
                            selectedIndex={HOURS_12.indexOf(h12)}
                            onSelect={(idx) => setH12(HOURS_12[idx])}
                        />
                        <Text style={styles.tpColon}>:</Text>
                        <WheelColumn
                            items={MINUTES.map((m) => String(m).padStart(2, '0'))}
                            selectedIndex={minute}
                            onSelect={(idx) => setMinute(idx)}
                        />
                        <WheelColumn
                            items={PERIODS}
                            selectedIndex={PERIODS.indexOf(period)}
                            onSelect={(idx) => setPeriod(PERIODS[idx])}
                        />
                    </View>
                    <View style={styles.tpActions}>
                        <TouchableOpacity
                            style={[styles.tpBtn, styles.tpBtnGhost]}
                            onPress={onCancel}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.tpBtnGhostText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tpBtn, styles.tpBtnPrimary]}
                            onPress={handleDone}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.tpBtnPrimaryText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function WheelColumn({
    items,
    selectedIndex,
    onSelect,
}: {
    items: string[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}) {
    return (
        <ScrollView
            style={styles.wheelCol}
            contentContainerStyle={styles.wheelColContent}
            showsVerticalScrollIndicator={false}
        >
            {items.map((item, i) => {
                const on = i === selectedIndex;
                return (
                    <TouchableOpacity
                        key={`${item}-${i}`}
                        onPress={() => onSelect(i)}
                        activeOpacity={0.8}
                        style={[styles.wheelItem, on && styles.wheelItemOn]}
                    >
                        <Text style={[styles.wheelItemText, on && styles.wheelItemTextOn]}>
                            {item}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

// ============================================================================
// App Preview modal
// ============================================================================

function AppPreviewModal({
    visible,
    onClose,
    draft,
}: {
    visible: boolean;
    onClose: () => void;
    draft: Draft;
}) {
    // Map the Venue Info draft into the `Nightclub` shape that the real
    // user-facing VenueDetailScreen expects. Rendering the actual screen keeps
    // the preview in lock-step with any future changes to the consumer app.
    const club: Nightclub = useMemo(() => {
        const images = (draft.gallery_images ?? []).filter((s) => !!s && s.length > 0);
        const tags = (draft.music_genre ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        return {
            id: 0, // Preview-only id; getTableLayout falls back to DEFAULT_LAYOUT.
            name: draft.name?.trim() || 'Your Venue',
            description: draft.description?.trim() || '',
            address: draft.address?.trim() || '',
            city: '',
            imageUrl: images[0] ?? '',
            galleryImages: images,
            category: draft.category?.trim() || 'Nightclub',
            tags,
            priceLevel: '$$',
            latitude: draft.latitude ?? undefined,
            longitude: draft.longitude ?? undefined,
        };
    }, [draft]);

    // Stub navigation so the real screen's navigation.goBack() / .navigate()
    // calls (e.g. after a preview booking attempt) just close the modal.
    const stubNavigation = useMemo(
        () => ({
            goBack: onClose,
            navigate: () => onClose(),
            push: () => {},
            replace: () => {},
            setParams: () => {},
            dispatch: () => {},
            addListener: () => () => {},
            removeListener: () => {},
            canGoBack: () => true,
            isFocused: () => true,
        }),
        [onClose],
    );

    const stubRoute = useMemo(() => ({ params: { club } }), [club]);

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.previewBackdrop}>
                {/* Close button outside the phone frame */}
                <TouchableOpacity
                    style={styles.previewCloseOuter}
                    onPress={onClose}
                    hitSlop={10}
                    accessibilityLabel="Close preview"
                >
                    <Icon name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Phone mockup frame */}
                <View style={styles.previewPhone}>
                    {/* Mock iOS status bar */}
                    <View style={styles.previewStatusBar}>
                        <Text style={styles.previewStatusTime}>9:41</Text>
                        <View style={styles.previewDynamicIsland} />
                        <View style={styles.previewStatusRight}>
                            <Icon name="cellular" size={12} color="#FFFFFF" />
                            <Icon
                                name="wifi"
                                size={13}
                                color="#FFFFFF"
                                style={{ marginLeft: 5 }}
                            />
                            <View style={styles.previewBattery}>
                                <View style={styles.previewBatteryFill} />
                            </View>
                        </View>
                    </View>

                    {/* Real user-app screen inside the phone */}
                    <View style={styles.previewPhoneScreen}>
                        <VenueDetailScreen
                            navigation={stubNavigation as any}
                            route={stubRoute as any}
                        />
                    </View>

                    {/* Home indicator */}
                    <View style={styles.previewHomeBar} />
                </View>
            </View>
        </Modal>
    );
}


// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: BG },
    centered: { alignItems: 'center', justifyContent: 'center' },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: 2,
        paddingBottom: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    backWrap: { width: 40, justifyContent: 'center' },
    topBarSpacer: { width: 40 },
    remoteStaleBanner: {
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 4,
        padding: 12,
        borderRadius: 12,
        backgroundColor: GOLD_SOFT,
        borderWidth: 1,
        borderColor: GOLD,
    },
    remoteStaleText: {
        color: VP.text,
        fontSize: 12,
        lineHeight: 17,
        marginBottom: 10,
    },
    remoteStaleActions: { flexDirection: 'row', gap: 10 },
    remoteStaleBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: GOLD,
        alignItems: 'center',
    },
    remoteStaleBtnText: { color: '#111', fontSize: 13, fontWeight: '800' },
    remoteStaleBtnOutline: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
    },
    remoteStaleBtnOutlineText: { color: VP.text, fontSize: 13, fontWeight: '700' },
    topTitles: { flex: 1, minWidth: 0, paddingRight: 4 },
    pageTitle: { color: VP.text, fontSize: 22, fontWeight: '800' },
    pageSub: { color: VP.muted, fontSize: 13, marginTop: 2, lineHeight: 18 },
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 },
    previewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#141418',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        paddingVertical: 14,
        marginBottom: 14,
    },
    previewBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    section: {
        backgroundColor: CARD,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SOFT_BORDER,
        marginBottom: 12,
        overflow: 'hidden',
    },
    sectionHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    sectionIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: GOLD_SOFT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitles: { flex: 1, minWidth: 0 },
    sectionTitle: { color: VP.text, fontSize: 15, fontWeight: '800' },
    sectionSub: { color: VP.muted, fontSize: 12, marginTop: 3 },
    sectionBody: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 4,
    },
    field: { marginTop: 14 },
    fieldLabel: {
        color: VP.text,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
    },
    input: {
        backgroundColor: FIELD_BG,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
        paddingVertical: 12,
        paddingHorizontal: 14,
        color: VP.text,
        fontSize: 15,
        fontWeight: '600',
    },
    inputMultiline: { minHeight: 96, paddingTop: 12 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: FIELD_BG,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
    },
    chipOn: {
        backgroundColor: GOLD_SOFT,
        borderColor: GOLD,
    },
    chipText: { color: VP.muted, fontSize: 13, fontWeight: '700' },
    chipTextOn: { color: GOLD },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: FIELD_BG,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    dropdownText: {
        flex: 1,
        color: VP.text,
        fontSize: 15,
        fontWeight: '600',
    },
    rowTwo: { flexDirection: 'row', gap: 10, marginTop: 0 },
    rowTwoCol: { flex: 1, minWidth: 0 },
    stubBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: 'rgba(255,204,0,0.06)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,204,0,0.2)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginTop: 14,
    },
    stubText: { flex: 1, color: VP.muted, fontSize: 12, lineHeight: 17 },
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    photoTile: {
        width: 104,
        height: 104,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: FIELD_BG,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
        position: 'relative',
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    photoOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    photoRemoveBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.75)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    photoAddTile: {
        width: 104,
        height: 104,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: 'rgba(255,255,255,0.28)',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    mapsLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mapsLinkInput: {
        flex: 1,
    },
    mapsOpenBtn: {
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: FIELD_BG,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
    },
    mapsOpenBtnDisabled: {
        opacity: 0.5,
    },
    ruleIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    ruleLabel: {
        color: VP.text,
        fontSize: 13,
        fontWeight: '700',
    },
    rulesSection: {
        gap: 14,
    },
    rulesCard: {
        backgroundColor: FIELD_BG,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: SOFT_BORDER,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    rulesCardTitle: {
        color: VP.text,
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    rulesHint: {
        color: VP.muted,
        fontSize: 12,
        lineHeight: 17,
        marginBottom: 12,
    },
    rulesHintFlat: {
        color: VP.muted,
        fontSize: 12,
        lineHeight: 17,
        marginBottom: 8,
        marginTop: -4,
    },
    rulesDefaultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rulesDefaultInput: {
        width: 72,
        textAlign: 'center',
        paddingVertical: 12,
        fontSize: 16,
        fontWeight: '800',
    },
    rulesUnit: {
        color: VP.muted,
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    rulesDayList: {
        gap: 10,
    },
    ageDayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#121217',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    ageDayRowActive: {
        borderColor: GOLD,
        backgroundColor: GOLD_SOFT,
    },
    ageDayNameCol: {
        width: 72,
        minWidth: 72,
    },
    ageDayShort: {
        color: GOLD,
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    ageDayFull: {
        color: VP.muted,
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
        textTransform: 'capitalize',
    },
    ageDayInputFlex: {
        flex: 1,
        minWidth: 48,
        backgroundColor: '#0D0D11',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
        paddingVertical: 10,
        paddingHorizontal: 8,
        color: VP.text,
        fontSize: 15,
        fontWeight: '800',
        textAlign: 'center',
    },
    ageSuffix: {
        width: 28,
        color: VP.muted,
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    ageClearHit: {
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ageClearPlaceholder: {
        width: 26,
        height: 26,
    },
    rulesMultiline: {
        minHeight: 100,
        marginTop: 0,
    },
    uploadMenuBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: FIELD_BG,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
    },
    uploadMenuText: {
        color: VP.text,
        fontSize: 14,
        fontWeight: '700',
    },
    menuCurrentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: FIELD_BG,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
    },
    menuCurrentTitle: {
        color: VP.text,
        fontSize: 14,
        fontWeight: '700',
    },
    menuCurrentLink: {
        color: VP.muted,
        fontSize: 11,
        marginTop: 2,
    },
    menuIconBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: FIELD_BORDER,
    },
    genreRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    genreChip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: FIELD_BG,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
    },
    genreChipOn: {
        backgroundColor: 'rgba(225,29,72,0.18)',
        borderColor: 'rgba(244,63,94,0.85)',
    },
    genreChipText: {
        color: VP.muted,
        fontSize: 13,
        fontWeight: '700',
    },
    genreChipTextOn: {
        color: '#F87A8F',
    },
    daysChipRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 6,
    },
    dayChip: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 999,
        backgroundColor: FIELD_BG,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayChipOn: {
        backgroundColor: GOLD_SOFT,
        borderColor: GOLD,
    },
    dayChipText: {
        color: VP.muted,
        fontSize: 12,
        fontWeight: '700',
    },
    dayChipTextOn: { color: GOLD },
    hoursRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    hoursDay: {
        width: 40,
        color: VP.text,
        fontSize: 13,
        fontWeight: '700',
    },
    hoursDash: { color: VP.muted, fontSize: 14, fontWeight: '700' },
    timePill: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: FIELD_BG,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timePillText: {
        color: VP.text,
        fontSize: 14,
        fontWeight: '700',
    },
    closedAllText: {
        color: VP.muted,
        fontSize: 13,
        lineHeight: 18,
    },
    tpOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    tpCard: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: CARD,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SOFT_BORDER,
        padding: 18,
    },
    tpTitle: {
        color: VP.text,
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
    },
    tpWheelsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 200,
    },
    tpColon: {
        color: VP.text,
        fontSize: 20,
        fontWeight: '800',
        marginHorizontal: 2,
    },
    wheelCol: {
        flex: 1,
        maxWidth: 90,
        borderRadius: 12,
        backgroundColor: FIELD_BG,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
    },
    wheelColContent: {
        paddingVertical: 8,
    },
    wheelItem: {
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    wheelItemOn: {
        backgroundColor: GOLD_SOFT,
    },
    wheelItemText: {
        color: VP.muted,
        fontSize: 15,
        fontWeight: '600',
    },
    wheelItemTextOn: {
        color: GOLD,
        fontWeight: '800',
    },
    tpActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
    },
    tpBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tpBtnGhost: {
        backgroundColor: FIELD_BG,
        borderWidth: 1,
        borderColor: FIELD_BORDER,
    },
    tpBtnGhostText: {
        color: VP.text,
        fontSize: 14,
        fontWeight: '700',
    },
    tpBtnPrimary: {
        backgroundColor: GOLD,
    },
    tpBtnPrimaryText: {
        color: '#111',
        fontSize: 14,
        fontWeight: '800',
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: GOLD,
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 10,
    },
    saveBtnDisabled: { opacity: 0.55 },
    saveBtnIcon: { marginRight: 8 },
    saveBtnText: { color: '#111', fontSize: 16, fontWeight: '800' },
    warning: {
        marginTop: 12,
        color: VP.coral,
        fontSize: 12,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    modalCard: {
        backgroundColor: CARD,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: SOFT_BORDER,
        overflow: 'hidden',
    },
    modalHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    modalTitle: { color: VP.text, fontSize: 16, fontWeight: '800' },
    modalEmpty: { color: VP.muted, textAlign: 'center', padding: 20 },
    cityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    cityRowOn: { backgroundColor: 'rgba(255,255,255,0.04)' },
    cityCheck: { width: 24, alignItems: 'center' },
    cityLabel: { color: VP.text, fontSize: 15, fontWeight: '600' },

    // ── Phone-mockup preview frame ─────────────────────────────────────────
    previewBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    previewCloseOuter: {
        position: 'absolute',
        top: 40,
        right: 18,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    previewPhone: {
        width: Math.min(Dimensions.get('window').width * 0.9, 400),
        height: Math.min(
            Dimensions.get('window').height * 0.88,
            Dimensions.get('window').width * 0.9 * (19.5 / 9),
        ),
        backgroundColor: '#0A0A0D',
        borderRadius: 44,
        borderWidth: 4,
        borderColor: '#1E1E22',
        overflow: 'hidden',
    },
    previewStatusBar: {
        height: 38,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#000000',
    },
    previewStatusTime: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        width: 52,
    },
    previewDynamicIsland: {
        width: 96,
        height: 24,
        borderRadius: 14,
        backgroundColor: '#000000',
    },
    previewStatusRight: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 52,
        justifyContent: 'flex-end',
    },
    previewBattery: {
        marginLeft: 5,
        width: 24,
        height: 11,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        padding: 1,
    },
    previewBatteryFill: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 1.5,
    },
    previewPhoneScreen: {
        flex: 1,
        overflow: 'hidden',
    },
    previewHomeBar: {
        alignSelf: 'center',
        width: 130,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.7)',
        marginBottom: 6,
        marginTop: 4,
    },
});
