// app/(tabs)/explore.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { BASE_URL } from "../../constants/constants";
import { useTheme } from '../contexts/ThemeContext';

const absUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
};

export default function ExploreScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<number[]>([]);

  const fetchPosts = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await fetch(`${BASE_URL}/api/posts/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Sort by likes for "trending"
        const sorted = [...data].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        setPosts(sorted);
        const liked = data.filter((p: any) => p.is_liked_by_me).map((p: any) => p.id);
        setLikedPosts(liked);
      }
    } catch (e) {
      console.error("Explore fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      setLikedPosts(prev =>
        prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
      );
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, likes_count: p.likes_count + (likedPosts.includes(postId) ? -1 : 1) }
            : p
        )
      );
      await fetch(`${BASE_URL}/api/posts/${postId}/like/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Like error:", e);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const trendingPost = posts[0];
  const recentPosts = posts.slice(1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border, marginTop: Platform.OS === "android" ? 40 : 0 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Explore KsTU 📍</Text>
          <Text style={[styles.headerSub, { color: colors.subtext }]}>Discover what's happening on campus</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPosts(); }} tintColor={colors.primary} />
          }
        >
          {/* ── Quick Actions ── */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/map" as any)}
            >
              <Ionicons name="map" size={28} color="#fff" />
              <Text style={styles.quickCardTxt}>Campus Map</Text>
              <Text style={styles.quickCardSub}>Navigate anywhere</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff', }]}
              onPress={() => router.push("/search" as any)}
            >
              <Ionicons name="people" size={28} color={colors.primary} />
              <Text style={[styles.quickCardTxt, { color: colors.primary }]}>Find Friends</Text>
              <Text style={[styles.quickCardSub, { color: colors.subtext }]}>Search students</Text>
            </TouchableOpacity>
          </View>

          {/* ── Trending Post ── */}
          {trendingPost && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>🔥 Top Vibe</Text>
                <View style={[styles.badge, { backgroundColor: '#fef2f2' }]}>
                  <Text style={[styles.badgeTxt, { color: '#ef4444' }]}>Trending</Text>
                </View>
              </View>
              <View style={[styles.featuredCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.postMeta}>
                  <View style={[styles.avatar, { backgroundColor: colors.avatarBg }]}>
                    <Text style={[styles.avatarTxt, { color: colors.avatarText }]}>
                      {(trendingPost.user_info?.full_name || trendingPost.full_name || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.postAuthor, { color: colors.text }]}>
                      {trendingPost.user_info?.full_name || trendingPost.full_name || "Student"}
                    </Text>
                    <Text style={[styles.postHandle, { color: colors.subtext }]}>
                      @{trendingPost.user_info?.username || trendingPost.user || ""}
                    </Text>
                  </View>
                  <View style={styles.likeBadge}>
                    <Ionicons name="heart" size={14} color="#ef4444" />
                    <Text style={styles.likeBadgeTxt}>{trendingPost.likes_count || 0}</Text>
                  </View>
                </View>
                {trendingPost.image && (
                  <Image
                    source={{ uri: absUrl(trendingPost.image) ?? trendingPost.image }}
                    style={styles.featuredImage}
                    resizeMode="cover"
                  />
                )}
                {trendingPost.caption ? (
                  <Text style={[styles.postCaption, { color: colors.subtext }]} numberOfLines={2}>
                    {trendingPost.caption}
                  </Text>
                ) : null}
                <View style={[styles.postActions, { borderTopColor: colors.border }]}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(trendingPost.id)}>
                    <Ionicons
                      name={likedPosts.includes(trendingPost.id) ? "heart" : "heart-outline"}
                      size={22} color={likedPosts.includes(trendingPost.id) ? "#ef4444" : colors.actionColor}
                    />
                    <Text style={[styles.actionTxt, { color: colors.actionColor }]}>{trendingPost.likes_count || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push({ pathname: "/CommentsScreen", params: { postId: trendingPost.id } } as any)}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color={colors.actionColor} />
                    <Text style={[styles.actionTxt, { color: colors.actionColor }]}>Comment</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ── Recent Vibes Grid ── */}
          {recentPosts.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>📸 Recent Vibes</Text>
              <View style={styles.grid}>
                {recentPosts.slice(0, 6).map(post => {
                  const imgUrl = absUrl(post.image);
                  const isLiked = likedPosts.includes(post.id);
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => router.push({ pathname: "/CommentsScreen", params: { postId: post.id } } as any)}
                    >
                      {imgUrl ? (
                        <Image source={{ uri: imgUrl }} style={styles.gridImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.gridImage, { backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="image-outline" size={32} color={colors.subtext} />
                        </View>
                      )}
                      <View style={styles.gridMeta}>
                        <Text style={[styles.gridAuthor, { color: colors.text }]} numberOfLines={1}>
                          {post.user_info?.full_name || post.full_name || "Student"}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={13} color={isLiked ? "#ef4444" : colors.subtext} />
                          <Text style={[styles.gridLikes, { color: colors.subtext }]}>{post.likes_count || 0}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Campus Tip ── */}
          <View style={styles.section}>
            <View style={[styles.tipBox, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff', borderColor: isDark ? '#1d4ed8' : '#dbeafe' }]}>
              <Text style={[styles.tipTitle, { color: colors.primary }]}>💡 Campus Tip</Text>
              <Text style={[styles.tipText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                Use the Campus Map on the Home screen to get turn-by-turn directions to any lecture hall, office, or gate.
              </Text>
            </View>
          </View>

          {posts.length === 0 && (
            <View style={styles.centered}>
              <Ionicons name="telescope-outline" size={60} color={colors.border} />
              <Text style={[styles.emptyTxt, { color: colors.subtext }]}>Nothing to explore yet.{'\n'}Be the first to post a vibe!</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },

  header: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 26, fontWeight: '900' },
  headerSub: { fontSize: 13, marginTop: 2 },

  quickRow: { flexDirection: 'row', gap: 12, padding: 20, paddingBottom: 8 },
  quickCard: {
    flex: 1, borderRadius: 20, padding: 18, gap: 6,
  },
  quickCardTxt: { color: '#fff', fontWeight: '800', fontSize: 15, marginTop: 4 },
  quickCardSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  featuredCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  avatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontWeight: '800', fontSize: 16 },
  postAuthor: { fontWeight: '700', fontSize: 14 },
  postHandle: { fontSize: 12, marginTop: 1 },
  likeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  likeBadgeTxt: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  featuredImage: { width: '100%', height: 220 },
  postCaption: { fontSize: 14, lineHeight: 20, padding: 14, paddingTop: 10 },
  postActions: { flexDirection: 'row', gap: 20, padding: 14, borderTopWidth: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionTxt: { fontSize: 13, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '47%', borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  gridImage: { width: '100%', height: 130 },
  gridMeta: { padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridAuthor: { fontSize: 12, fontWeight: '700', flex: 1 },
  gridLikes: { fontSize: 12 },

  tipBox: { borderRadius: 16, padding: 16, borderWidth: 1 },
  tipTitle: { fontWeight: '800', fontSize: 15, marginBottom: 6 },
  tipText: { fontSize: 14, lineHeight: 20 },

  emptyTxt: { fontSize: 15, textAlign: 'center', marginTop: 16, lineHeight: 22 },
});