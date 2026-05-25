import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../constants/constants";

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    studentId: "",
    indexNumber: "",
    phoneNumber: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    const { fullName, username, studentId, indexNumber, phoneNumber, email, password } = formData;

    if (!fullName || !username || !email.includes("@") || password.length < 4) {
      Alert.alert("Missing Info", "Full name, username, email and password (min 4 chars) are required.");
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const SIGNUP_URL = `${BASE_URL}/api/signup/`;
      console.log("🚀 Attempting signup at:", SIGNUP_URL);

      const response = await fetch(SIGNUP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          full_name: fullName.trim(),
          username: username.toLowerCase().trim(),
          student_id: studentId.trim() || undefined,
          index_number: indexNumber.trim() || undefined,
          phone_number: phoneNumber.trim() || undefined,
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      clearTimeout(timeout);
      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success 🚀", "Account created successfully!", [
          { text: "Login Now", onPress: () => router.replace("/") },
        ]);
      } else {
        Alert.alert("Signup Failed", data.error || "Something went wrong.");
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        Alert.alert("Timeout", "Server took too long. Is Django running?");
      } else {
        Alert.alert("Connection Error", "Cannot reach server. Check Django & Wi-Fi.");
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Join Kutu 🚀</Text>
          <Text style={styles.subHeader}>Create your student account to get started.</Text>
        </View>

        <View style={styles.form}>
          {/* Required fields */}
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor="#94a3b8"
            value={formData.fullName}
            onChangeText={(t) => update("fullName", t)}
          />

          <Text style={styles.label}>Username *</Text>
          <TextInput
            style={styles.input}
            placeholder="johndoe24"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            value={formData.username}
            onChangeText={(t) => update("username", t)}
          />

          <Text style={styles.label}>University Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="name@kstu.edu.gh"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(t) => update("email", t)}
          />

          <Text style={styles.label}>Create Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={formData.password}
            onChangeText={(t) => update("password", t)}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Student Info (for ID card finder)</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.label}>Student ID</Text>
          <TextInput
            style={styles.input}
            placeholder="0522XXXX"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            value={formData.studentId}
            onChangeText={(t) => update("studentId", t)}
          />

          <Text style={styles.label}>Index Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2021CS0012"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
            value={formData.indexNumber}
            onChangeText={(t) => update("indexNumber", t)}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 0244123456"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={formData.phoneNumber}
            onChangeText={(t) => update("phoneNumber", t)}
          />

          <Text style={styles.hint}>
            💡 Your phone number is only revealed when someone finds your ID card and you accept their contact request.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account? <Text style={styles.link}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContainer: { padding: 28, justifyContent: "center", flexGrow: 1 },
  headerContainer: { marginBottom: 30, marginTop: 40 },
  header: { fontSize: 32, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  subHeader: { fontSize: 16, color: "#64748B" },
  form: { marginBottom: 10 },
  label: {
    fontSize: 12, fontWeight: "700", color: "#475569",
    marginBottom: 8, textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#F8FAFC", borderRadius: 16, padding: 16,
    fontSize: 16, borderWidth: 1.5, borderColor: "#E2E8F0",
    marginBottom: 15, color: "#1e293b",
  },
  divider: {
    flexDirection: "row", alignItems: "center", marginVertical: 20, gap: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dividerText: { color: "#94a3b8", fontSize: 11, fontWeight: "600", textAlign: "center" },
  hint: {
    fontSize: 12, color: "#94a3b8", lineHeight: 18,
    backgroundColor: "#f8fafc", padding: 12, borderRadius: 12,
    marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0",
  },
  button: {
    backgroundColor: "#2b59c3", borderRadius: 16,
    padding: 20, alignItems: "center", marginTop: 10,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  footer: { marginTop: 25, paddingBottom: 20 },
  footerText: { textAlign: "center", color: "#64748B", fontSize: 15 },
  link: { color: "#2b59c3", fontWeight: "800" },
});