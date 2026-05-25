// app/inbox.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../constants/constants";
import { useTheme } from './contexts/ThemeContext';

interface Chat {
  id: number;
  full_name: string;
  username: string;
  profile_pic: string | null;
  last_message: string;
}

export default function InboxScreen() {
  const { colors, isDark } = useTheme();
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => { fetchInbox(); }, []);

  const fetchInbox = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(`${BASE_URL}/api/auth/chat/`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (response.ok) setChats(await response.json());
    } catch (error) {
      console.error("Inbox fetch error:", error);
    }
  };

  const filteredChats = chats.filter((chat) =>
    (chat.full_name || chat.username).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProfilePic = (pic: string | null) => {
    if (!pic) return null;
    return pic.startsWith("http") ? pic : `${BASE_URL}${pic}`;
  };

  const getInitial = (chat: Chat) =>
    (chat.full_name || chat.username || "?")[0].toUpperCase();

  return (
    <SafeAreaView style={[styles.container, {
      backgroundColor: colors.background,
      paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        <TouchableOpacity
          style={[styles.composeBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/search" as any)}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={[styles.searchContainer, { backgroundColor: colors.inputBg }]}>
        <Ionicons name="search" size={20} color={colors.subtext} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search conversations..."
          placeholderTextColor={colors.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* ── Chat List ── */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const picUrl = getProfilePic(item.profile_pic);
          return (
            <TouchableOpacity
              style={[styles.chatItem, { borderBottomColor: colors.border }]}
              onPress={() =>
                router.push({
                  pathname: "/private-chat",
                  params: {
                    recipientId: item.id,
                    recipientName: item.full_name || item.username,
                    recipientPic: item.profile_pic,
                  },
                } as any)
              }
            >
              {picUrl ? (
                <Image source={{ uri: picUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.avatarBg }]}>
                  <Text style={[styles.avatarTxt, { color: colors.avatarText }]}>{getInitial(item)}</Text>
                </View>
              )}
              <View style={styles.chatInfo}>
                <Text style={[styles.name, { color: colors.text }]}>{item.full_name || item.username}</Text>
                <Text style={[styles.lastMsg, { color: colors.subtext }]} numberOfLines={1}>
                  {item.last_message || "No messages yet"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
              Search for a student and start chatting
            </Text>
            <TouchableOpacity
              style={[styles.findBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/search" as any)}
            >
              <Text style={styles.findBtnTxt}>Find Students</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 14 },
  headerTitle: { fontSize: 24, fontWeight: "800", flex: 1 },
  composeBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  searchContainer: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 20, marginVertical: 12,
    borderRadius: 12, paddingHorizontal: 15,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 45, fontSize: 15 },

  chatItem: {
    flexDirection: "row", padding: 16,
    alignItems: "center", borderBottomWidth: 1,
  },
  avatar: { width: 54, height: 54, borderRadius: 27, marginRight: 14 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontWeight: '800', fontSize: 22 },
  chatInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700" },
  lastMsg: { fontSize: 14, marginTop: 3 },

  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  findBtn: { marginTop: 24, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  findBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});