import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { BASE_URL } from "../constants/constants";

const CommentsScreen = () => {
  const { postId } = useLocalSearchParams();
  const router = useRouter();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // NEW: State to store the actual keyboard height
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (postId) fetchComments();

    // Listeners to get the exact keyboard height on Android/iOS
    const showSub = Keyboard.addListener(
      Platform.OS === "android" ? "keyboardDidShow" : "keyboardWillShow",
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "android" ? "keyboardDidHide" : "keyboardWillHide",
      () => setKeyboardHeight(0),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [postId]);

  const fetchComments = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.get(
        `${BASE_URL}/api/posts/${postId}/comments/`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setComments(response.data);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId]);

  const handlePostComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.post(
        `${BASE_URL}/api/posts/${postId}/comments/`,
        { text: trimmed },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status === 201 || response.status === 200) {
        setNewComment("");
        Keyboard.dismiss();
        fetchComments();
      }
    } catch (error: any) {
      Alert.alert("Error", "Could not post your comment.");
    }
  };

  const renderComment = ({ item }: any) => (
    <View style={styles.commentContainer}>
      <Image
        source={{
          uri: item.profile_pic
            ? item.profile_pic.startsWith("http")
              ? item.profile_pic
              : `${BASE_URL}${item.profile_pic}`
            : `https://ui-avatars.com/api/?name=${item.user}&background=random`,
        }}
        style={styles.profilePic}
      />
      <View style={styles.commentTextContainer}>
        <Text style={styles.username}>{item.user}</Text>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtnWrapper}
          >
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Comment List */}
        <FlatList
          data={comments}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderComment}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchComments} />
          }
          ListEmptyComponent={
            !loading && <Text style={styles.emptyText}>No comments yet.</Text>
          }
        />

        {/* Input Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor="#94a3b8"
              value={newComment}
              onChangeText={setNewComment}
              onSubmitEditing={handlePostComment}
              // Helps Android realize it should stay focused
              disableFullscreenUI={true}
            />
            <TouchableOpacity
              onPress={handlePostComment}
              disabled={!newComment.trim()}
              style={styles.sendButtonContainer}
            >
              <Text
                style={[
                  styles.sendButton,
                  { color: newComment.trim() ? "#2b59c3" : "#cbd5e1" },
                ]}
              >
                Post
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtnWrapper: { paddingVertical: 5 },
  backButton: { fontSize: 16, color: "#2b59c3", fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  listContent: { padding: 15, paddingBottom: 20 },
  commentContainer: { flexDirection: "row", marginBottom: 16 },
  profilePic: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
    backgroundColor: "#eee",
  },
  commentTextContainer: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 16,
  },
  username: {
    fontWeight: "700",
    fontSize: 13,
    color: "#1e293b",
    marginBottom: 2,
  },
  commentText: { fontSize: 14, color: "#334155", lineHeight: 18 },
  emptyText: { textAlign: "center", marginTop: 50, color: "#94a3b8" },
  bottomBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#f1f5f9",
    // Base padding for when keyboard is closed
    paddingBottom: Platform.OS === "ios" ? 10 : 5,
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 45,
    backgroundColor: "#f8fafc",
    borderRadius: 22,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    color: "#0f172a",
  },
  sendButtonContainer: { paddingLeft: 12 },
  sendButton: { fontWeight: "800", fontSize: 16 },
});

export default CommentsScreen;
