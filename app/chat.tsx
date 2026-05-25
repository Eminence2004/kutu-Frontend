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

export default function ChatScreen() {
  const { receiverId, name, profilePic } = useLocalSearchParams(); // Ensure profilePic is passed via router
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [myId, setMyId] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  useEffect(() => {
    const getMyId = async () => {
      const id = await AsyncStorage.getItem("userId");
      if (id) setMyId(parseInt(id));
    };
    getMyId();
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [receiverId]);

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await fetch(`${BASE_URL}/api/chat/${receiverId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const messageToSend = inputText.trim();
    setInputText("");

    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await fetch(`${BASE_URL}/api/chat/${receiverId}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: messageToSend }),
      });
      if (res.ok) fetchMessages();
      else setInputText(messageToSend);
    } catch (e) {
      setInputText(messageToSend);
    }
  };

  const renderItem = ({ item }: any) => {
    const isMine = item.sender === myId;
    return (
      <View
        style={[
          styles.msgWrapper,
          isMine ? styles.myMsgWrapper : styles.theirMsgWrapper,
        ]}
      >
        {/* LABEL 2: Sender Profile Pic beside the bubble */}
        {!isMine && (
          <Image
            source={{
              uri: item.sender_pfp
                ? `${BASE_URL}${item.sender_pfp}`
                : "https://via.placeholder.com/30",
            }}
            style={styles.bubblePfp}
          />
        )}

        <View
          style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}
        >
          <Text
            style={[
              styles.msgText,
              isMine ? styles.myMsgText : styles.theirMsgText,
            ]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER: Pushed down for punch-hole and including Profile Pic (Label 1) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Image
            source={{
              uri: profilePic
                ? `${BASE_URL}${profilePic}`
                : "https://via.placeholder.com/40",
            }}
            style={styles.headerPfp}
          />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {name || "Chat"}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    // Fixes the punch-hole overlap on Android
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#fff",
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  headerPfp: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  backBtn: { padding: 5 },
  listContent: { padding: 15, paddingBottom: 20 },
  msgWrapper: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  myMsgWrapper: { justifyContent: "flex-end" },
  theirMsgWrapper: { justifyContent: "flex-start" },
  bubblePfp: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 2,
    backgroundColor: "#f1f5f9",
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: "75%",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  myBubble: { backgroundColor: "#2b59c3", borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: "#f1f5f9", borderBottomLeftRadius: 4 },
  msgText: { fontSize: 16, lineHeight: 20 },
  myMsgText: { color: "#fff" },
  theirMsgText: { color: "#334155" },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    backgroundColor: "#fff",
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sendBtn: {
    backgroundColor: "#2b59c3",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
});
