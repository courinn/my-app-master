import { FontAwesome } from '@expo/vector-icons';
import * as Location from 'expo-location'; // Import yang diperlukan
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
    TextInput, // Import TextInput
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps'; // Import Circle
import { db } from "../firebase";
import { useAuth } from '../providers/AuthProvider';

type BaseMarker = { id: string; name: string; latitude: number; longitude: number };
type HotelInfo = { bintang?: number; alamat?: string; deskripsi?: string; website?: string | null; sections?: Array<{ title: string; content: string; source?: string | null }> };
// Perbarui MarkerItem untuk menyertakan jarak
type MarkerItem = BaseMarker & HotelInfo & { distance?: number };

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Palet warna yang diperbarui
const COLOR_PRIMARY = '#0284c7'; // Biru cerah untuk aksi utama
const COLOR_SECONDARY = '#6c757d'; // Abu-abu gelap untuk teks sekunder
const COLOR_BACKGROUND = '#f8f9fa'; // Latar belakang aplikasi yang sedikit abu-abu
const COLOR_CARD_BACKGROUND = '#ffffff'; // Latar belakang kartu putih
const COLOR_BORDER = '#dee2e6'; // Warna batas/garis pemisah

// Konstanta untuk fitur Lokasi
const INITIAL_SEARCH_RADIUS_KM = 5; // Radius pencarian default (dalam KM)

function getStarColor(stars?: number) {
    const starLevel = Math.floor(stars || 0);
    switch (starLevel) {
        case 3:
            return '#f0ad4e'; // Amber/Orange
        case 4:
            return '#ffc107'; // Yellow/Gold
        case 5:
            return '#28a745'; // Green (Premium)
        default:
            return COLOR_PRIMARY; // Biru default
    }
}

// ====================================================================
// FUNGSI UTILITY JARAK HAVERSINE (Tidak memerlukan library tambahan)
// ====================================================================

/**
 * Menghitung jarak antara dua koordinat GPS menggunakan formula Haversine.
 * @param lat1 Latitude titik 1
 * @param lon1 Longitude titik 1
 * @param lat2 Latitude titik 2
 * @param lon2 Longitude titik 2
 * @returns Jarak dalam Kilometer (km)
 */
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius bumi dalam km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Jarak dalam km
};

