import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import { onValue, ref, remove } from 'firebase/database';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, SectionList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { db } from "../firebase";
import { useAuth } from '../providers/AuthProvider';

export default function LokasiScreen() {
    const router = useRouter();
    const { role } = useAuth();
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const pointsRef = ref(db, 'points/');
        const unsubscribe = onValue(pointsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const pointsArray = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));

                // Group points by bintang (star rating)
                const groups = pointsArray.reduce((acc, point) => {
                    const stars = Math.floor(point.bintang || 0);
                    const starKey = String(stars);
                    if (!acc[starKey]) {
                        acc[starKey] = [];
                    }
                    acc[starKey].push(point);
                    return acc;
                }, {});

                // Define the order and titles for sections based on star rating
                const sectionOrder = ['5', '4', '3'];
                const sectionTitles = {
                    '5': '⭐⭐⭐⭐⭐ Hotel Bintang 5',
                    '4': '⭐⭐⭐⭐ Hotel Bintang 4',
                    '3': '⭐⭐⭐ Hotel Bintang 3',
                };

                const formattedData = sectionOrder
                    .filter(key => groups[key] && groups[key].length > 0)
                    .map(key => ({
                        title: sectionTitles[key] || `Bintang ${key}`,
                        data: groups[key].sort((a, b) => a.name.localeCompare(b.name)) // Sort locations alphabetically
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
        // In a real app, you'd re-fetch data here.
        // For this example, we'll just simulate a network request.
        setTimeout(() => {
            // This is where you might re-trigger the Firebase listener if needed,
            // but onValue usually handles live updates automatically.
            setRefreshing(false);
        }, 1000);
    }, []);

    const handlePress = (coordinates) => {
        const [latitude, longitude] = coordinates.split(',').map(coord => coord.trim());
        const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        Linking.openURL(url);
    };

    const handleDelete = (id) => {
        Alert.alert(
            "Hapus Lokasi",
            "Apakah Anda yakin ingin menghapus lokasi ini?",
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
            <TouchableOpacity style={styles.itemTouchable} onPress={() => handlePress(item.coordinates)}>
                <View style={styles.itemContent}>
                    <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                    <View style={styles.coordinatesContainer}>
                        <FontAwesome5 name="map-marker-alt" size={14} color="#3498db" />
                        <ThemedText style={styles.itemText}>{item.coordinates}</ThemedText>
                    </View>
                    {item.accuration && !isNaN(item.accuration) && (
                        <View style={styles.ratingContainer}>
                            {[...Array(parseInt(item.accuration, 10))].map((_, i) => (
                                <FontAwesome5 key={i} name="star" solid size={14} color="#FFD700" style={{ marginRight: 2 }} />
                            ))}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
            {role === 'admin' && (
                <View style={styles.actionsContainer}>
                    <TouchableOpacity onPress={() => handleEdit(item)} style={[styles.actionButton, styles.editButton]}>
                        <FontAwesome5 name="pencil-alt" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionButton, styles.deleteButton]}>
                        <FontAwesome5 name="trash" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderSectionHeader = ({ section: { title } }) => (
        <View style={styles.header}>
            <FontAwesome5 name="hotel" size={20} color="#2c3e50" />
            <ThemedText style={styles.headerText}>{title}</ThemedText>
        </View>
    );

    if (loading) {
        return (
            <ThemedView style={styles.centered}>
                <ActivityIndicator size="large" color="#3498db" />
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
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3498db"]} tintColor={"#3498db"} />
                    }
                    contentContainerStyle={styles.listContentContainer}
                />
            ) : (
                <ThemedView style={styles.centered}>
                    <ThemedText>Tidak ada data lokasi tersimpan.</ThemedText>
                </ThemedView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f7',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f4f7',
    },
    listContentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: 'transparent',
        borderBottomWidth: 2,
        borderBottomColor: '#e0e0e0',
        marginTop: 16,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginLeft: 10,
    },
    itemContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        marginVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    itemTouchable: {
        flex: 1,
        padding: 16,
    },
    itemContent: {
        flex: 1,
    },
    itemName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#34495e',
        marginBottom: 6,
    },
    coordinatesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemText: {
        fontSize: 14,
        color: '#7f8c8d',
        marginLeft: 8,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    actionsContainer: {
        flexDirection: 'row',
        height: '100%',
    },
    actionButton: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 18,
    },
    editButton: {
        backgroundColor: '#f39c12',
    },
    deleteButton: {
        backgroundColor: '#e74c3c',
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
    }
});
