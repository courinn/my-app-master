import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from './providers/AuthProvider';

// Palet Warna Modern
const COLOR_PRIMARY = '#1e88e5'; // Biru cerah (Google/Material style)
const COLOR_ACCENT = '#ff9800'; // Oranye untuk highlight info
const COLOR_TEXT_DARK = '#333333';
const COLOR_TEXT_MUTED = '#666666';
const COLOR_BACKGROUND = '#f8f9fa';
const COLOR_CARD = '#ffffff';
const COLOR_BORDER = '#e0e0e0';

export default function LoginScreen() {
  const { signIn, user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // State untuk interaktivitas: menandakan input sedang fokus
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Login gagal', err?.message || 'Periksa kredensial Anda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>👋 Selamat Datang</Text>
        <Text style={styles.subtitle}>Masukkan detail akun Anda untuk melanjutkan.</Text>

        {/* Input Email */}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          style={[styles.input, isEmailFocused && styles.inputFocused]}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
          onFocus={() => setIsEmailFocused(true)}
          onBlur={() => setIsEmailFocused(false)}
          placeholderTextColor={COLOR_TEXT_MUTED}
        />

        {/* Input Password */}
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          style={[styles.input, isPasswordFocused && styles.inputFocused]}
          secureTextEntry
          editable={!loading}
          onFocus={() => setIsPasswordFocused(true)}
          onBlur={() => setIsPasswordFocused(false)}
          placeholderTextColor={COLOR_TEXT_MUTED}
        />

        {/* Tombol Login */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={submit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLOR_CARD} size="small" />
          ) : (
            <Text style={styles.btnText}>Masuk ke Akun</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Info Hint Admin - semua teks berada di dalam <Text> */}
      <View style={styles.infoWrapper}>
        <Text style={styles.info}>
          {/* gabungkan teks sehingga tidak ada string di luar Text */}
          {'💡 Gunakan email: '}
          <Text style={styles.infoHighlight}>arin@gmail.com</Text>
          {' untuk akses admin'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: COLOR_BACKGROUND,
  },
  card: {
    backgroundColor: COLOR_CARD,
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    color: COLOR_TEXT_DARK,
  },
  subtitle: {
    fontSize: 15,
    color: COLOR_TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: COLOR_BORDER,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    color: COLOR_TEXT_DARK,
    backgroundColor: '#fafafa',
  },
  inputFocused: {
    borderColor: COLOR_PRIMARY,
    borderWidth: 2,
    backgroundColor: COLOR_CARD,
  },
  btn: {
    backgroundColor: COLOR_PRIMARY,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: COLOR_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  btnDisabled: {
    backgroundColor: '#9e9e9e',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: COLOR_CARD,
    fontWeight: '700',
    fontSize: 17,
  },
  infoWrapper: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLOR_ACCENT + '50',
    shadowColor: COLOR_ACCENT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  info: {
    fontSize: 13,
    color: COLOR_TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoHighlight: {
    fontWeight: '700',
    color: COLOR_TEXT_DARK,
    backgroundColor: COLOR_CARD,
    paddingHorizontal: 5,
    borderRadius: 5,
  },
});
