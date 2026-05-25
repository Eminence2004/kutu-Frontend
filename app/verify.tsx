import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerify = () => {
    setLoading(true);

    // --- EMERGENCY BYPASS ---
    // This forces the app to go to Home so you can see your map!
    setTimeout(() => {
      setLoading(false);
      router.replace('/home'); 
    }, 1000);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.inner}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Verify Email 📧</Text>
          <Text style={styles.subHeader}>
            Enter the code sent to <Text style={{fontWeight: 'bold'}}>{email}</Text>
          </Text>
        </View>

        <TextInput
          style={styles.otpInput}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />

        <TouchableOpacity style={styles.button} onPress={handleVerify}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & Login</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  headerContainer: { marginBottom: 40 },
  header: { fontSize: 32, fontWeight: '800', color: '#0F172A' },
  subHeader: { fontSize: 16, color: '#64748B', marginTop: 8 },
  otpInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, fontSize: 32, textAlign: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 30 },
  button: { backgroundColor: '#2b59c3', borderRadius: 16, padding: 20, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});