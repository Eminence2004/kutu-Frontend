// app/profile.tsx
import { useTheme } from './contexts/ThemeContext';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { BASE_URL } from "../constants/constants";

const { width } = Dimensions.get("window");
const absUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
};

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  console.log("PROFILE THEME:", isDark, colors.background);
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newBio, setNewBio] = useState("");
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) { router.replace("/"); return; }
      const [profileRes, postRes] = await Promise.all([
        fetch(`${BASE_URL}/api/auth/profile/`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }),
        fetch(`${BASE_URL}/api/auth/posts/mine/`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }),
      ]);
      if (profileRes.ok) { const data = await profileRes.json(); setUser(data); setNewBio(data.bio || ""); }
      if (postRes.ok) { const d = await postRes.json(); setPosts(Array.isArray(d) ? d : []); }
    } catch (e) { console.error("Profile Load Error:", e); }
    finally { setLoading(false); }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Denied", "Gallery access is needed."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) updateProfile(result.assets[0].uri);
  };

  const updateProfile = async (imageUri?: string) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const formData = new FormData();
      if (imageUri) {
        const filename = imageUri.split("/").pop() || "profile.jpg";
        const match = /\.(\w+)$/.exec(filename);
        formData.append("profile_pic", { uri: Platform.OS === "android" ? imageUri : imageUri.replace("file://", ""), name: filename, type: match ? `image/${match[1]}` : "image/jpeg" } as any);
      }
      formData.append("bio", newBio);
      const res = await fetch(`${BASE_URL}/api/auth/profile/update/`, { method: "PATCH", body: formData, headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { Alert.alert("Success", "Profile updated!"); setIsEditing(false); fetchProfile(); }
      else Alert.alert("Error", "Failed to update profile.");
    } catch { Alert.alert("Error", "Connection error."); }
  };

  useEffect(() => { fetchProfile(); }, []);

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const avatarUrl = absUrl(user?.profile_pic);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border, marginTop: Platform.OS === "android" ? 30 : 0 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.username, { color: colors.text }]}>{user?.username || "profile"}</Text>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>

          <TouchableOpacity onPress={async () => { await AsyncStorage.clear(); router.replace("/"); }}>
            <Ionicons name="log-out-outline" size={26} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
          <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              : <View style={[styles.avatarFallback, { backgroundColor: colors.avatarBg }]}><Text style={[styles.avatarTxt, { color: colors.avatarText }]}>{user?.full_name ? user.full_name[0].toUpperCase() : "U"}</Text></View>
            }
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Ionicons name="camera" size={12} color="white" />
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.text }]}>{posts.length}</Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>posts</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.text }]}>{user?.followers_count || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>followers</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.text }]}>{user?.following_count || 0}</Text>
          <Text style={[styles.statLabel, { color: colors.subtext }]}>following</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={[styles.fullName, { color: colors.text }]}>{user?.full_name || "KsTU Student"}</Text>
        {isEditing ? (
          <View style={styles.editBioContainer}>
            <TextInput style={[styles.bioInput, { color: colors.text, borderBottomColor: colors.border }]} value={newBio} onChangeText={setNewBio} placeholder="Write a bio..." placeholderTextColor={colors.subtext} multiline />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={() => updateProfile()}>
              <Text style={styles.saveBtnText}>Save Bio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.bioText, { color: colors.subtext }]}>{user?.bio || "No bio yet."}</Text>
        )}
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setIsEditing(!isEditing)}>
          <Text style={[styles.btnText, { color: colors.text }]}>{isEditing ? "Cancel" : "Edit profile"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.btnText, { color: colors.text }]}>Share profile</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts} numColumns={3}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const imgUrl = absUrl(item.image);
          if (!imgUrl) return <View style={[styles.gridImage, { backgroundColor: colors.inputBg }]} />;
          return <Image source={{ uri: imgUrl }} style={styles.gridImage} />;
        }}
        ListEmptyComponent={
          <View style={styles.emptyGrid}>
            <Ionicons name="camera-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyGridTxt, { color: colors.subtext }]}>No posts yet</Text>
          </View>
        }
      />
          </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, borderBottomWidth: 1 },
  username: { fontSize: 18, fontWeight: "bold" },
  statsContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginTop: 20 },
  avatarContainer: { flex: 1.2 },
  avatarRing: { width: 86, height: 86, borderRadius: 43, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  avatarTxt: { fontSize: 32, fontWeight: "bold" },
  cameraBadge: { position: "absolute", bottom: 0, right: 0, padding: 5, borderRadius: 12, borderWidth: 2 },
  statBox: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 13, marginTop: 2 },
  statDivider: { width: 1, height: 28 },
  infoSection: { paddingHorizontal: 20, marginTop: 15 },
  fullName: { fontWeight: "700", fontSize: 16 },
  bioText: { marginTop: 4, fontSize: 14 },
  editBioContainer: { marginTop: 10 },
  bioInput: { borderBottomWidth: 1, paddingVertical: 5, fontSize: 14 },
  saveBtn: { padding: 8, borderRadius: 8, marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 16 },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  btnRow: { flexDirection: "row", padding: 20, gap: 10 },
  editBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  btnText: { fontWeight: "700", fontSize: 14 },
  gridImage: { width: width / 3 - 2, height: width / 3 - 2, margin: 1 },
  emptyGrid: { alignItems: 'center', paddingVertical: 40 },
  emptyGridTxt: { marginTop: 10, fontSize: 14 },
});
