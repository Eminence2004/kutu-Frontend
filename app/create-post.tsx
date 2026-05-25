// app/create-post.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useTheme } from './contexts/ThemeContext';

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = await AsyncStorage.getItem("userToken");
  const makeRequest = (t: string | null) =>
    fetch(url, { ...options, headers: { ...options.headers, ...(t ? { Authorization: `Bearer ${t}` } : {}) } });
  let response = await makeRequest(token);
  if (response.status === 401) {
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    if (refreshToken) {
      const refreshRes = await fetch(`${BASE_URL}/api/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        await AsyncStorage.setItem("userToken", data.access);
        response = await makeRequest(data.access);
      }
    }
  }
  return response;
}

const CAMPUS_BOUNDS = { minLat: 6.6895, maxLat: 6.6925, minLon: -1.6120, maxLon: -1.6080 };
const isOnCampus = (lat: number, lon: number) =>
  lat >= CAMPUS_BOUNDS.minLat && lat <= CAMPUS_BOUNDS.maxLat &&
  lon >= CAMPUS_BOUNDS.minLon && lon <= CAMPUS_BOUNDS.maxLon;

export default function CreatePost() {
  const { colors, isDark } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const reportPostLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      if (!isOnCampus(latitude, longitude)) return;
      await authFetch(`${BASE_URL}/api/navigation/report-post-location/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude }),
      });
    } catch { /* silent */ }
  };

  const handleUpload = async () => {
    if (!image) { Alert.alert("Wait!", "Pick a photo first."); return; }
    setLoading(true);
    const formData = new FormData();
    const filename = image.split("/").pop();
    const match = /\.(\w+)$/.exec(filename || "");
    const type = match ? `image/${match[1]}` : "image/jpeg";
    // @ts-ignore
    formData.append("image", {
      uri: Platform.OS === "android" ? image : image.replace("file://", ""),
      name: filename || "upload.jpg", type,
    });
    formData.append("caption", caption);
    try {
      const response = await authFetch(`${BASE_URL}/api/posts/`, {
        method: "POST", body: formData,
        headers: { Accept: "application/json" },
      });
      const responseData = await response.json();
      if (response.ok) {
        reportPostLocation();
        Alert.alert("Vibe Shared! 📸", "Your post is now live on campus.");
        router.replace("/(tabs)/home");
      } else {
        if (response.status === 401) {
          Alert.alert("Session Expired", "Please log in again.");
          await AsyncStorage.clear();
          router.replace("/");
        } else {
          Alert.alert("Upload Failed", responseData.error || "Something went wrong.");
        }
      }
    } catch {
      Alert.alert("Connection Error", "Is Django running? Check your terminal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>

        {/* ── Header ── */}
        <Text style={[styles.header, { color: colors.text }]}>New Vibe 📸</Text>

        {/* ── Image Picker ── */}
        <TouchableOpacity
          style={[styles.imagePlaceholder, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={pickImage}
        >
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>📷</Text>
              <Text style={[styles.placeholderText, { color: colors.subtext }]}>Tap to pick a photo</Text>
              <Text style={[styles.placeholderSub, { color: colors.subtext }]}>Share what's happening on campus</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Change photo button if already selected */}
        {image && (
          <TouchableOpacity onPress={pickImage} style={styles.changePhotoBtn}>
            <Text style={[styles.changePhotoTxt, { color: colors.primary }]}>Change photo</Text>
          </TouchableOpacity>
        )}

        {/* ── Caption ── */}
        <TextInput
          style={[styles.input, {
            backgroundColor: colors.inputBg,
            color: colors.text,
            borderColor: colors.border,
          }]}
          placeholder="Write a caption... #KsTUVibes"
          placeholderTextColor={colors.subtext}
          value={caption}
          onChangeText={setCaption}
          multiline
        />

        {/* ── Post Button ── */}
        <TouchableOpacity
          style={[styles.button, {
            backgroundColor: image ? colors.primary : colors.subtext,
            opacity: loading ? 0.7 : 1,
          }]}
          onPress={handleUpload}
          disabled={loading || !image}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Post Vibe</Text>}
        </TouchableOpacity>

        {/* ── Location Note ── */}
        <View style={[styles.locationNote, {
          backgroundColor: isDark ? '#14532d' : '#f0fdf4',
          borderColor: isDark ? '#166534' : '#bbf7d0',
        }]}>
          <Text style={[styles.locationNoteText, { color: isDark ? '#86efac' : '#166534' }]}>
            📍 Your location is automatically captured to help improve the campus map
          </Text>
        </View>

        {/* ── Cancel ── */}
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.cancelText, { color: colors.subtext }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, flexGrow: 1, justifyContent: "center" },
  header: { fontSize: 32, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  imagePlaceholder: {
    width: "100%", height: 320, borderRadius: 25,
    justifyContent: "center", alignItems: "center",
    overflow: "hidden", marginBottom: 12,
    borderStyle: "dashed", borderWidth: 2,
  },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholderText: { fontWeight: "bold", fontSize: 16 },
  placeholderSub: { fontSize: 12, marginTop: 5 },
  changePhotoBtn: { alignItems: 'center', marginBottom: 12 },
  changePhotoTxt: { fontWeight: '600', fontSize: 14 },
  input: {
    padding: 15, borderRadius: 15, height: 80,
    textAlignVertical: "top", marginBottom: 20,
    borderWidth: 1, fontSize: 16,
  },
  button: {
    padding: 18, borderRadius: 15,
    alignItems: "center", elevation: 4,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  locationNote: { marginTop: 14, borderRadius: 10, padding: 10, borderWidth: 1 },
  locationNoteText: { fontSize: 12, textAlign: "center" },
  cancelText: { textAlign: "center", marginTop: 20, fontWeight: "600" },
});