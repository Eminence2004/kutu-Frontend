// app/(tabs)/home.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../../constants/constants";
import { useTheme } from '../contexts/ThemeContext';

// ── Helpers ──────────────────────────────────────────────────────────────────
const absUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
};

/**
 * Converts an ISO timestamp string into a human-readable relative time.
 * e.g. "2 hours ago", "just now", "3 days ago"
 */
const timeAgo = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  // Fall back to a short date for older posts
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// ── Hub Service Button ────────────────────────────────────────────────────────
const HubService = ({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
  colors: any;
}) => (
  <TouchableOpacity style={styles.hubItem} onPress={onPress}>
    <View style={[styles.hubIconBg, {
      backgroundColor: colors.hub,
      borderWidth: 1,
      borderColor: colors.border,
    }]}>
      <Ionicons name={icon} size={26} color={colors.primary} />
    </View>
    <Text style={[styles.hubLabel, { color: colors.hubLabel }]}>{label}</Text>
  </TouchableOpacity>
);

// ── Post Avatar ───────────────────────────────────────────────────────────────
const PostAvatar = ({
  post,
  colors,
  onPress,
}: {
  post: any;
  colors: any;
  onPress?: () => void;
}) => {
  const [imgError, setImgError] = useState(false);

  const picUrl =
    absUrl(post.user_info?.profile_pic_url) ??
    absUrl(post.profile_pic);

  const displayName =
    post.user_info?.full_name || post.full_name || post.user || "S";
  const initial = displayName[0].toUpperCase();

  if (picUrl && !imgError) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <Image
          source={{ uri: picUrl }}
          style={styles.avatarImg}
          onError={() => setImgError(true)}
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.avatar, { backgroundColor: colors.avatarBg }]}>
        <Text style={[styles.avatarTxt, { color: colors.avatarText }]}>{initial}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Home Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const [student, setStudent] = useState<any>(null);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      // Load current username for ownership checks (delete button)
      const storedUsername = await AsyncStorage.getItem("username");
      if (storedUsername) setCurrentUsername(storedUsername);

      const profileRes = await fetch(`${BASE_URL}/api/profile/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setStudent(profileData);
        // Keep AsyncStorage in sync
        await AsyncStorage.setItem("full_name", profileData.full_name || "");
        await AsyncStorage.setItem("username", profileData.username || "");
        setCurrentUsername(profileData.username || storedUsername || "");
      } else {
        const full_name = await AsyncStorage.getItem("full_name");
        const username = await AsyncStorage.getItem("username");
        if (full_name || username) setStudent({ full_name, username });
      }

      const postRes = await fetch(`${BASE_URL}/api/posts/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (postRes.ok) {
        const postData = await postRes.json();
        setPosts(postData);
        const alreadyLiked = postData
          .filter((p: any) => p.is_liked_by_me)
          .map((p: any) => p.id);
        setLikedPosts(alreadyLiked);
      }
    } catch (e) {
      console.error("Home Load Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      setLikedPosts((prev) =>
        prev.includes(postId)
          ? prev.filter((id) => id !== postId)
          : [...prev, postId]
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likes_count: p.likes_count + (likedPosts.includes(postId) ? -1 : 1),
              }
            : p
        )
      );
      const response = await fetch(`${BASE_URL}/api/posts/${postId}/like/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Like failed");
    } catch (e) {
      console.error("Like Error:", e);
      Alert.alert("Error", "Could not process like.");
    }
  };

  /**
   * Delete a post. Shows a confirmation alert first, then calls the API.
   * On success removes it from local state instantly (no need to refetch).
   */
  const handleDelete = async (postId: number) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("userToken");
              const res = await fetch(`${BASE_URL}/api/posts/${postId}/`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok || res.status === 204) {
                // Remove from local state immediately
                setPosts((prev) => prev.filter((p) => p.id !== postId));
              } else {
                Alert.alert("Error", "Could not delete post. Try again.");
              }
            } catch (e) {
              console.error("Delete Error:", e);
              Alert.alert("Error", "Could not delete post. Check your connection.");
            }
          },
        },
      ]
    );
  };

  /**
   * Navigate to another user's profile page.
   * Pass their username as a route param.
   */
  const goToProfile = (username: string) => {
    if (!username) return;
    // If it's the logged-in user's own profile, go to the profile tab
    if (username === currentUsername) {
      router.push("/profile");
    } else {
      router.push({
        pathname: "/user-profile",
        params: { username },
      } as any);
    }
  };

  const greetingName =
    student?.full_name?.trim().split(" ")[0] ||
    student?.username ||
    "Student";

  const headerPicUrl = absUrl(student?.profile_pic);

  useEffect(() => {
    fetchData();
  }, []);

  if (loading)
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.loadingBg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading KsTU Vibes...</Text>
      </View>
    );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>Hi, {greetingName} 👋</Text>
            <Text style={[styles.subGreeting, { color: colors.subtext }]}>Welcome to KsTU Hub</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            {/* Dark mode toggle */}
            <TouchableOpacity
              style={[styles.themeToggleBtn, { backgroundColor: isDark ? '#1e3a5f' : '#f0f9ff' }]}
              onPress={toggleTheme}
            >
              <Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>

            {/* Profile pic button */}
            <TouchableOpacity
              style={[styles.profileBtn, {
                backgroundColor: colors.profileBtnBg,
                borderColor: colors.profileBtnBorder,
              }]}
              onPress={() => router.push("/profile")}
            >
              {headerPicUrl ? (
                <Image source={{ uri: headerPicUrl }} style={styles.headerAvatar} />
              ) : (
                <Ionicons name="person-circle-outline" size={26} color={colors.primary} />
              )}
            </TouchableOpacity>

            {/* Logout button */}
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: colors.logoutBg }]}
              onPress={async () => {
                await AsyncStorage.clear();
                router.replace("/");
              }}
            >
              <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Campus Map Card ── */}
        <TouchableOpacity
          style={[styles.mapCard, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/map" as any)}
        >
          <View style={styles.mapInfo}>
            <Text style={styles.mapTitle}>Campus Map</Text>
            <Text style={styles.mapSubtitle}>Find lecture halls & offices</Text>
            <View style={styles.mapBadge}>
              <Text style={[styles.mapBadgeText, { color: colors.primary }]}>Explore Map</Text>
            </View>
          </View>
          <Ionicons
            name="location"
            size={80}
            color="rgba(255,255,255,0.25)"
            style={styles.mapIcon}
          />
        </TouchableOpacity>

        {/* ── Services Grid ── */}
        <View style={styles.hubGrid}>
          <HubService colors={colors} icon="navigate-circle-outline" label="Directions" onPress={() => router.push("/map" as any)} />
          <HubService colors={colors} icon="chatbubble-ellipses-outline" label="Chat" onPress={() => router.push("/inbox" as any)} />
          <HubService colors={colors} icon="camera-outline" label="Post Vibe" onPress={() => router.push("/create-post" as any)} />
          <HubService colors={colors} icon="search-outline" label="Find Friends" onPress={() => router.push("/search" as any)} />
        </View>

        {/* ── Feed Header ── */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Campus Activity</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.countBadge }]}>
            <Text style={[styles.countText, { color: colors.countText }]}>{posts.length}</Text>
          </View>
        </View>

        {/* ── Posts ── */}
        {posts.map((post) => {
          const authorName =
            post.user_info?.full_name || post.full_name || post.user || "Unknown Student";
          const authorUsername = post.user_info?.username || post.user || "";
          const isLiked = likedPosts.includes(post.id);

          // Show delete only if this post belongs to the logged-in user
          const isOwner =
            !!currentUsername && authorUsername === currentUsername;

          // Timestamp — supports both created_at and timestamp field names
          const timestamp = post.created_at || post.timestamp || null;

          return (
            <View
              key={post.id}
              style={[styles.postCard, {
                backgroundColor: colors.postCard,
                borderColor: colors.postBorder,
              }]}
            >
              <View style={styles.postHeader}>
                {/* ── Tappable Avatar → user profile ── */}
                <PostAvatar
                  post={post}
                  colors={colors}
                  onPress={() => goToProfile(authorUsername)}
                />

                <View style={{ flex: 1 }}>
                  {/* Tappable name too → same profile nav */}
                  <TouchableOpacity onPress={() => goToProfile(authorUsername)} activeOpacity={0.7}>
                    <Text style={[styles.author, { color: colors.text }]}>{authorName}</Text>
                  </TouchableOpacity>

                  {/* Username • timestamp */}
                  <Text style={[styles.time, { color: colors.subtext }]}>
                    @{authorUsername}
                    {timestamp ? ` • ${timeAgo(timestamp)}` : " • KsTU"}
                  </Text>
                </View>

                {/* ── Delete button (owner only) ── */}
                {isOwner && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(post.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={19} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>

              {post.image && (
                <Image
                  source={{ uri: absUrl(post.image) ?? post.image }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              )}

              {post.caption ? (
                <Text style={[styles.postText, { color: colors.subtext }]}>{post.caption}</Text>
              ) : null}

              <View style={[styles.postFooter, { borderTopColor: colors.postFooterBorder }]}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(post.id)}>
                  <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={24}
                    color={isLiked ? "#ef4444" : colors.actionColor}
                  />
                  {post.likes_count > 0 && (
                    <Text style={[styles.actionCount, { color: colors.actionColor }]}>{post.likes_count}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/CommentsScreen",
                      params: { postId: post.id },
                    } as any)
                  }
                >
                  <Ionicons name="chatbubble-outline" size={22} color={colors.actionColor} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {posts.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="camera-reverse-outline" size={50} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.subtext }]}>No vibes posted yet.</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push("/create-post" as any)}
      >
        <Ionicons name="camera" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    marginTop: Platform.OS === "android" ? 40 : 0,
  },
  greeting: { fontSize: 26, fontWeight: "900" },
  subGreeting: { fontSize: 14, fontWeight: "500" },

  themeToggleBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  profileBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  headerAvatar: { width: 42, height: 42, borderRadius: 12 },
  logoutBtn: { padding: 10, borderRadius: 12 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 15, fontWeight: "600" },

  mapCard: {
    padding: 22,
    borderRadius: 28,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 25,
    elevation: 8,
  },
  mapInfo: { flex: 1, zIndex: 1 },
  mapTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  mapSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 4, marginBottom: 18 },
  mapBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  mapBadgeText: { fontWeight: "800", fontSize: 12 },
  mapIcon: { position: "absolute", right: -15, bottom: -15 },

  hubGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  hubItem: { width: "22%", alignItems: "center" },
  hubIconBg: {
    width: 58,
    height: 58,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 0,
  },
  hubLabel: { fontSize: 11, fontWeight: "700", marginTop: 10, textAlign: "center" },

  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  countText: { fontSize: 12, fontWeight: "700" },

  postCard: {
    padding: 15,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 15,
  },

  avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  avatarTxt: { fontWeight: "800", fontSize: 17 },
  avatarImg: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#f1f5f9" },

  author: { fontWeight: "700", fontSize: 15 },
  time: { fontSize: 12, marginTop: 1 },

  // ── NEW: delete button in post header ──
  deleteBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.08)",
  },

  postImage: { width: "100%", height: 260, borderRadius: 18, marginBottom: 12, backgroundColor: "#f1f5f9" },
  postText: { lineHeight: 22, fontSize: 15 },

  postFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 4,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", marginRight: 20, gap: 5 },
  actionCount: { fontSize: 13, fontWeight: "600" },

  emptyState: { alignItems: "center", marginTop: 50, padding: 20 },
  emptyText: { fontSize: 16, marginTop: 10 },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 25,
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
  },
});