export default function MapScreen() {
    const [markers, setMarkers] = useState<MarkerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMarker, setSelectedMarker] = useState<MarkerItem | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | '3' | '4' | '5' | 'near'>('all'); 
    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const { role } = useAuth();

    // State baru untuk lokasi pengguna dan radius
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [searchRadius, setSearchRadius] = useState<number>(INITIAL_SEARCH_RADIUS_KM);
    const [locationLoading, setLocationLoading] = useState(false);
    
    // STATE BARU UNTUK PENCARIAN
    const [searchQuery, setSearchQuery] = useState<string>('');

    const mapRef = useRef<MapView>(null);
    const bottomSheetY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const panResponder = useRef<any>(null);

    const SHEET_OPEN_Y = SCREEN_HEIGHT * 0.0; 
    const SHEET_CLOSED_Y = SCREEN_HEIGHT; 

    // FUNGSI LOKASI PENGGUNA
    const getUserLocation = async () => {
        setLocationLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Izin Ditolak', 'Izin akses lokasi diperlukan untuk fitur hotel terdekat.');
                return;
            }

            let loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Medium,
            });
            
            const newLocation = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            };
            setUserLocation(newLocation);
            
            // Zoom ke lokasi pengguna
            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: newLocation.latitude,
                    longitude: newLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });
            }

            // Aktifkan tab terdekat secara otomatis
            setActiveTab('near');

        } catch (e) {
            console.error('Error getting location:', e);
            Alert.alert('Error', 'Gagal mendapatkan lokasi saat ini.');
        } finally {
            setLocationLoading(false);
        }
    };
    
    // useEffect untuk PanResponder (tetap sama)
    useEffect(() => {
        panResponder.current = PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (e, { dy }) => Math.abs(dy) > 8,
            onPanResponderMove: (e, { dy }) => {
                if (dy > 0) bottomSheetY.setValue(SHEET_OPEN_Y + dy);
                else bottomSheetY.setValue(Math.max(0, SHEET_OPEN_Y + dy));
            },
            onPanResponderRelease: (e, { dy, vy }) => {
                if (dy > 80 || vy > 0.8) closeBottomSheet();
                else openBottomSheet();
            },
        });
    }, []);

    // useEffect untuk Fetch Data (dengan perhitungan jarak)
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

                        const reviewsFromDb: Array<any> = point.reviews && typeof point.reviews === 'object' ? Object.keys(point.reviews).map(k => ({ id: k, ...point.reviews[k] })) : [];
                        const reviewSections = reviewsFromDb.map((r) => ({ title: `Ulasan: ${r.userName || 'Anon'} • ${r.rating || ''}⭐`, content: r.comment || '', source: r.createdAt || null }));
                        const mergedSections = Array.isArray(point.sections) ? [...point.sections, ...reviewSections] : reviewSections.length > 0 ? reviewSections : (point.sections || null);

                        let distance = undefined;
                        if (userLocation) {
                            distance = haversineDistance(
                                userLocation.latitude, userLocation.longitude,
                                latitude, longitude
                            );
                        }
                        
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
                            distance: distance, // Simpan jarak
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
    }, [userLocation]); // Rerun ketika userLocation berubah

    const groupedByStars = {
        3: markers.filter((m) => Math.floor(m.bintang || 0) === 3),
        4: markers.filter((m) => Math.floor(m.bintang || 0) === 4),
        5: markers.filter((m) => Math.floor(m.bintang || 0) === 5),
    };

    const openBottomSheet = () => {
        setShowBottomSheet(true);
        Animated.spring(bottomSheetY, { toValue: SHEET_OPEN_Y, useNativeDriver: false, tension: 30, friction: 8 }).start();
    };
    const closeBottomSheet = () => {
        Animated.timing(bottomSheetY, { toValue: SHEET_CLOSED_Y, duration: 300, useNativeDriver: false }).start(() => {
            setShowBottomSheet(false);
            setSelectedMarker(null);
        });
    };

    // ====================================================================
    // FUNGSI BARU: Langsung menuju lokasi hotel di peta
    // ====================================================================
    const goToHotelLocation = (marker: MarkerItem) => {
        if (mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: marker.latitude,
                longitude: marker.longitude,
                latitudeDelta: 0.02, // Zoom in sedikit
                longitudeDelta: 0.02,
            }, 500); // Durasi animasi 500ms
        }
    };

    const handleMarkerPress = (marker: MarkerItem) => {
        // Panggil fungsi untuk zoom ke lokasi hotel
        goToHotelLocation(marker); 
        
        // Atur marker terpilih dan buka bottom sheet
        setSelectedMarker(marker);
        openBottomSheet();
    };
    // ====================================================================

    const openInMaps = async () => {
        if (!selectedMarker) return;
        const { latitude, longitude } = selectedMarker;
        const mapsUrl = Platform.select({
            ios: `maps://?daddr=${latitude},${longitude}`,
            android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${selectedMarker.name})`
        }) || `http://maps.google.com/maps?q=${latitude},${longitude}`;
        
        try {
            const can = await Linking.canOpenURL(mapsUrl);
            if (can) await Linking.openURL(mapsUrl);
            else Alert.alert('Error', 'Tidak dapat membuka aplikasi peta.');
        } catch (err) {
            Alert.alert('Error', 'Terjadi kesalahan saat membuka peta.');
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

    // Fungsi untuk menyaring hotel terdekat (berdasarkan jarak dan radius)
    const getNearestHotels = (data: MarkerItem[]) => {
        if (!userLocation) return [];
        return data
            .filter(m => m.distance !== undefined && m.distance <= searchRadius)
            .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    };

    // LOGIKA FILTER UTAMA (MEMPERTIMBANGKAN SEARCH QUERY)
    // 1. Filter awal berdasarkan search query (mempengaruhi semua tab)
    const filteredBySearch = markers.filter(marker => 
        searchQuery.trim() === '' || 
        marker.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    // 2. Filter berdasarkan activeTab
    const currentFilteredHotels = (() => {
        if (activeTab === 'near') {
            return getNearestHotels(filteredBySearch);
        }
        
        const starFilter = (m: MarkerItem) => 
            activeTab === 'all' ? true : Math.floor(m.bintang || 0) === parseInt(activeTab, 10);
        
        return filteredBySearch.filter(starFilter);
    })();
    // ====================================================================


    const renderHotelCard = (item: MarkerItem) => (
        // Sekarang, menekan kartu akan memanggil handleMarkerPress, yang akan zoom dan membuka detail
        <TouchableOpacity style={styles.hotelCard} activeOpacity={0.8} onPress={() => handleMarkerPress(item)}>
            <View style={styles.hotelCardIcon}>
                <FontAwesome name="bed" size={20} color={getStarColor(item.bintang)} />
            </View>
            <View style={styles.hotelCardContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={styles.hotelName}>{item.name}</Text>
                </View>
                <Text style={styles.hotelAddress} numberOfLines={1}>
                    <FontAwesome name="map-marker" size={12} color={COLOR_SECONDARY} /> {item.alamat}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: getStarColor(item.bintang), fontSize: 13, fontWeight: '600' }}>
                        {renderStarRating(item.bintang)}
                        <Text style={{ color: COLOR_SECONDARY, fontWeight: '400', fontSize: 11 }}> ({Math.floor(item.bintang || 0)} bintang)</Text>
                    </Text>
                    {activeTab === 'near' && item.distance !== undefined && (
                        <Text style={styles.distanceText}>
                            {item.distance < 1 ? `${(item.distance * 1000).toFixed(0)} m` : `${item.distance.toFixed(1)} km`}
                        </Text>
                    )}
                </View>
            </View>
            
            {/* Tombol 'Go to Location' (Menggantikan chevron) */}
            {/* Chevron digunakan sebagai ikon Go-To Location, yang dipanggil oleh onPress utama */}
            <FontAwesome name="arrow-circle-right" size={24} color={COLOR_PRIMARY} /> 

        </TouchableOpacity>
    );

    const renderStarSection = (stars: number, list: MarkerItem[]) => (
        <View style={styles.starSection}>
            <View style={[styles.starHeader, { borderLeftColor: getStarColor(stars) }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={styles.starHeaderText}>
                        <Text style={{ color: getStarColor(stars) }}>{renderStarRating(stars)}</Text> Hotel Bintang {stars}
                    </Text>
                </View>
                <View style={[styles.starBadge, { backgroundColor: getStarColor(stars) }]}>
                    <Text style={styles.starCount}>{list.length}</Text>
                </View>
            </View>
            {list.length > 0 ? (
                <FlatList
                    data={list}
                    scrollEnabled={false}
                    renderItem={({ item }) => renderHotelCard(item)}
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
                    {/* Header Section with Star Rating and Name */}
                    <View style={styles.headerSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={[styles.bottomSheetTitle, { color: getStarColor(selectedMarker.bintang), fontSize: 24 }]}>
                                {renderStarRating(selectedMarker.bintang)}
                            </Text>
                            <Text style={{ marginLeft: 8, fontSize: 14, color: COLOR_SECONDARY }}>
                                ({Math.floor(selectedMarker.bintang || 0)} bintang)
                            </Text>
                        </View>
                        <Text style={styles.hotelNameBig}>{selectedMarker.name}</Text>
                        {selectedMarker.distance !== undefined && (
                            <Text style={{ color: COLOR_SECONDARY, fontSize: 16, marginTop: 4 }}>
                                Jarak dari Anda: <Text style={{ fontWeight: 'bold', color: COLOR_PRIMARY }}>{selectedMarker.distance < 1 ? `${(selectedMarker.distance * 1000).toFixed(0)} m` : `${selectedMarker.distance.toFixed(1)} km`}</Text>
                            </Text>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLOR_PRIMARY }]} activeOpacity={0.8} onPress={openInMaps}>
                            <FontAwesome name="location-arrow" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Arah</Text>
                        </TouchableOpacity>

                        {selectedMarker.website && (
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ffc107' }]} activeOpacity={0.8} onPress={openWebsite}>
                                <FontAwesome name="globe" size={18} color="#fff" />
                                <Text style={styles.actionBtnText}>Website</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#dc3545' }]} activeOpacity={0.8} onPress={closeBottomSheet}>
                            <FontAwesome name="close" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Tutup</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 1, backgroundColor: COLOR_BORDER, marginVertical: 16 }} />

                    {/* General Information Sections */}
                    {selectedMarker.alamat && (
                        <View style={[styles.infoSection, { borderLeftColor: COLOR_PRIMARY }]}>
                            <FontAwesome name="map-marker" size={16} color={COLOR_PRIMARY} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.infoLabel}>📍 Alamat</Text>
                                <Text style={styles.infoText}>{selectedMarker.alamat}</Text>
                            </View>
                        </View>
                    )}

                    <View style={[styles.infoSection, { borderLeftColor: '#28a745' }]}>
                        <FontAwesome name="location-arrow" size={16} color="#28a745" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.infoLabel}>📌 Koordinat</Text>
                            <Text style={styles.infoText}>{selectedMarker.latitude.toFixed(6)}, {selectedMarker.longitude.toFixed(6)}</Text>
                        </View>
                    </View>

                    {selectedMarker.website && (
                        <View style={[styles.infoSection, { borderLeftColor: '#6f42c1' }]}>
                            <FontAwesome name="globe" size={16} color="#6f42c1" />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.infoLabel}>🌐 Website</Text>
                                <TouchableOpacity onPress={openWebsite}>
                                    <Text style={[styles.infoText, { color: COLOR_PRIMARY, textDecorationLine: 'underline', fontWeight: '500' }]}>{selectedMarker.website}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Description Section */}
                    {selectedMarker.deskripsi && (
                        <View style={styles.descriptionSection}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                <FontAwesome name="info-circle" size={16} color={COLOR_PRIMARY} />
                                <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>Deskripsi Singkat</Text>
                            </View>
                            <Text style={styles.descriptionText}>{selectedMarker.deskripsi}</Text>
                        </View>
                    )}

                    {/* Detailed Sections (Reviews/Info) */}
                    {selectedMarker.sections && selectedMarker.sections.length > 0 && (
                        <View style={{ marginTop: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <FontAwesome name="list-alt" size={18} color={COLOR_PRIMARY} />
                                <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>Informasi & Ulasan</Text>
                            </View>
                            {selectedMarker.sections.map((section, index) => (
                                <View key={index} style={styles.sectionContainer}>
                                    <View style={styles.sectionHeader}>
                                        <FontAwesome name="tag" size={14} color={COLOR_PRIMARY} />
                                        <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 6 }]}>{section.title}</Text>
                                    </View>
                                    <Text style={styles.sectionContent}>{section.content}</Text>
                                    {section.source && <Text style={styles.sectionSource}>📅 Tanggal/Sumber: {section.source}</Text>}
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </>
            ) : (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Text style={{ color: COLOR_SECONDARY, fontSize: 14 }}>Informasi hotel tidak tersedia.</Text>
                </View>
            )}
        </ScrollView>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLOR_PRIMARY} />
                <Text style={{ marginTop: 10, color: COLOR_SECONDARY }}>Memuat data peta...</Text>
            </View>
        );
    }

    // Mendapatkan total hotel yang difilter oleh tab aktif
    const totalFilteredHotels = currentFilteredHotels.length;

    return (
        <View style={styles.container}>
            
            {/* ======================================================= */}
            {/* INPUT PENCARIAN NAMA HOTEL (Modern Floating Design) */}
            {/* ======================================================= */}
            <View style={styles.searchContainerOverlay}>
                <View style={styles.searchBox}>
                    <FontAwesome name="search" size={18} color={COLOR_SECONDARY} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Cari hotel berdasarkan nama..."
                        placeholderTextColor={COLOR_SECONDARY}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery('')}>
                            <FontAwesome name="close" size={16} color={COLOR_SECONDARY} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {/* ======================================================= */}


            {/* Map View */}
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{ latitude: -7.7956, longitude: 110.3695, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }}
                zoomControlEnabled={true}
            >
                {/* Marker Lokasi Pengguna (Jika ada) */}
                {userLocation && (
                    <>
                        <Marker
                            coordinate={userLocation}
                            title="Lokasi Saya"
                            pinColor="#1e90ff" // Warna biru terang untuk lokasi pengguna
                        >
                            <View style={styles.userMarker}>
                                <FontAwesome name="crosshairs" size={18} color="#fff" />
                            </View>
                        </Marker>
                        {/* Buffer Lingkaran */}
                        <Circle
                            center={userLocation}
                            radius={searchRadius * 1000} // radius dalam meter
                            fillColor="rgba(30, 144, 255, 0.1)"
                            strokeColor="rgba(30, 144, 255, 0.5)"
                            strokeWidth={2}
                        />
                    </>
                )}
                
                {/* Markers Hotel */}
                {currentFilteredHotels.map((marker) => (
                    <Marker 
                        key={marker.id} 
                        coordinate={{ latitude: marker.latitude, longitude: marker.longitude }} 
                        title={marker.name} 
                        pinColor={getStarColor(marker.bintang)} 
                        onPress={() => handleMarkerPress(marker)} 
                    />
                ))}
            </MapView>
            
            {/* Floating Action Button (FAB) for Admin */}
            {role === 'admin' && (
                <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => router.push('/forminputlocation')}>
                    <FontAwesome name="plus" size={24} color="white" />
                </TouchableOpacity>
            )}

            {/* Tombol Akses Lokasi Pengguna (FAB kedua, di atas tab) */}
            <TouchableOpacity 
                style={[styles.locationFab, locationLoading && { opacity: 0.6 }]} 
                activeOpacity={0.9} 
                onPress={getUserLocation}
                disabled={locationLoading}
            >
                {locationLoading ? (
                    <ActivityIndicator size="small" color="white" />
                ) : (
                    <FontAwesome name="location-arrow" size={24} color="white" />
                )}
            </TouchableOpacity>

            {/* Tab Filter for Star Ratings */}
            <View style={styles.tabContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
                    
                    {/* Tab Lokasi Terdekat */}
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'near' && styles.tabActive]} 
                        activeOpacity={0.8} 
                        onPress={() => setActiveTab('near')}
                    >
                        <Text style={[styles.tabText, activeTab === 'near' && styles.tabTextActive]}>
                            {userLocation ? 'Terdekat' : 'Cari Terdekat'} ({activeTab === 'near' ? getNearestHotels(filteredBySearch).length : 0})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.tab, activeTab === 'all' && styles.tabActive]} activeOpacity={0.8} onPress={() => setActiveTab('all')}>
                        <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>Semua ({filteredBySearch.length})</Text>
                    </TouchableOpacity>
                    
                    {[3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} style={[styles.tab, activeTab === String(star) && styles.tabActive]} activeOpacity={0.8} onPress={() => setActiveTab(String(star) as any)}>
                            <Text style={[styles.tabText, activeTab === String(star) && styles.tabTextActive]}>
                                <Text style={{ color: activeTab !== String(star) ? getStarColor(star) : '#fff', fontWeight: 'bold' }}>{renderStarRating(star)}</Text> ({filteredBySearch.filter(m => Math.floor(m.bintang || 0) === star).length})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Hotel List Section */}
            <View style={styles.listContainer}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    
                    {/* Menampilkan pesan jika tidak ada hasil pencarian */}
                    {searchQuery.length > 0 && currentFilteredHotels.length === 0 && (
                        <Text style={[styles.emptyText, { backgroundColor: '#fcd34d30', color: '#f59e0b' }]}>
                            Tidak ditemukan hotel dengan nama **"{searchQuery}"** pada filter aktif.
                        </Text>
                    )}

                    {activeTab === 'near' && userLocation && (
                        <View style={{ paddingVertical: 10 }}>
                            <Text style={[styles.starHeaderText, { borderLeftWidth: 0, paddingHorizontal: 0 }]}>
                                Hotel Terdekat (dalam radius {searchRadius} km):
                            </Text>
                            {totalFilteredHotels > 0 ? (
                                <FlatList
                                    data={currentFilteredHotels}
                                    scrollEnabled={false}
                                    renderItem={({ item }) => renderHotelCard(item)}
                                    keyExtractor={(item) => item.id}
                                />
                            ) : (
                                searchQuery.length === 0 && (
                                    <Text style={styles.emptyText}>Tidak ada hotel dalam radius {searchRadius} km.</Text>
                                )
                            )}
                        </View>
                    )}

                    {activeTab === 'near' && !userLocation && !locationLoading && searchQuery.length === 0 && (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                            <Text style={[styles.emptyText, { backgroundColor: '#ffe0b2' }]}>
                                Tekan tombol 🎯 di atas untuk mengaktifkan pencarian hotel terdekat.
                            </Text>
                        </View>
                    )}

                    {activeTab === 'all' ? (
                        <>
                            {renderStarSection(5, filteredBySearch.filter(m => Math.floor(m.bintang || 0) === 5))}
                            {renderStarSection(4, filteredBySearch.filter(m => Math.floor(m.bintang || 0) === 4))}
                            {renderStarSection(3, filteredBySearch.filter(m => Math.floor(m.bintang || 0) === 3))}
                        </>
                    ) : (
                        activeTab !== 'near' && (
                            <View style={{ paddingVertical: 10 }}>
                                <Text style={[styles.starHeaderText, { borderLeftWidth: 0, paddingHorizontal: 0 }]}>
                                    Hotel Bintang {activeTab}
                                </Text>
                                {totalFilteredHotels > 0 ? (
                                    <FlatList
                                        data={currentFilteredHotels}
                                        scrollEnabled={false}
                                        renderItem={({ item }) => renderHotelCard(item)}
                                        keyExtractor={(item) => item.id}
                                    />
                                ) : (
                                    searchQuery.length === 0 && (
                                        <Text style={styles.emptyText}>Tidak ada hotel di kategori ini.</Text>
                                    )
                                )}
                            </View>
                        )
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>

            {/* Bottom Sheet Modal (Interactive Detail) */}
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
    container: { flex: 1, backgroundColor: COLOR_BACKGROUND },
    map: { width: '100%', height: '45%' }, 

    // =======================================================
    // STYLE PENCARIAN BARU (Lebih menarik/modern/interaktif)
    // =======================================================
    searchContainerOverlay: {
        position: 'absolute',
        top: 10,
        width: '100%',
        zIndex: 20, // Di atas MapView
        alignItems: 'center',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        backgroundColor: COLOR_CARD_BACKGROUND,
        borderRadius: 25, // Sudut membulat
        height: 50,
        marginHorizontal: 15, // Jarak dari tepi
        elevation: 6, // Shadow Android
        shadowColor: '#000', // Shadow iOS
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: '#eee',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: '#212529',
    },
    clearSearchButton: {
        padding: 5,
        marginLeft: 10,
    },
    // =======================================================


    // Marker Lokasi Pengguna
    userMarker: {
        backgroundColor: '#1e90ff',
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
    },
    
    // --- FAB (Floating Action Button) ---
    fab: {
        position: 'absolute',
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        // Disesuaikan agar tidak bertabrakan dengan search input
        bottom: 240, 
        backgroundColor: COLOR_PRIMARY,
        borderRadius: 25, 
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 10,
    },
    locationFab: {
        position: 'absolute',
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        // Disesuaikan agar tidak bertabrakan dengan search input
        bottom: 180, 
        backgroundColor: '#38bdf8', 
        borderRadius: 25, 
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 10,
    },

    // --- Tabs ---
    tabContainer: {
        height: 60,
        backgroundColor: COLOR_CARD_BACKGROUND,
        borderBottomWidth: 1,
        borderTopWidth: 1,
        borderBottomColor: COLOR_BORDER,
        borderTopColor: COLOR_BORDER,
        elevation: 2, 
    },
    tabContent: { paddingHorizontal: 10, paddingVertical: 10, alignItems: 'center' },
    tab: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        marginHorizontal: 4,
        borderRadius: 20,
        backgroundColor: COLOR_BACKGROUND,
        borderWidth: 1,
        borderColor: COLOR_BORDER,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabActive: { backgroundColor: COLOR_PRIMARY, borderColor: COLOR_PRIMARY },
    tabText: { fontSize: 14, fontWeight: '600', color: COLOR_SECONDARY },
    tabTextActive: { color: '#fff' },

    // --- List Container & Star Section ---
    listContainer: { flex: 1, backgroundColor: COLOR_BACKGROUND, paddingHorizontal: 15, paddingTop: 5 },

    starSection: { marginVertical: 8 },
    starHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: '#e9f2fb', 
        borderRadius: 10,
        marginBottom: 8,
        borderLeftWidth: 5,
        borderLeftColor: COLOR_PRIMARY,
    },
    starHeaderText: { fontSize: 16, fontWeight: '700', color: '#212529', flex: 1 },
    starBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
    starCount: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    // --- Hotel Card ---
    hotelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        marginVertical: 6,
        backgroundColor: COLOR_CARD_BACKGROUND,
        borderRadius: 10,
        borderWidth: 0, 
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    hotelCardIcon: { marginRight: 15, alignItems: 'center', justifyContent: 'center' },
    hotelCardContent: { flex: 1, marginRight: 10 },
    hotelName: { fontSize: 15, fontWeight: '700', color: '#212529', flex: 1 },
    hotelAddress: { fontSize: 12, color: COLOR_SECONDARY, marginBottom: 4, flexDirection: 'row', alignItems: 'center' },
    distanceText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: COLOR_PRIMARY,
    },

    emptyText: {
        fontSize: 14,
        color: COLOR_SECONDARY,
        textAlign: 'center',
        paddingVertical: 20,
        backgroundColor: COLOR_CARD_BACKGROUND,
        borderRadius: 8,
    },

    // --- Overlay & Bottom Sheet ---
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', 
        zIndex: 999,
    },
    overlayTouch: { flex: 1 },

    bottomSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: SCREEN_HEIGHT,
        maxHeight: SCREEN_HEIGHT * 0.5,
        backgroundColor: COLOR_CARD_BACKGROUND,
        borderTopLeftRadius: 25, 
        borderTopRightRadius: 25,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        paddingTop: 10,
    },

    handle: {
        width: 50, 
        height: 4,
        backgroundColor: '#ccc',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 5,
        marginBottom: 15,
    },

    bottomSheetInner: {
        paddingHorizontal: 20,
    },

    bottomSheetContentContainer: {
        paddingBottom: 60, 
    },

    // --- Detail Content (Bottom Sheet) ---
    headerSection: {
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLOR_BORDER,
    },

    bottomSheetTitle: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
    hotelNameBig: { fontSize: 28, fontWeight: 'bold', color: '#212529' },

    actionButtons: {
        flexDirection: 'row',
        marginBottom: 16,
        justifyContent: 'space-between',
        marginHorizontal: -6, 
    },

    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        marginHorizontal: 6,
    },
    actionBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
        marginLeft: 8,
    },

    // Info Sections (Address, Coords, Website)
    infoSection: {
        flexDirection: 'row',
        marginBottom: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: COLOR_BACKGROUND,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: COLOR_PRIMARY,
        alignItems: 'flex-start',
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 14,
        color: '#495057',
        flex: 1,
        lineHeight: 20,
    },

    // Description Section
    descriptionSection: {
        marginBottom: 16,
        paddingHorizontal: 15,
        paddingVertical: 15,
        backgroundColor: '#e7f3ff', 
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: COLOR_PRIMARY,
    },
    descriptionText: {
        fontSize: 14,
        color: '#495057',
        lineHeight: 22,
    },

    // Section Detail (Reviews, etc)
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#212529',
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },

    sectionContainer: {
        marginBottom: 12,
        paddingHorizontal: 15,
        paddingVertical: 15,
        backgroundColor: COLOR_CARD_BACKGROUND,
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#ffc107', 
        borderWidth: 1,
        borderColor: COLOR_BORDER,
    },

    sectionContent: {
        fontSize: 14,
        color: '#495057',
        lineHeight: 22,
        marginBottom: 8,
    },

    sectionSource: {
        fontSize: 12,
        color: COLOR_SECONDARY,
        marginTop: 8,
        fontStyle: 'italic',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#dee2e6',
    },
});