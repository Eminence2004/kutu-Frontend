// app/search.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../constants/constants";
import { useTheme } from './contexts/ThemeContext';

const absUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
};

interface UserItem {
  id: number;
  full_name: string;
  username: string;
  profile_pic: string | null;
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 2) { setResults([]); return; }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(
        `${BASE_URL}/api/auth/users/search/?q=${encodeURIComponent(text)}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      );
      const data = await response.json();
      if (response.ok) setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item }: { item: UserItem }) => {
    const imageUrl = absUrl(item.profile_pic);
    const initial = (item.full_name || item.username || "?")[0].toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/user/${item.id}` as any)}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.avatarBg }]}>
            <Text style={[styles.avatarTxt, { color: colors.avatarText }]}>{initial}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.full_name}</Text>
          <Text style={[styles.userHandle, { color: colors.primary }]}>@{item.username}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, {
        borderBottomColor: colors.border,
        marginTop: Platform.OS === "android" ? 35 : 0,
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="search" size={20} color={colors.subtext} style={styles.searchIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Search students by name or username..."
            value={query}
            onChangeText={handleSearch}
            autoFocus
            placeholderTextColor={colors.subtext}
          />
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
          {query.length > 0 && !loading && (
            <TouchableOpacity onPress={() => { setQuery(""); setResults([]); }}>
              <Ionicons name="close-circle" size={20} color={colors.subtext} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="always"
        ListEmptyComponent={
          !loading && query.length > 1 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>No students found for "{query}"</Text>
            </View>
          ) : query.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={60} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.subtext }]}>Search for KsTU students</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    padding: 15, gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  searchBar: {
    flex: 1, flexDirection: "row", alignItems: "center",
    borderRadius: 12, paddingHorizontal: 12, height: 45,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15 },
  list: { padding: 15 },
  userCard: {
    flexDirection: "row", alignItems: "center",
    padding: 12, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, elevation: 1,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontWeight: '800', fontSize: 20 },
  userInfo: { flex: 1, marginLeft: 15 },
  userName: { fontSize: 16, fontWeight: "700" },
  userHandle: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { marginTop: 15, fontSize: 15, textAlign: "center", lineHeight: 22 },
});