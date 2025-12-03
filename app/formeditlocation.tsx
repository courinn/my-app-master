import * as Location from 'expo-location';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { get, onValue, ref, update } from 'firebase/database';
import * as React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { db } from './firebase';

type Section = { title: string; content: string; source: string | null };

const STAR_OPTIONS = [
    { label: '⭐', value: 1 },
    { label: '⭐⭐', value: 2 },
    { label: '⭐⭐⭐', value: 3 },
    { label: '⭐⭐⭐⭐', value: 4 },
    { label: '⭐⭐⭐⭐⭐', value: 5 },
];

const FormEditLocation = () => {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { id } = params; // Hanya perlu ID untuk fetch data awal

    // State untuk data formulir
    const [name, setName] = React.useState<string>('');
    const [coordinates, setCoordinates] = React.useState<string>('');
    const [accuration, setAccuration] = React.useState<string>('');
    const [bintang, setBintang] = React.useState<string>('3'); // Default ke 3 bintang
    const [alamat, setAlamat] = React.useState<string>('');
    const [deskripsi, setDeskripsi] = React.useState<string>('');
    const [website, setWebsite] = React.useState<string>('');
    const [sections, setSections] = React.useState<Section[]>([]);
    
    // State UI/UX
    const [fetching, setFetching] = React.useState<boolean>(true); // Mulai fetching
    const [isDirty, setIsDirty] = React.useState<boolean>(false);
    const isDirtyRef = React.useRef<boolean>(false);
    const [newSectionTitle, setNewSectionTitle] = React.useState('');
    const [newSectionContent, setNewSectionContent] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [showStarDropdown, setShowStarDropdown] = React.useState(false); // Dihapus, tapi dipertahankan jika Anda ingin menggunakannya lagi

    // Helper untuk menandai form berubah
    const handleChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
        setter(value);
        setIsDirty(true);
        isDirtyRef.current = true;
    };

    const getCoordinates = async () => {
        setLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Izin Ditolak', 'Izin akses lokasi ditolak');
            setLoading(false);
            return;
        }
        try {
            let loc = await Location.getCurrentPositionAsync({});
            const coords = `${loc.coords.latitude.toFixed(6)},${loc.coords.longitude.toFixed(6)}`;
            setCoordinates(coords);
            setAccuration(`${loc.coords.accuracy ? loc.coords.accuracy.toFixed(2) : '?'} m`);
            setIsDirty(true);
            isDirtyRef.current = true;
        } catch (e) {
            Alert.alert('Error Lokasi', 'Gagal mendapatkan lokasi saat ini.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch data awal dan real-time listener
    React.useEffect(() => {
        let mounted = true;
        
        // Fungsi untuk mengambil data dan mengupdate state lokal
        const updateLocalState = (p: any) => {
            if (!mounted) return;
            
            setName(p.name || '');
            let coords = '';
            if (typeof p.coordinates === 'string') coords = p.coordinates;
            else if (Array.isArray(p.coordinates) && p.coordinates.length >= 2) coords = `${p.coordinates[0]},${p.coordinates[1]}`;
            else if (typeof p.koordinat === 'string') coords = p.koordinat;
            else if (p.latitude && p.longitude) coords = `${p.latitude},${p.longitude}`;
            setCoordinates(coords || '');
            setAccuration(p.accuration || p.accuracy || '');
            // Pastikan bintang adalah string numerik
            setBintang(p.bintang !== undefined && p.bintang !== null ? String(p.bintang) : '3'); 
            setAlamat(p.alamat || '');
            setDeskripsi(p.deskripsi || '');
            setWebsite(p.website || '');
            setSections(Array.isArray(p.sections) ? p.sections : []);
        };

        const fetchData = async () => {
            if (!id) return;
            setFetching(true);
            try {
                const snap = await get(ref(db, `points/${id}`));
                if (!mounted) return;
                if (snap.exists()) {
                    updateLocalState(snap.val());
                } else {
                    Alert.alert('Data tidak ditemukan', 'Data hotel tidak ditemukan di database.');
                }
            } catch (err) {
                console.error('fetch point error', err);
                Alert.alert('Error', 'Gagal memuat data hotel dari database.');
            } finally {
                if (mounted) setFetching(false);
            }
        };

        fetchData();

        // Real-time listener (hanya untuk debugging atau jika diperlukan)
        const pointRef = ref(db, `points/${id}`);
        const unsubscribe = onValue(pointRef, (snap) => {
            if (!mounted || fetching) return; // Jangan update jika sedang fetching awal
            if (!snap || !snap.exists()) return;
            if (!isDirtyRef.current) {
                updateLocalState(snap.val());
            } 
        }, (err) => console.error('onValue error', err));

        return () => { mounted = false; unsubscribe(); };
    }, [id]);

    React.useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

    const addSection = () => {
        if (!newSectionTitle.trim() || !newSectionContent.trim()) {
            Alert.alert('Error', 'Judul dan konten section tidak boleh kosong');
            return;
        }
        setSections([...sections, { title: newSectionTitle, content: newSectionContent, source: null }]);
        setIsDirty(true);
        isDirtyRef.current = true;
        setNewSectionTitle('');
        setNewSectionContent('');
    };

    const removeSection = (index: number) => {
        setSections(sections.filter((_, i) => i !== index));
        setIsDirty(true);
        isDirtyRef.current = true;
    };

    const handleUpdate = async () => {
        if (!name.trim() || !coordinates.trim() || !bintang.trim()) {
            Alert.alert('Error', 'Nama, koordinat, dan bintang tidak boleh kosong');
            return;
        }
        if (isNaN(parseInt(bintang)) || parseInt(bintang) < 1 || parseInt(bintang) > 5) {
            Alert.alert('Error', 'Nilai bintang harus angka antara 1 sampai 5');
            return;
        }

        setLoading(true);
        try {
            const updateData: any = {
                name,
                coordinates,
                accuration,
                bintang: parseInt(bintang),
                alamat,
                deskripsi,
                website: website || null,
                sections: sections.length > 0 ? sections : null, // Set null jika array kosong
            };

            const pointRef = ref(db, `points/${id}`);
            await update(pointRef, updateData);

            Alert.alert('Sukses', 'Hotel berhasil diperbarui', [
                { text: 'OK', onPress: () => router.back() }
            ]);
            // mark as saved
            setIsDirty(false);
            isDirtyRef.current = false;
        } catch (e) {
            console.error('Error:', e);
            Alert.alert('Error', 'Gagal memperbarui data');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <SafeAreaProvider style={styles.safeArea}>
                <SafeAreaView style={[styles.container, styles.center]}>
                    <Text style={styles.loadingText}>Memuat data hotel...</Text>
                    <ActivityIndicator size="large" color="#0ea5e9" />
                </SafeAreaView>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider style={styles.safeArea}>
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: 'Edit Hotel' }} />
                <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Header Judul Hotel */}
                    <View style={styles.headerTitleCard}>
                        <Text style={styles.headerHotelName} numberOfLines={1}>
                            {name || 'Nama Hotel Tidak Ditemukan'}
                        </Text>
                        <Text style={styles.headerHotelID}>ID: {id}</Text>
                        <View style={styles.saveStatusContainer}>
                            <Text style={isDirty ? styles.statusDirty : styles.statusClean}>
                                {isDirty ? '⚠️ Ada Perubahan' : '✓ Tersimpan'}
                            </Text>
                        </View>
                    </View>
                    
                    {/* ---------------------------------- */}
                    {/* GROUP: Informasi Dasar & Lokasi */}
                    {/* ---------------------------------- */}
                    <View style={styles.card}>
                        <Text style={styles.sectionHeader}>Informasi Dasar & Lokasi 📍</Text>
                        
                        <Text style={styles.label}>Nama Hotel *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nama hotel"
                            value={name}
                            onChangeText={(v) => handleChange(setName, v)}
                            editable={!loading}
                        />

                        <Text style={styles.label}>Koordinat (Lat,Lng) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Contoh: -7.797,110.370"
                            value={coordinates}
                            onChangeText={(v) => handleChange(setCoordinates, v)}
                            editable={!loading}
                        />
                         <Text style={styles.inputHint}>Akurasi: {accuration || '?'}</Text>
                        
                        <TouchableOpacity 
                            style={[styles.btnLocation, loading && { opacity: 0.6 }]} 
                            onPress={getCoordinates} 
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.btnLocationText}>Dapatkan Lokasi Saat Ini 🌍</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ---------------------------------- */}
                    {/* GROUP: Detail Hotel & Deskripsi */}
                    {/* ---------------------------------- */}
                    <View style={styles.card}>
                        <Text style={styles.sectionHeader}>Detail Hotel & Deskripsi 🏨</Text>

                        <Text style={styles.label}>Bintang *</Text>
                        <View style={styles.starSelectorContainer}>
                            {STAR_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={styles.starItem}
                                    onPress={() => handleChange(setBintang, String(option.value))}
                                    disabled={loading}
                                >
                                    <Text style={[
                                        styles.starIcon, 
                                        parseInt(bintang) >= option.value ? styles.starIconActive : styles.starIconInactive
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <Text style={styles.label}>Alamat</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            placeholder="Alamat lengkap hotel"
                            value={alamat}
                            onChangeText={(v) => handleChange(setAlamat, v)}
                            multiline
                            editable={!loading}
                            textAlignVertical='top'
                        />

                        <Text style={styles.label}>Deskripsi Singkat</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline, { minHeight: 100 }]}
                            placeholder="Deskripsi singkat tentang hotel"
                            value={deskripsi}
                            onChangeText={(v) => handleChange(setDeskripsi, v)}
                            multiline
                            editable={!loading}
                            textAlignVertical='top'
                        />

                        <Text style={styles.label}>Website (URL)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Contoh: https://hotelname.com"
                            value={website}
                            onChangeText={(v) => handleChange(setWebsite, v)}
                            editable={!loading}
                        />
                    </View>

                    {/* ---------------------------------- */}
                    {/* GROUP: Tambah/Edit Sections */}
                    {/* ---------------------------------- */}
                    <View style={styles.card}>
                        <Text style={styles.sectionHeader}>Sections Tambahan 📑</Text>
                        
                        {/* Existing Sections */}
                        {sections.map((section, index) => (
                            <View key={index} style={styles.existingSectionBox}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionBoxTitle}>Section #{index + 1}: {section.title}</Text>
                                    <TouchableOpacity 
                                        onPress={() => removeSection(index)} 
                                        disabled={loading}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.removeBtn}>❌ Hapus</Text>
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    style={[styles.input, styles.sectionInput]}
                                    value={section.title}
                                    onChangeText={(v) => {
                                        const next = sections.slice();
                                        next[index] = { ...next[index], title: v };
                                        setSections(next);
                                        setIsDirty(true);
                                        isDirtyRef.current = true;
                                    }}
                                    placeholder="Judul Section"
                                    editable={!loading}
                                />
                                <TextInput
                                    style={[styles.input, styles.sectionInput, styles.inputMultiline]}
                                    value={section.content}
                                    onChangeText={(v) => {
                                        const next = sections.slice();
                                        next[index] = { ...next[index], content: v };
                                        setSections(next);
                                        setIsDirty(true);
                                        isDirtyRef.current = true;
                                    }}
                                    placeholder="Konten Section"
                                    multiline
                                    editable={!loading}
                                    textAlignVertical='top'
                                />
                                <TextInput
                                    style={[styles.input, styles.sectionInput]}
                                    value={section.source || ''}
                                    placeholder="Sumber (optional)"
                                    onChangeText={(v) => {
                                        const next = sections.slice();
                                        next[index] = { ...next[index], source: v || null };
                                        setSections(next);
                                        setIsDirty(true);
                                        isDirtyRef.current = true;
                                    }}
                                    editable={!loading}
                                />
                            </View>
                        ))}

                        {/* New Section Input */}
                        <Text style={[styles.sectionHeader, { marginTop: 15 }]}>Tambah Section Baru</Text>
                        <Text style={styles.label}>Judul Section Baru</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Contoh: Fasilitas dan Akomodasi"
                            value={newSectionTitle}
                            onChangeText={setNewSectionTitle}
                            editable={!loading}
                        />

                        <Text style={styles.label}>Konten Section Baru</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            placeholder="Deskripsi lengkap section"
                            value={newSectionContent}
                            onChangeText={setNewSectionContent}
                            multiline
                            editable={!loading}
                            textAlignVertical='top'
                        />

                        <TouchableOpacity 
                            style={[styles.btnAddSection, (!newSectionTitle.trim() || !newSectionContent.trim() || loading) && { opacity: 0.6 }]} 
                            onPress={addSection} 
                            disabled={loading || !newSectionTitle.trim() || !newSectionContent.trim()}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.btnText}>➕ Tambah Section</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* ---------------------------------- */}
                    {/* Action Buttons */}
                    {/* ---------------------------------- */}
                    <TouchableOpacity
                        style={[styles.btnPrimary, (loading || fetching || !isDirty) && { opacity: 0.6 }]}
                        onPress={handleUpdate}
                        disabled={loading || fetching || !isDirty}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.btnText}>💾 Perbarui Data Hotel</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.btnCancel}
                        onPress={() => router.back()}
                        disabled={loading || fetching}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.btnCancelText}>Batal</Text>
                    </TouchableOpacity>

                    <View style={{ height: 30 }} />
                </ScrollView>
            </SafeAreaView>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f0f4f8' }, // Latar belakang lebih lembut
    container: { flex: 1, paddingHorizontal: 10, backgroundColor: '#f0f4f8' },
    center: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginBottom: 12, color: '#334155', fontWeight: '600' },
    scrollViewContent: { paddingVertical: 15 },

    // --- Header Card ---
    headerTitleCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        borderLeftWidth: 5,
        borderLeftColor: '#0ea5e9', // Garis aksen
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerHotelName: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 4,
    },
    headerHotelID: {
        fontSize: 12,
        color: '#64748b',
    },
    saveStatusContainer: {
        marginTop: 8,
    },
    statusDirty: {
        fontSize: 12,
        fontWeight: '700',
        color: '#f59e0b', // Kuning/oranye untuk peringatan
    },
    statusClean: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10b981', // Hijau untuk tersimpan
    },

    // --- Group Card (General) ---
    card: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionHeader: { 
        fontSize: 16, 
        fontWeight: '800', 
        marginBottom: 12, 
        color: '#334155', 
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 8,
    },

    // --- Input & Label ---
    label: { 
        fontSize: 13, 
        fontWeight: '700', 
        marginTop: 10, 
        marginBottom: 6, 
        color: '#334155' 
    },
    input: { 
        borderWidth: 1, 
        borderColor: '#cbd5e1', 
        borderRadius: 8, 
        paddingHorizontal: 15, 
        paddingVertical: 12, 
        fontSize: 14, 
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        marginBottom: 10,
    },
    inputMultiline: {
        minHeight: 80,
    },
    inputHint: {
        fontSize: 12,
        color: '#64748b',
        marginTop: -5,
        marginBottom: 10,
    },

    // --- Star Selector ---
    starSelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 5,
    },
    starItem: {
        paddingVertical: 5,
        paddingHorizontal: 5,
    },
    starIcon: {
        fontSize: 28,
        // Dibiarkan tanpa perubahan karena emoji bintang akan terlihat berbeda
    },
    starIconActive: {
        opacity: 1,
    },
    starIconInactive: {
        opacity: 0.3,
    },

    // --- Section Management ---
    existingSectionBox: { 
        padding: 10, 
        backgroundColor: '#f1f5f9', 
        borderRadius: 8, 
        marginBottom: 15,
        borderLeftWidth: 3,
        borderLeftColor: '#f59e0b',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    sectionBoxTitle: { 
        fontWeight: 'bold', 
        color: '#334155', 
        fontSize: 13 
    },
    sectionInput: {
        marginHorizontal: 0,
        marginBottom: 8,
        paddingVertical: 8,
    },
    removeBtn: { 
        color: '#dc2626', 
        fontWeight: '600', 
        fontSize: 12 
    },
    
    // --- Buttons ---
    btnLocation: {
        backgroundColor: '#3b82f6', // Biru yang lebih dalam
        paddingVertical: 12, 
        borderRadius: 8, 
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    btnLocationText: {
        color: '#fff', 
        fontWeight: '700', 
        fontSize: 14,
    },
    
    btnPrimary: { 
        backgroundColor: '#0ea5e9',
        paddingVertical: 15, 
        borderRadius: 12, 
        alignItems: 'center',
        marginHorizontal: 10,
        marginTop: 20,
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    btnCancel: {
        backgroundColor: 'transparent',
        paddingVertical: 15, 
        borderRadius: 12,
        marginHorizontal: 10,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    btnText: { 
        color: '#fff', 
        fontWeight: '800', 
        fontSize: 16 
    },
    btnCancelText: {
        color: '#64748b',
        fontWeight: '700',
        fontSize: 16,
    },
    btnAddSection: {
        backgroundColor: '#10b981', // Hijau untuk Tambah
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15,
    }
});

export default FormEditLocation;