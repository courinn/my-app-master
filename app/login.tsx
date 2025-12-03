import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from './providers/AuthProvider';

export default function LoginScreen() {
  const { signIn, user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Login gagal', err.message || 'Periksa kredensial Anda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Login</Text>
      <Text style={styles.subtitle}>Masukkan email dan password Anda</Text>

      <TextInput 
        value={email} 
        onChangeText={setEmail} 
        placeholder="Email" 
        style={styles.input} 
        autoCapitalize="none" 
        keyboardType="email-address" 
        editable={!loading}
      />
      <TextInput 
        value={password} 
        onChangeText={setPassword} 
        placeholder="Password" 
        style={styles.input} 
        secureTextEntry 
        editable={!loading}
      />

      <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Masuk...' : 'Masuk'}</Text>
      </TouchableOpacity>

      <Text style={styles.info}>
        💡 Gunakan email: <Text style={styles.infoHighlight}>arin@gmail.com</Text> untuk akses admin
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', padding: 12, borderRadius: 8, marginBottom: 12 },
  btn: { backgroundColor: '#0275d8', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  info: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 20, lineHeight: 20 },
  infoHighlight: { fontWeight: 'bold', color: '#0275d8' },
});
