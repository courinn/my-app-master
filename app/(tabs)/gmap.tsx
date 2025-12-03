import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Linking,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { db } from "../firebase";
import { useAuth } from '../providers/AuthProvider';

type BaseMarker = { id: string; name: string; latitude: number; longitude: number };
type HotelInfo = { bintang?: number; alamat?: string; deskripsi?: string; website?: string | null; sections?: Array<{ title: string; content: string; source?: string | null }> };
type MarkerItem = BaseMarker & HotelInfo;

const SCREEN_HEIGHT = Dimensions.get('window').height;

function getStarColor(stars?: number) {
    const starLevel = Math.floor(stars || 0);
    switch (starLevel) {
        case 3:
            return '#FF6B6B';
        case 4:
            return '#FFA500';
        case 5:
            return '#10be5eff';
        default:
            return '#0275d8';
    }
}

export default function MapScreen() {
    const [markers, setMarkers] = useState<MarkerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMarker, setSelectedMarker] = useState<MarkerItem | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | '3' | '4' | '5'>('all');
    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const { role } = useAuth();

    const bottomSheetY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const panResponder = useRef<any>(null);

    // Configure sheet open/closed positions so the sheet shows more content
    const SHEET_OPEN_Y = SCREEN_HEIGHT * 0.25; // sheet pulled up -> visible ~75% of screen
    const SHEET_CLOSED_Y = SCREEN_HEIGHT; // fully hidden

    useEffect(() => {
        panResponder.current = PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (e, { dy }) => Math.abs(dy) > 8,
            onPanResponderMove: (e, { dy }) => {
                // allow user to drag sheet down from open position
                if (dy > 0) bottomSheetY.setValue(SHEET_OPEN_Y + dy);
                // allow small upward drag (optional) but keep bounds
                else bottomSheetY.setValue(Math.max(0, SHEET_OPEN_Y + dy));
            },
            onPanResponderRelease: (e, { dy, vy }) => {
                // if user drags down sufficiently or with a downward velocity, close
                if (dy > 80 || vy > 0.8) closeBottomSheet();
                else openBottomSheet();
            },
        });
    }, []);

    useEffect(() => {
        const pointsRef = ref(db, 'points/');
        const unsubscribe = onValue(pointsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const parsed = Object.keys(data)
                    .map((key) => {
                        const point = data[key];
                        if (typeof point.coordinates !== 'string' || point.coordinates.trim() === '') return null;
                        const [latitude, longitude] = point.coordinates.split(',').map(Number);
                        if (isNaN(latitude) || isNaN(longitude)) return null;
                        // Use all data from Firebase (already includes both migrated hoteldata + new entries)
                        // Convert reviews into section-like entries so they appear in the detail sections
                        const reviewsFromDb: Array<any> = point.reviews && typeof point.reviews === 'object' ? Object.keys(point.reviews).map(k => ({ id: k, ...point.reviews[k] })) : [];
                        const reviewSections = reviewsFromDb.map((r) => ({ title: `Ulasan: ${r.userName || 'Anon' } • ${r.rating || ''}⭐`, content: r.comment || '', source: r.createdAt || null }));
                        const mergedSections = Array.isArray(point.sections) ? [...point.sections, ...reviewSections] : reviewSections.length > 0 ? reviewSections : (point.sections || null);

                        return {
                            id: key,
                            name: point.name,
                            latitude,
                            longitude,
                            bintang: point.bintang || 0,
                            alamat: point.alamat || '',
                            deskripsi: point.deskripsi || '',
                            website: point.website || null,
                            sections: mergedSections,
                        } as MarkerItem;
                    })
                    .filter((m): m is MarkerItem => m !== null);
                setMarkers(parsed);
            } else {
                setMarkers([]);
            }
            setLoading(false);
        }, (err) => {
            console.error(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const groupedByStars = {
        3: markers.filter((m) => Math.floor(m.bintang || 0) === 3),
        4: markers.filter((m) => Math.floor(m.bintang || 0) === 4),
        5: markers.filter((m) => Math.floor(m.bintang || 0) === 5),
    };

    const openBottomSheet = () => {
        setShowBottomSheet(true);
        Animated.spring(bottomSheetY, { toValue: SHEET_OPEN_Y, useNativeDriver: false }).start();
    };
    const closeBottomSheet = () => {
        Animated.timing(bottomSheetY, { toValue: SHEET_CLOSED_Y, duration: 300, useNativeDriver: false }).start(() => {
            setShowBottomSheet(false);
            setSelectedMarker(null);
        });
    };

    const handleMarkerPress = (marker: MarkerItem) => {
        setSelectedMarker(marker);
        openBottomSheet();
    };

    const openInMaps = async () => {
        if (!selectedMarker) return;
        const { latitude, longitude } = selectedMarker;
        const mapsUrl = Platform.OS === 'ios' ? `maps://?daddr=${latitude},${longitude}` : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        try {
            const can = await Linking.canOpenURL(mapsUrl);
            if (can) await Linking.openURL(mapsUrl);
            else await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
        } catch (err) {
            Alert.alert('Error', 'Tidak dapat membuka aplikasi peta.');
        }
    };

    const openWebsite = async () => {
        if (!selectedMarker || !selectedMarker.website) return;
        let url = selectedMarker.website;
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        try {
            const can = await Linking.canOpenURL(url);
            if (can) await Linking.openURL(url);
            else Alert.alert('Error', 'Tidak dapat membuka website pada perangkat ini.');
        } catch (err) {
            Alert.alert('Error', 'Terjadi kesalahan saat membuka website.');
        }
    };

    const renderStarRating = (stars?: number) => {
        const full = Math.floor(stars || 0);
        return '⭐'.repeat(Math.max(0, full));
    };

    const renderStarSection = (stars: number, list: MarkerItem[]) => (
        <View style={styles.starSection}>
            <View style={styles.starHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={styles.starHeaderText}>{renderStarRating(stars)} Hotel Bintang {stars}</Text>
                </View>
                <View style={[styles.starBadge, { backgroundColor: getStarColor(stars) }]}>
                    <Text style={styles.starCount}>{list.length}</Text>
                </View>
            </View>
            {list.length > 0 ? (
                <FlatList
                    data={list}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.hotelCard} onPress={() => handleMarkerPress(item)}>
                            <View style={styles.hotelCardContent}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={styles.hotelName}>{item.name}</Text>
                                    <Text style={{ marginLeft: 8, color: getStarColor(item.bintang), fontSize: 12 }}>{renderStarRating(item.bintang)}</Text>
                                </View>
                                <Text style={styles.hotelAddress} numberOfLines={1}>{item.alamat}</Text>
                                <View style={styles.hotelFooter}>
                                    <FontAwesome name="map-marker" size={14} color="#666" />
                                    <Text style={styles.hotelCoords}>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
                                </View>
                            </View>
                            <FontAwesome name="chevron-right" size={16} color="#999" />
                        </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id}
                />
            ) : (
                <Text style={styles.emptyText}>Tidak ada hotel di kategori ini</Text>
            )}
        </View>
    );

    const renderBottomSheetContent = () => (
        <ScrollView
            style={styles.bottomSheetInner}
            contentContainerStyle={styles.bottomSheetContentContainer}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
        >
            {selectedMarker ? (
                <>
                    <View style={styles.headerSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={[styles.bottomSheetTitle, { color: getStarColor(selectedMarker.bintang) }]}>{renderStarRating(selectedMarker.bintang)}</Text>
                            <Text style={{ marginLeft: 8, fontSize: 14, color: '#666' }}>({Math.floor(selectedMarker.bintang || 0)} bintang)</Text>
                        </View>
                        <Text style={styles.hotelNameBig}>{selectedMarker.name}</Text>
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={openInMaps}>
                            <FontAwesome name="location-arrow" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Arah</Text>
                        </TouchableOpacity>

                        {selectedMarker.website && (
                            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={openWebsite}>
                                <FontAwesome name="globe" size={18} color="#fff" />
                                <Text style={styles.actionBtnText}>Website</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#dc3545' }]} activeOpacity={0.8} onPress={closeBottomSheet}>
                            <FontAwesome name="close" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Tutup</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 1, backgroundColor: '#e9ecef', marginVertical: 16 }} />

                    <View style={styles.ratingSection}>
                        <FontAwesome name="star" size={16} color={getStarColor(selectedMarker.bintang)} />
                        <Text style={styles.ratingText}>Rating: {selectedMarker.bintang} dari 5 bintang</Text>
                    </View>

                    {selectedMarker.alamat && (
                        <View style={styles.infoSection}>
                            <FontAwesome name="map-marker" size={16} color="#0275d8" />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.infoLabel}>📍 Alamat</Text>
                                <Text style={styles.infoText}>{selectedMarker.alamat}</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.infoSection}>
                        <FontAwesome name="location-arrow" size={16} color="#28a745" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.infoLabel}>📌 Koordinat</Text>
                            <Text style={styles.infoText}>{selectedMarker.latitude.toFixed(6)}, {selectedMarker.longitude.toFixed(6)}</Text>
                        </View>
                    </View>

                    {selectedMarker.website && (
                        <View style={styles.infoSection}>
                            <FontAwesome name="globe" size={16} color="#6f42c1" />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.infoLabel}>🌐 Website</Text>
                                <TouchableOpacity onPress={openWebsite}>
                                    <Text style={[styles.infoText, { color: '#0275d8', textDecorationLine: 'underline' }]}>{selectedMarker.website}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {selectedMarker.deskripsi && (
                        <View style={styles.descriptionSection}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <FontAwesome name="info-circle" size={16} color="#0275d8" />
                                <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>Deskripsi</Text>
                            </View>
                            <Text style={styles.descriptionText}>{selectedMarker.deskripsi}</Text>
                        </View>
                    )}

                    {selectedMarker.sections && selectedMarker.sections.length > 0 && (
                        <View style={{ marginTop: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <FontAwesome name="list" size={16} color="#0275d8" />
                                <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>Informasi Lengkap</Text>
                            </View>
                            {selectedMarker.sections.map((section, index) => (
                                <View key={index} style={styles.sectionContainer}>
                                    <View style={styles.sectionHeader}>
                                        <FontAwesome name="info-circle" size={14} color="#0275d8" />
                                        <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 6 }]}>{section.title}</Text>
                                    </View>
                                    <Text style={styles.sectionContent}>{section.content}</Text>
                                    {section.source && <Text style={styles.sectionSource}>📌 Sumber: {section.source}</Text>}
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </>
            ) : (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#999', fontSize: 14 }}>Informasi hotel tidak tersedia.</Text>
                </View>
            )}
        </ScrollView>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0275d8" />
                <Text style={{ marginTop: 10 }}>Memuat data peta...</Text>
            </View>
        );
    }

    const filteredHotels = markers.filter((m) => (activeTab === 'all' ? true : Math.floor(m.bintang || 0) === parseInt(activeTab, 10)));

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={{ latitude: -7.7956, longitude: 110.3695, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }}
                zoomControlEnabled={true}
            >
                {filteredHotels.map((marker) => (
                    <Marker key={marker.id} coordinate={{ latitude: marker.latitude, longitude: marker.longitude }} title={marker.name} pinColor={getStarColor(marker.bintang)} onPress={() => handleMarkerPress(marker)} />
                ))}
            </MapView>

            {role === 'admin' && (
                <TouchableOpacity style={styles.fab} onPress={() => router.push('/forminputlocation')}>
                    <FontAwesome name="plus" size={24} color="white" />
                </TouchableOpacity>
            )}

            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
                    <TouchableOpacity style={[styles.tab, activeTab === 'all' && styles.tabActive]} onPress={() => setActiveTab('all')}>
                        <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>Semua ({markers.length})</Text>
                    </TouchableOpacity>
                    {[3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} style={[styles.tab, activeTab === String(star) && styles.tabActive]} onPress={() => setActiveTab(String(star) as any)}>
                            <Text style={[styles.tabText, activeTab === String(star) && styles.tabTextActive]}>{renderStarRating(star)} ({groupedByStars[star].length})</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.listContainer}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {activeTab === 'all' ? (
                        <>
                            {renderStarSection(3, groupedByStars[3])}
                            {renderStarSection(4, groupedByStars[4])}
                            {renderStarSection(5, groupedByStars[5])}
                        </>
                    ) : (
                        <View>
                            <FlatList
                                data={filteredHotels}
                                scrollEnabled={false}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.hotelCard} onPress={() => handleMarkerPress(item)}>
                                        <View style={styles.hotelCardContent}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                <Text style={styles.hotelName}>{item.name}</Text>
                                                <Text style={{ marginLeft: 8, color: getStarColor(item.bintang), fontSize: 12 }}>{renderStarRating(item.bintang)}</Text>
                                            </View>
                                            <Text style={styles.hotelAddress} numberOfLines={1}>{item.alamat}</Text>
                                            <View style={styles.hotelFooter}>
                                                <FontAwesome name="map-marker" size={14} color="#666" />
                                                <Text style={styles.hotelCoords}>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
                                            </View>
                                        </View>
                                        <FontAwesome name="chevron-right" size={16} color="#999" />
                                    </TouchableOpacity>
                                )}
                                keyExtractor={(item) => item.id}
                            />
                        </View>
                    )}
                </ScrollView>
            </View>

            {showBottomSheet && (
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={closeBottomSheet}>
                        <View style={styles.overlayTouch} />
                    </TouchableWithoutFeedback>
                    <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: bottomSheetY }] }]}>
                        <View style={styles.handle} {...(panResponder.current ? panResponder.current.panHandlers : {})} />
                        {renderBottomSheetContent()}
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    map: { width: '100%', height: '40%' },

    fab: {
        position: 'absolute',
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        bottom: 240,
        backgroundColor: '#0275d8',
        borderRadius: 30,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 10,
    },

    tabContainer: {
        height: 60,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    tabContent: { paddingHorizontal: 10, paddingVertical: 8 },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 20,
        backgroundColor: '#e9ecef',
    },
    tabActive: { backgroundColor: '#0275d8' },
    tabText: { fontSize: 13, fontWeight: '500', color: '#495057' },
    tabTextActive: { color: '#fff' },

    listContainer: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 10 },

    starSection: { marginVertical: 12 },
    starHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: '#f1f3f5',
        borderRadius: 8,
        marginBottom: 8,
    },
    starHeaderText: { fontSize: 16, fontWeight: 'bold', color: '#212529', flex: 1 },
    starBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    starCount: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

    hotelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginVertical: 6,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e9ecef',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    hotelCardContent: { flex: 1, marginRight: 10 },
    hotelName: { fontSize: 14, fontWeight: 'bold', color: '#212529', flex: 1 },
    hotelAddress: { fontSize: 12, color: '#6c757d', marginBottom: 6 },

    hotelFooter: { flexDirection: 'row', alignItems: 'center' },
    hotelCoords: { fontSize: 11, color: '#999', marginLeft: 6 },

    emptyText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        paddingVertical: 20,
    },

    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 999,
    },
    overlayTouch: { flex: 1 },

    /* --- BOTTOM SHEET FIXED --- */
    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: SCREEN_HEIGHT,
        maxHeight: SCREEN_HEIGHT * 0.92,  // agar tidak terpotong; cap at ~92% of screen
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        paddingTop: 10,
    },

    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 10,
    },

    bottomSheetInner: {
        paddingHorizontal: 20,
        paddingBottom: 20, // ruang supaya konten tidak ketutup
        // don't let inner content push the sheet taller than maxHeight; we use a content container for scrolling
        maxHeight: SCREEN_HEIGHT * 0.78,
    },

    bottomSheetContentContainer: {
        paddingBottom: 40,
    },

    headerSection: {
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },

    bottomSheetTitle: { fontSize: 20, marginBottom: 6, fontWeight: '600' },
    hotelNameBig: { fontSize: 20, fontWeight: 'bold', color: '#212529' },

    actionButtons: {
        flexDirection: 'row',
        marginBottom: 16,
        justifyContent: 'space-between',
    },

    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: '#0275d8',
        borderRadius: 8,
        marginHorizontal: 6,
    },
    actionBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
        marginLeft: 6,
    },

    ratingSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff3cd',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
    },
    ratingText: {
        fontSize: 13,
        color: '#856404',
        marginLeft: 10,
        fontWeight: '500',
    },

    infoSection: {
        flexDirection: 'row',
        marginBottom: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#f1f3f5',
        borderRadius: 8,
        alignItems: 'flex-start',
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 13,
        color: '#495057',
        flex: 1,
        lineHeight: 20,
    },

    descriptionSection: {
        marginBottom: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#e7f3ff',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#0275d8',
    },
    descriptionText: {
        fontSize: 14,
        color: '#495057',
        lineHeight: 22,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 8,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },

    sectionContainer: {
        marginBottom: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#0275d8',
    },

    sectionContent: {
        fontSize: 14,
        color: '#495057',
        lineHeight: 22,
        marginBottom: 8,
    },

    sectionSource: {
        fontSize: 12,
        color: '#6c757d',
        marginTop: 8,
        fontStyle: 'italic',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#dee2e6',
    },
});

