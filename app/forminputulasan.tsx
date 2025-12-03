import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { push, ref } from 'firebase/database';
import * as React from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from './firebase';

const RATING_STARS = [1, 2, 3, 4, 5];

export default function FormInputUlasan() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { id, name } = params as any;

    const [userName, setUserName] = React.useState('');
    // Menggunakan string untuk rating yang diketik pengguna, tetapi diubah ke number saat interaksi bintang
    const [rating, setRating] = React.useState(5); 
    const [comment, setComment] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    // Fungsi untuk mengubah rating (berdasarkan sentuhan bintang)
    const handleRatingPress = (newRating: number) => {
        if (!loading) {
            setRating(newRating);
        }
    };

    const handleSubmit = async () => {
        const ratingNumber = parseInt(rating.toString(), 10);
        
        if (!id) {
            Alert.alert('Error', 'Hotel tidak dipilih');
            return;
        }
        if (ratingNumber < 1 || ratingNumber > 5 || isNaN(ratingNumber)) {
            Alert.alert('Error', 'Rating harus antara 1 sampai 5');
            return;
        }
        if (!comment.trim()) {
            Alert.alert('Error', 'Ulasan tidak boleh kosong');
            return;
        }

        setLoading(true);
        try {
            const reviewsRef = ref(db, `points/${id}/reviews`);
            await push(reviewsRef, {
                userName: userName || 'Anonim',
                rating: ratingNumber,
                comment: comment.trim(),
                createdAt: new Date().toISOString(),
            });
            Alert.alert('Terima kasih', 'Ulasan berhasil dikirim', [{ text: 'OK', onPress: () => router.back() }]);
        } catch (e) {
            console.error('submit review error', e);
            Alert.alert('Error', 'Gagal mengirim ulasan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ 
                title: `Ulas ${name || 'Hotel'}`,
                headerStyle: { backgroundColor: '#0ea5e9' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '700' }
            }} />

            <View style={styles.content}>
                
                {/* Header Judul Hotel */}
                <View style={styles.headerCard}>
                    <Text style={styles.headerEmoji}>✨</Text>
                    <Text style={styles.headerTitle}>{name || 'Hotel Tanpa Nama'}</Text>
                    <Text style={styles.headerSubtitle}>Tinggalkan ulasan Anda di bawah ini.</Text>
                </View>

                {/* --- Input Nama (Opsional) --- */}
                <Text style={styles.label}>Nama Anda (opsional)</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Contoh: Budi Santoso" 
                    value={userName} 
                    onChangeText={setUserName} 
                    editable={!loading}
                    placeholderTextColor="#94a3b8"
                />

                {/* --- Input Rating Interaktif --- */}
                <Text style={[styles.label, styles.spacingTop]}>Rating Bintang *</Text>
                <View style={styles.ratingContainer}>
                    {RATING_STARS.map((star) => (
                        <TouchableOpacity
                            key={star}
                            activeOpacity={0.8}
                            onPress={() => handleRatingPress(star)}
                            disabled={loading}
                        >
                            <Text style={styles.starIcon}>
                                {star <= rating ? '⭐' : '☆'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <Text style={styles.ratingText}>{rating} / 5</Text>
                </View>
                
                {/* --- Input Ulasan (Wajib) --- */}
                <Text style={[styles.label, styles.spacingTop]}>Ulasan Anda *</Text>
                <TextInput 
                    style={[styles.input, styles.commentInput]} 
                    placeholder="Bagikan pengalaman menginap Anda secara detail..." 
                    value={comment} 
                    onChangeText={setComment} 
                    multiline 
                    editable={!loading}
                    textAlignVertical="top"
                    placeholderTextColor="#94a3b8"
                />

                {/* --- Tombol Aksi --- */}
                <TouchableOpacity 
                    style={[styles.btnPrimary, styles.spacingTop]} 
                    onPress={handleSubmit} 
                    disabled={loading || !comment.trim() || rating < 1}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.btnText}>Kirim Ulasan</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.btnSecondary]} 
                    onPress={() => router.back()} 
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <Text style={styles.btnTextSecondary}>Batal</Text>
                </TouchableOpacity>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: '#f8fafc' // Warna latar belakang ringan
    },
    content: { 
        padding: 20, 
        flex: 1
    },

    // Header Card
    headerCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    headerEmoji: {
        fontSize: 30,
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
        textAlign: 'center',
    },

    // Input Styles
    label: { 
        fontSize: 13, 
        fontWeight: '700', 
        color: '#334155', // Warna teks yang lebih gelap
        marginBottom: 8 
    },
    input: { 
        borderWidth: 1, 
        borderColor: '#cbd5e1', // Border abu-abu muda
        borderRadius: 10, 
        paddingHorizontal: 15, 
        paddingVertical: 12, 
        backgroundColor: '#fff',
        fontSize: 15,
        color: '#0f172a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    commentInput: {
        minHeight: 140,
    },
    spacingTop: {
        marginTop: 20,
    },

    // Rating Selector
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    starIcon: {
        fontSize: 32,
        marginHorizontal: 2,
        opacity: 0.95,
        // Untuk memastikan ikon kustom (misalnya dari IconSymbol) terlihat, 
        // pastikan IconSymbol diimpor dan terintegrasi dengan benar
    },
    ratingText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#f59e0b',
        marginLeft: 10,
    },

    // Buttons
    btnPrimary: { 
        backgroundColor: '#0ea5e9', // Warna biru cerah
        paddingVertical: 14, 
        alignItems: 'center', 
        borderRadius: 12, 
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    btnSecondary: { 
        backgroundColor: 'transparent',
        paddingVertical: 14, 
        alignItems: 'center', 
        borderRadius: 12,
        marginTop: 10,
        borderWidth: 2,
        borderColor: '#cbd5e1', 
    },
    btnText: { 
        color: '#fff', 
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    btnTextSecondary: {
        color: '#64748b', 
        fontWeight: '700',
        fontSize: 15,
    }
});