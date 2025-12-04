import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import { push, ref } from 'firebase/database';
import * as React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { db } from './firebase';

type Section = { title: string; content: string; source: string | null };

// Didefinisikan ulang agar konsisten dengan FormEditLocation
const STAR_OPTIONS = [1, 2, 3, 4, 5];
const STAR_ICON_FULL = '★'; 
// const STAR_ICON_EMPTY = '☆'; // Tidak dipakai, cukup kontrol opacity

const FormInputLocation = () => {
    const router = useRouter();
    const [name, setName] = React.useState('');
    const [coordinates, setCoordinates] = React.useState('');
    const [accuration, setAccuration] = React.useState('');
    const [bintang, setBintang] = React.useState('3'); // Default ke 3
    const [alamat, setAlamat] = React.useState('');
    const [deskripsi, setDeskripsi] = React.useState('');
    const [website, setWebsite] = React.useState('');
    const [sections, setSections] = React.useState<Section[]>([]);
    const [newSectionTitle, setNewSectionTitle] = React.useState('');
    const [newSectionContent, setNewSectionContent] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    // Helper untuk mengupdate state agar konsisten
    const handleChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
        setter(value);
    };

    const handleStarChange = (value: number) => {
        handleChange(setBintang, String(value));
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
            setAccuration(`${loc.coords.accuracy.toFixed(2)} m`);
        } catch (e) {
            Alert.alert('Error Lokasi', 'Gagal mendapatkan lokasi saat ini.');
        } finally {
            setLoading(false);
        }
    };

    const addSection = () => {
        if (!newSectionTitle.trim() || !newSectionContent.trim()) {
            Alert.alert('Error', 'Judul dan konten section tidak boleh kosong');
            return;
        }
        setSections([...sections, { title: newSectionTitle, content: newSectionContent, source: null }]);
        setNewSectionTitle('');
        setNewSectionContent('');
    };

    const removeSection = (index: number) => {
        setSections(sections.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
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
            const newHotel = {
                name,
                coordinates,
                accuration: accuration || null,
                bintang: parseInt(bintang),
                alamat: alamat || null,
                deskripsi: deskripsi || null,
                website: website || null,
                sections: sections.length > 0 ? sections : null,
            };

            const locationsRef = ref(db, 'points/');
            await push(locationsRef, newHotel);

            Alert.alert('Sukses', 'Hotel berhasil ditambahkan', [
                { text: 'OK', onPress: () => router.back() }
            ]);
            // Reset form
            setName('');
            setCoordinates('');
            setAccuration('');
            setBintang('3');
            setAlamat('');
            setDeskripsi('');
            setWebsite('');
            setSections([]);
        } catch (e) {
            console.error('Error:', e);
            Alert.alert('Error', 'Gagal menyimpan data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaProvider style={styles.safeArea}>
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: 'Tambah Hotel Baru' }} />
                <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
                    
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
                            onChangeText={setName}
                            editable={!loading}
                        />

                        <Text style={styles.label}>Koordinat (Lat,Lng) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Contoh: -7.797,110.370"
                            value={coordinates}
                            onChangeText={setCoordinates}
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

                        <Text style={styles.label}>Rating Bintang *</Text>
                        <View style={styles.starSelectorContainer}>
                            {STAR_OPTIONS.map((value) => (
                                <TouchableOpacity
                                    key={value}
                                    style={styles.starItem}
                                    onPress={() => handleStarChange(value)}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[
                                        styles.starIcon, 
                                        parseInt(bintang) >= value ? styles.starIconActive : styles.starIconInactive
                                    ]}>
                                        {STAR_ICON_FULL}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            <Text style={styles.currentRatingText}>
                                ({bintang} Bintang)
                            </Text>
                        </View>
                        
                        <Text style={styles.label}>Alamat</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            placeholder="Alamat lengkap hotel"
                            value={alamat}
                            onChangeText={setAlamat}
                            multiline
                            editable={!loading}
                            textAlignVertical='top'
                        />

                        <Text style={styles.label}>Deskripsi Singkat</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline, { minHeight: 100 }]}
                            placeholder="Deskripsi singkat tentang hotel"
                            value={deskripsi}
                            onChangeText={setDeskripsi}
                            multiline
                            editable={!loading}
                            textAlignVertical='top'
                        />

                        <Text style={styles.label}>Website (URL)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Contoh: https://hotelname.com"
                            value={website}
                            onChangeText={setWebsite}
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
                                    <Text style={styles.sectionBoxTitle} numberOfLines={1}>Section #{index + 1}: {section.title}</Text>
                                    <TouchableOpacity 
                                        onPress={() => removeSection(index)} 
                                        disabled={loading}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.removeBtn}>❌ Hapus</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.sectionBoxContent}>{section.content}</Text>
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
                        style={[styles.btnPrimary, loading && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.btnText}>💾 Simpan Hotel Baru</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.btnCancel}
                        onPress={() => router.back()}
                        disabled={loading}
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
    safeArea: { flex: 1, backgroundColor: '#f0f4f8' }, 
    container: { flex: 1, paddingHorizontal: 10, backgroundColor: '#f0f4f8' },
    center: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginBottom: 12, color: '#334155', fontWeight: '600' },
    scrollViewContent: { paddingVertical: 15 },

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
    },
    starItem: {
        paddingVertical: 5,
        paddingHorizontal: 3, 
    },
    starIcon: {
        fontSize: 32, 
        color: '#fcd34d', 
    },
    starIconActive: {
        opacity: 1,
        textShadowColor: 'rgba(252, 211, 77, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    starIconInactive: {
        opacity: 0.3, 
        color: '#e2e8f0', 
    },
    currentRatingText: {
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
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
        fontSize: 13,
        flexShrink: 1,
        marginRight: 10,
    },
    sectionBoxContent: {
        color: '#475569',
        fontSize: 13,
    },
    
    removeBtn: { 
        color: '#dc2626', 
        fontWeight: '700', 
        fontSize: 14,
    },
    
    // --- Buttons ---
    btnLocation: {
        backgroundColor: '#3b82f6', 
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
        backgroundColor: '#dc2626', // Warna Merah Solid
        paddingVertical: 15, 
        borderRadius: 12,
        marginHorizontal: 10,
        marginTop: 10,
        alignItems: 'center', 
    },
    btnText: { 
        color: '#fff', 
        fontWeight: '800', 
        fontSize: 16 
    },
    btnCancelText: {
        color: '#fff', 
        fontWeight: '700',
        fontSize: 16,
    },
    btnAddSection: {
        backgroundColor: '#10b981', // Hijau untuk Tambah
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15,
    },
});

export default FormInputLocation;