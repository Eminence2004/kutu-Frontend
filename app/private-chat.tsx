import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
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

export default function PrivateChatScreen() {
  const { recipientId, recipientName, recipientPic } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const id = await AsyncStorage.getItem("userId");
      setCurrentUserId(id);
      fetchMessages();
    };
    init();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [recipientId]);

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await fetch(`${BASE_URL}/api/auth/chat/${recipientId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const text = newMessage;
    setNewMessage("");
    try {
      const token = await AsyncStorage.getItem("userToken");
      await fetch(`${BASE_URL}/api/auth/chat/${recipientId}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      fetchMessages();
    } catch (err) {
      setNewMessage(text);
    }
  };

  const renderMessage = ({ item }: any) => {
    const senderId = item.sender_id || item.sender;
    const isMe = String(senderId) === String(currentUserId);

    return (
      <View style={[styles.messageRow, isMe ? styles.myRow : styles.theirRow]}>
        {!isMe && (
          <Image
            source={{
              uri: item.sender_pfp
                ? item.sender_pfp.startsWith("http")
                  ? item.sender_pfp
                  : `${BASE_URL}${item.sender_pfp}`
                : "https://via.placeholder.com/32",
            }}
            style={styles.msgAvatar}
          />
        )}
        <View style={[
          styles.bubble,
          isMe
            ? { backgroundColor: colors.primary }
            : { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }
        ]}>
          <Text style={[
            styles.text,
            { color: isMe ? '#fff' : colors.text }
          ]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Image
            source={{
              uri: recipientPic
                ? String(recipientPic).startsWith("http")
                  ? String(recipientPic)
                  : `${BASE_URL}${recipientPic}`
                : "https://via.placeholder.com/40",
            }}
            style={styles.headerAvatar}
          />
          <View>
            <Text style={[styles.headerName, { color: colors.text }]}>{recipientName}</Text>
            <Text style={[styles.headerStatus, { color: colors.success }]}>Online</Text>
          </View>
        </View>
      </View>

      {/* ── Messages + Input ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 80}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 15, paddingBottom: 10 }}
          style={{ backgroundColor: colors.background }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        />

        {/* ── Input bar ── */}
        <View style={[styles.inputBar, {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        }]}>
          <TextInput
            style={[styles.input, {
              backgroundColor: isDark ? '#1e293b' : '#f8fafc',
              color: colors.text,
            }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.subtext}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: newMessage.trim() ? colors.primary : colors.border }]}
            onPress={sendMessage}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
  },
  headerInfo: { flexDirection: "row", alignItems: "center", marginLeft: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerName: { fontSize: 17, fontWeight: "700" },
  headerStatus: { fontSize: 12 },

  messageRow: { flexDirection: "row", marginBottom: 12, alignItems: "flex-end" },
  myRow: { justifyContent: "flex-end" },
  theirRow: { justifyContent: "flex-start" },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  bubble: { maxWidth: "75%", padding: 12, borderRadius: 20 },
  text: { fontSize: 16, lineHeight: 22 },

  inputBar: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 0 : 15,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendBtn: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});