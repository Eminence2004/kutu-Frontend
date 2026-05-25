import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import { BASE_URL } from "../../constants/constants";
import { useTheme } from '../../contexts/ThemeContext';

export default function ChatScreen() {
  // id = recipient user ID, name + pic passed as route params from inbox
  const { id, name, pic } = useLocalSearchParams<{
    id: string;
    name?: string;
    pic?: string;
  }>();

  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [myId, setMyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const recipientName = name || "Chat";
  const recipientPic = pic
    ? pic.startsWith("http") ? pic : `${BASE_URL}${pic}`
    : null;

  useEffect(() => {
    loadMyId();
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadMyId = async () => {
    const userId = await AsyncStorage.getItem("user_id");
    if (userId) setMyId(parseInt(userId));
  };

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await fetch(`${BASE_URL}/api/auth/chat/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (Array.isArray(data)) setMessages(data);
    } catch (e) {
      console.error("Chat fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText;
    setInputText("");
    try {
      const token = await AsyncStorage.getItem("userToken");
      await fetch(`${BASE_URL}/api/auth/chat/${id}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: textToSend }),
      });
      fetchMessages();
    } catch (e) {
      console.error("Send error:", e);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* ── Custom header with recipient name + pic ── */}
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              {recipientPic ? (
                <Image source={{ uri: recipientPic }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatarFallback, { backgroundColor: colors.highlight }]}>
                  <Text style={[styles.headerAvatarInitial, { color: colors.primary }]}>
                    {recipientName[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
              )}
              <View>
                <Text style={[styles.headerName, { color: colors.text }]}>{recipientName}</Text>
                <Text style={[styles.headerOnline, { color: colors.success }]}>Online</Text>
              </View>
            </View>
          ),
        }}
      />

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 4 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: colors.background }}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            No messages yet. Say hello! 👋
          </Text>
        }
        renderItem={({ item }) => {
          const isMe = item.sender === myId || item.sender?.id === myId;
          return (
            <View style={[styles.msgBubble, isMe ? styles.myMsg : [styles.theirMsg, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]]}>
              <Text style={[isMe ? styles.myText : styles.theirText, !isMe && { color: colors.text }]}>
                {item.text}
              </Text>
            </View>
          );
        }}
      />

      {/* ── Input bar — always above keyboard ── */}
      {/* Using SafeAreaView + absolute positioning avoids KeyboardAvoidingView issues on Android */}
      <View style={[styles.inputArea, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: colors.text }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={colors.subtext}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={[styles.sendBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarFallback: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: "center", alignItems: "center",
  },
  headerAvatarInitial: { fontSize: 16, fontWeight: "800" },
  headerName: { fontSize: 15, fontWeight: "700" },
  headerOnline: { fontSize: 11, marginTop: 1 },

  // Messages
  msgBubble: {
    padding: 12,
    borderRadius: 18,
    marginVertical: 3,
    marginHorizontal: 12,
    maxWidth: "75%",
  },
  myMsg: {
    alignSelf: "flex-end",
    backgroundColor: "#2b59c3",
    borderBottomRightRadius: 4,
  },
  theirMsg: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  myText: { color: "#fff", fontSize: 15, lineHeight: 20 },
  theirText: { fontSize: 15, lineHeight: 20 },
  emptyText: { textAlign: "center", marginTop: 60, fontSize: 14 },

  // Input
  inputArea: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === "android" ? 12 : 20,
    alignItems: "center",
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  sendBtn: {
    marginLeft: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});