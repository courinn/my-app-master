import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import { push, ref } from 'firebase/database';
import * as React from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { db } from './firebase';

type Section = { title: string; content: string; source: string | null };

const STAR_OPTIONS = [
    { label: '⭐ 3 Bintang', value: 3 },
    { label: '⭐⭐ 4 Bintang', value: 4 },
    { label: '⭐⭐⭐ 5 Bintang', value: 5 },
];

const FormInputLocation = () => {
    const router = useRouter();
    const [name, setName] = React.useState('');
    const [coordinates, setCoordinates] = React.useState('');
    const [accuration, setAccuration] = React.useState('');
    const [bintang, setBintang] = React.useState('3');
    const [alamat, setAlamat] = React.useState('');
    const [deskripsi, setDeskripsi] = React.useState('');
    const [website, setWebsite] = React.useState('');
    const [sections, setSections] = React.useState<Section[]>([]);
    const [newSectionTitle, setNewSectionTitle] = React.useState('');
    const [newSectionContent, setNewSectionContent] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [showStarDropdown, setShowStarDropdown] = React.useState(false);

    const getCoordinates = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Izin Ditolak', 'Izin akses lokasi ditolak');
            return;
        }
        let loc = await Location.getCurrentPositionAsync({});
        const coords = `${loc.coords.latitude},${loc.coords.longitude}`;
        setCoordinates(coords);
        setAccuration(`${loc.coords.accuracy.toFixed(2)} m`);
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

        setLoading(true);
        try {
            const newHotel = {
                name,
                coordinates,
                accuration,
                bintang: parseInt(bintang),
                alamat,
                deskripsi,
                website: website || null,
                sections: sections.length > 0 ? sections : null,
            };

            const locationsRef = ref(db, 'points/');
            await push(locationsRef, newHotel);

            Alert.alert('Sukses', 'Hotel berhasil ditambahkan');
            // Reset form
            setName('');
            setCoordinates('');
            setAccuration('');
            setBintang('');
            setAlamat('');
            setDeskripsi('');
            setWebsite('');
            setSections([]);
            router.back();
        } catch (e) {
            console.error('Error:', e);
            Alert.alert('Error', 'Gagal menyimpan data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaProvider style={{ backgroundColor: '#fff' }}>
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: 'Tambah Hotel' }} />
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Basic Info */}
                    <Text style={styles.sectionHeader}>Informasi Dasar</Text>

                    <Text style={styles.label}>Nama Hotel *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Contoh: Royal Ambarrukmo"
                        value={name}
                        onChangeText={setName}
                        editable={!loading}
                    />

                    <Text style={styles.label}>Koordinat *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Contoh: -7.797,110.370"
                        value={coordinates}
                        onChangeText={setCoordinates}
                        editable={!loading}
                    />

                    <Text style={styles.label}>Akurasi</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Contoh: 10 m"
                        value={accuration}
                        onChangeText={setAccuration}
                        editable={!loading}
                    />

                    <TouchableOpacity style={styles.btn} onPress={getCoordinates} disabled={loading}>
                        <Text style={styles.btnText}>📍 Dapatkan Lokasi Saat Ini</Text>
                    </TouchableOpacity>

                    {/* Hotel Details */}
                    <Text style={styles.sectionHeader}>Detail Hotel</Text>

                    <Text style={styles.label}>Bintang *</Text>
                    <TouchableOpacity
                        style={styles.dropdownBtn}
                        onPress={() => setShowStarDropdown(!showStarDropdown)}
                        disabled={loading}
                    >
                        <Text style={styles.dropdownBtnText}>
                            {bintang ? STAR_OPTIONS.find(o => String(o.value) === bintang)?.label : 'Pilih Bintang'}
                        </Text>
                    </TouchableOpacity>

                    <Modal visible={showStarDropdown} transparent animationType="fade">
                        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowStarDropdown(false)} activeOpacity={1}>
                            <View style={styles.dropdownMenu}>
                                {STAR_OPTIONS.map(option => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setBintang(String(option.value));
                                            setShowStarDropdown(false);
                                        }}
                                    >
                                        <Text style={[styles.dropdownItemText, bintang === String(option.value) && styles.dropdownItemActive]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </TouchableOpacity>
                    </Modal>

                    <Text style={styles.label}>Alamat</Text>
                    <TextInput
                        style={[styles.input, { minHeight: 80 }]}
                        placeholder="Alamat lengkap hotel"
                        value={alamat}
                        onChangeText={setAlamat}
                        multiline
                        editable={!loading}
                    />

                    <Text style={styles.label}>Deskripsi</Text>
                    <TextInput
                        style={[styles.input, { minHeight: 100 }]}
                        placeholder="Deskripsi hotel"
                        value={deskripsi}
                        onChangeText={setDeskripsi}
                        multiline
                        editable={!loading}
                    />

                    <Text style={styles.label}>Website</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Contoh: hotelname.com"
                        value={website}
                        onChangeText={setWebsite}
                        editable={!loading}
                    />

                    {/* Sections */}
                    <Text style={styles.sectionHeader}>Informasi Lengkap (Sections)</Text>

                    {sections.map((section, index) => (
                        <View key={index} style={styles.sectionBox}>
                            <Text style={styles.sectionBoxTitle}>{section.title}</Text>
                            <Text style={styles.sectionBoxContent} numberOfLines={2}>{section.content}</Text>
                            <TouchableOpacity onPress={() => removeSection(index)} disabled={loading}>
                                <Text style={styles.removeBtn}>Hapus</Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    <Text style={styles.label}>Judul Section</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Contoh: Fasilitas dan Akomodasi"
                        value={newSectionTitle}
                        onChangeText={setNewSectionTitle}
                        editable={!loading}
                    />

                    <Text style={styles.label}>Konten Section</Text>
                    <TextInput
                        style={[styles.input, { minHeight: 80 }]}
                        placeholder="Deskripsi lengkap section"
                        value={newSectionContent}
                        onChangeText={setNewSectionContent}
                        multiline
                        editable={!loading}
                    />

                    <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={addSection} disabled={loading}>
                        <Text style={styles.btnText}>➕ Tambah Section</Text>
                    </TouchableOpacity>

                    {/* Action Buttons */}
                    <TouchableOpacity
                        style={[styles.btn, styles.btnPrimary, loading && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <Text style={styles.btnText}>{loading ? 'Menyimpan...' : '💾 Simpan Hotel'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.btn, styles.btnCancel]}
                        onPress={() => router.back()}
                        disabled={loading}
                    >
                        <Text style={styles.btnText}>Batal</Text>
                    </TouchableOpacity>

                    <View style={{ height: 20 }} />
                </ScrollView>
            </SafeAreaView>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    sectionHeader: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 12, marginLeft: 12, color: '#212529' },
    label: { fontSize: 13, fontWeight: '600', marginLeft: 12, marginTop: 10, marginBottom: 6, color: '#495057' },
    input: { marginHorizontal: 12, borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#f8f9fa' },
    btn: { marginHorizontal: 12, marginTop: 12, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    btnPrimary: { backgroundColor: '#0275d8' },
    btnSecondary: { backgroundColor: '#6c757d' },
    btnCancel: { backgroundColor: '#dc3545', marginBottom: 12 },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    sectionBox: { marginHorizontal: 12, marginVertical: 6, padding: 10, backgroundColor: '#f1f3f5', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#0275d8' },
    sectionBoxTitle: { fontWeight: 'bold', color: '#212529', marginBottom: 4 },
    sectionBoxContent: { color: '#6c757d', fontSize: 12, marginBottom: 6 },
    removeBtn: { color: '#dc3545', fontWeight: '600', fontSize: 12 },
    dropdownBtn: { marginHorizontal: 12, marginTop: 10, borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f8f9fa' },
    dropdownBtnText: { fontSize: 14, color: '#212529' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    dropdownMenu: { backgroundColor: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: 200 },
    dropdownItem: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
    dropdownItemText: { fontSize: 14, color: '#495057' },
    dropdownItemActive: { fontWeight: '700', color: '#0275d8' },
});

export default FormInputLocation;