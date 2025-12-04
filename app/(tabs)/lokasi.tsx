import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import { onValue, ref, remove } from 'firebase/database';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, SectionList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { db } from "../firebase";
import { useAuth } from '../providers/AuthProvider';

// Palet Warna Modern/Material
const PRIMARY_COLOR = '#0284c7'; // Biru terang/Azure untuk aksi utama
const ACCENT_COLOR = '#f42727ff'; // Pink/Magenta untuk aksen sekunder
const SECONDARY_COLOR = '#333333'; // Abu-abu gelap untuk judul
const TEXT_MUTED_COLOR = '#7f8c8d'; // Abu-abu lembut untuk teks sekunder
const BACKGROUND_COLOR = '#f5f8fa'; // Latar belakang aplikasi yang sangat bersih
const CARD_COLOR = '#ffffff'; // Kartu putih
const BORDER_COLOR = '#e9eef2'; // Warna batas/garis pemisah yang sangat halus

export default function LokasiScreen() {
    const router = useRouter();
    const { role } = useAuth();
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fungsi helper untuk mendapatkan warna bintang
    const getStarColor = (stars) => {
        const starLevel = Math.floor(stars || 0);
        switch (starLevel) {
            case 5:
                return '#4CAF50'; // Hijau Material
            case 4:
                return '#FFEB3B'; // Kuning Material
            case 3:
                return '#FF9800'; // Oranye Material
            default:
                return PRIMARY_COLOR;
        }
    };
    
    // Fungsi helper untuk mendapatkan warna latar belakang header section berdasarkan bintang
    const getSectionHeaderColor = (stars) => {
        switch (stars) {
            case '5':
                return '#e8f5e9'; // Light Green
            case '4':
                return '#fffde7'; // Light Yellow
            case '3':
                return '#fff3e0'; // Light Orange
            default:
                return BORDER_COLOR;
        }
    };

    const getStarRating = (stars) => {
        const full = Math.floor(stars || 0);
        return '⭐'.repeat(Math.max(0, full));
    };

    useEffect(() => {
        const pointsRef = ref(db, 'points/');
        const unsubscribe = onValue(pointsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const pointsArray = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));

                const groups = pointsArray.reduce((acc, point) => {
                    const stars = Math.floor(point.bintang || 0);
                    const starKey = String(stars);
                    if (stars < 3) return acc;
                    
                    if (!acc[starKey]) {
                        acc[starKey] = [];
                    }
                    acc[starKey].push(point);
                    return acc;
                }, {});

                const sectionOrder = ['5', '4', '3'];
                
                const formattedData = sectionOrder
                    .filter(key => groups[key] && groups[key].length > 0)
                    .map(key => ({
                        title: `Hotel Bintang ${key}`,
                        starCount: key,
                        data: groups[key].sort((a, b) => a.name.localeCompare(b.name)) 
                    }));

                setSections(formattedData);
            } else {
                setSections([]);
            }
            setLoading(false);
        }, (error) => {
            console.error(error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    }, []);

    const handlePress = (coordinates) => {
        const [latitude, longitude] = coordinates.split(',').map(coord => coord.trim());
        // Menggunakan format yang lebih baku untuk Maps
        const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        Linking.openURL(url);
    };

    const handleDelete = (id) => {
        Alert.alert(
            "Hapus Lokasi",
            "Apakah Anda yakin ingin menghapus lokasi ini secara permanen?",
            [
                { text: "Batal", style: "cancel" },
                {
                    text: "Hapus",
                    onPress: () => remove(ref(db, `points/${id}`)),
                    style: "destructive"
                }
            ]
        );
    };

    const handleEdit = (item) => {
        router.push({
            pathname: "/formeditlocation",
            params: {
                id: item.id,
                name: item.name,
                coordinates: item.coordinates,
                accuration: item.accuration || '',
                bintang: item.bintang || ''
            }
        });
    };

    const renderItem = ({ item }) => (
        <View style={styles.itemContainer}>
            <TouchableOpacity 
                style={styles.itemTouchable} 
                onPress={() => handlePress(item.coordinates)}
                activeOpacity={0.8}
            >
                {/* Ikon penunjuk yang menawan */}
                <View style={[styles.itemIconWrapper, { backgroundColor: getStarColor(item.bintang || item.accuration) + '15', borderColor: getStarColor(item.bintang || item.accuration) }]}>
                    <FontAwesome5 name="hotel" size={20} color={getStarColor(item.bintang || item.accuration)} />
                </View>

                <View style={styles.itemContent}>
                    <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                    
                    {/* Display Bintang/Accuration as Star Rating */}
                    {(item.bintang || item.accuration) && (
                        <View style={styles.ratingContainer}>
                            <ThemedText style={[styles.itemText, { color: SECONDARY_COLOR, fontWeight: '700' }]}>
                                {getStarRating(item.bintang || item.accuration)}
                                <ThemedText style={{ color: TEXT_MUTED_COLOR, fontWeight: '500', fontSize: 13 }}> ({Math.floor(item.bintang || item.accuration)} Bintang)</ThemedText>
                            </ThemedText>
                        </View>
                    )}
                    
                    <View style={styles.coordinatesContainer}>
                        <FontAwesome5 name="map-marker-alt" size={12} color={PRIMARY_COLOR} style={{ marginRight: 6 }} />
                        <ThemedText style={styles.itemCoords}>{item.coordinates}</ThemedText>
                    </View>
                </View>
                
                <FontAwesome5 name="chevron-right" size={14} color={BORDER_COLOR} style={{ marginLeft: 10 }} />
            </TouchableOpacity>
            
            {role === 'admin' && (
                <View style={styles.actionsContainer}>
                    <TouchableOpacity 
                        onPress={() => handleEdit(item)} 
                        style={[styles.actionButton, styles.editButton]}
                        activeOpacity={0.8}
                    >
                        <FontAwesome5 name="pencil-alt" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => handleDelete(item.id)} 
                        style={[styles.actionButton, styles.deleteButton]}
                        activeOpacity={0.8}
                    >
                        <FontAwesome5 name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderSectionHeader = ({ section: { title, starCount } }) => (
        <View style={[styles.header, { backgroundColor: getSectionHeaderColor(starCount) }]}>
            <FontAwesome5 name="star" solid size={18} color={getStarColor(starCount)} />
            <ThemedText style={styles.headerText}>{title}</ThemedText>
        </View>
    );

    if (loading) {
        return (
            <ThemedView style={styles.centered}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                <ThemedText style={{ marginTop: 15, color: SECONDARY_COLOR }}>Memuat data lokasi...</ThemedText>
            </ThemedView>
        );
    }

    return (
        <View style={styles.container}>
            {sections.length > 0 ? (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_COLOR]} tintColor={PRIMARY_COLOR} />
                    }
                    contentContainerStyle={styles.listContentContainer}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <ThemedView style={styles.centered}>
                    <FontAwesome5 name="map-marked-alt" size={40} color={PRIMARY_COLOR} style={{ marginBottom: 10 }} />
                    <ThemedText style={styles.emptyText}>Ups! Tidak ada data lokasi tersimpan.</ThemedText>
                    {role === 'admin' && (
                        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/forminputlocation')}>
                            <FontAwesome5 name="plus-circle" size={16} color="#fff" style={{ marginRight: 8 }}/>
                            <ThemedText style={styles.addButtonText}>Tambah Lokasi Baru</ThemedText>
                        </TouchableOpacity>
                    )}
                </ThemedView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: BACKGROUND_COLOR,
        padding: 20,
    },
    listContentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 10,
    },
    emptyText: {
        fontSize: 16,
        color: SECONDARY_COLOR,
        fontWeight: '500',
        textAlign: 'center',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PRIMARY_COLOR,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    addButtonText: {
        color: CARD_COLOR,
        fontWeight: '700',
        fontSize: 14,
    },
    
    // --- Section Header ---
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderLeftWidth: 5,
        borderLeftColor: PRIMARY_COLOR,
        marginTop: 18,
        marginBottom: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    headerText: {
        fontSize: 18, 
        fontWeight: '700', 
        color: SECONDARY_COLOR,
        marginLeft: 10,
    },

    // --- Item Card (Lokasi) ---
    itemContainer: {
        backgroundColor: CARD_COLOR,
        borderRadius: 12, 
        marginVertical: 8, // Tambah margin vertikal
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
        overflow: 'hidden',
        borderWidth: 0, // Hapus border
    },
    itemIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
    },
    itemTouchable: {
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemContent: {
        flex: 1,
    },
    itemName: {
        fontSize: 17,
        fontWeight: '800', // Lebih Bold
        color: SECONDARY_COLOR,
        marginBottom: 4,
    },
    coordinatesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    itemCoords: {
        fontSize: 12,
        color: TEXT_MUTED_COLOR,
        fontStyle: 'italic',
    },
    itemText: {
        fontSize: 14,
        color: TEXT_MUTED_COLOR,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },

    // --- Admin Actions ---
    actionsContainer: {
        flexDirection: 'row',
        height: '100%',
    },
    actionButton: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 15,
        transitionDuration: '0.2s', // Tambahkan transisi (Catatan: hanya bekerja di web/beberapa platform tertentu)
    },
    editButton: {
        backgroundColor: '#FF9800', // Oranye Material
    },
    deleteButton: {
        backgroundColor: ACCENT_COLOR, // Pink Material
    }
});