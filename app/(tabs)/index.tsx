import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API } from "../../constants/constants";

const PRIMARY = "#2b59c3";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.includes("@") || password.length < 4) {
      Alert.alert("Error", "Please enter a valid email and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem("userToken", data.access);
        await AsyncStorage.setItem("refreshToken", data.refresh || "");
        await AsyncStorage.setItem("full_name", data.full_name || "Student");
        await AsyncStorage.setItem("username", data.username || "");

        const actualId = data.user_id || data.id;
        if (actualId) {
          await AsyncStorage.setItem("userId", actualId.toString());
          console.log("✅ Login Success. Saved My ID:", actualId);
        }

        router.replace("/home");
      } else {
        Alert.alert("Login Failed", data.error || "Invalid credentials.");
      }
    } catch (error) {
      Alert.alert("Connection Error", "Cannot reach server. Check Django & Wi-Fi.");
    } finally {
      setLoading(false);
    }
  };

  // Guest mode — go straight to map without logging in
  const openMapAsGuest = async () => {
    await AsyncStorage.setItem("guestMode", "true");
    router.push("/map" as any);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.inner}>

        {/* ── Header ── */}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Kutu 📍</Text>
          <Text style={styles.subHeader}>
            Vibe with friends, find your way on campus.
          </Text>
        </View>

        {/* ── Offline Map Banner ── */}
        <TouchableOpacity style={styles.mapBanner} onPress={openMapAsGuest} activeOpacity={0.85}>
          <View style={styles.mapBannerLeft}>
            <Text style={styles.mapBannerEmoji}>🗺️</Text>
            <View>
              <Text style={styles.mapBannerTitle}>Just need the map?</Text>
              <Text style={styles.mapBannerSub}>Use campus navigation without logging in</Text>
            </View>
          </View>
          <Text style={styles.mapBannerArrow}>›</Text>
        </TouchableOpacity>

        {/* ── Login Form ── */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="student@kstu.edu.gh"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={[styles.label, { marginTop: 15 }]}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/signup" as any)}
          style={styles.footer}
        >
          <Text style={styles.footerText}>
            New to Kutu? <Text style={styles.link}>Join now</Text>
          </Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  inner: { flex: 1, padding: 28, justifyContent: "center" },

  headerContainer: { marginBottom: 28, alignItems: "center" },
  header: { fontSize: 42, fontWeight: "900", color: PRIMARY, marginBottom: 8 },
  subHeader: { fontSize: 16, color: "#64748B", textAlign: "center" },

  // ── Offline map banner ──
  mapBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
  },
  mapBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  mapBannerEmoji: { fontSize: 32 },
  mapBannerTitle: { fontSize: 14, fontWeight: "800", color: PRIMARY, marginBottom: 2 },
  mapBannerSub: { fontSize: 12, color: "#64748b" },
  mapBannerArrow: { fontSize: 28, color: PRIMARY, fontWeight: "700" },

  inputContainer: { marginBottom: 25 },
  label: {
    fontSize: 13, fontWeight: "700", color: "#334155",
    marginBottom: 8, textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#F8FAFC", borderRadius: 16, padding: 18,
    fontSize: 16, borderWidth: 1.5, borderColor: "#E2E8F0", color: "#1e293b",
  },
  button: {
    backgroundColor: PRIMARY, borderRadius: 16, padding: 20, alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  footer: { marginTop: 25 },
  footerText: { textAlign: "center", color: "#64748B" },
  link: { color: PRIMARY, fontWeight: "800" },
});