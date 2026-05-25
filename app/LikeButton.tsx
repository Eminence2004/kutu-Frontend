import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useRef, useState } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity
} from "react-native";

// Ensure this matches your current IP from the Comments screen
import { BASE_URL } from "../constants/constants";

const LikeButton = ({ postId, initialLiked, initialCount }) => {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  // Animation value for the heart "pop"
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handleLike = async () => {
    // 1. Trigger Animation
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.4,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Optimistic Update (Immediate UI change)
    const newLikedStatus = !isLiked;
    setIsLiked(newLikedStatus);
    setCount(newLikedStatus ? count + 1 : count - 1);

    // 3. Backend Sync
    try {
      const token = await AsyncStorage.getItem("access_token");
      const response = await axios.post(
        `${BASE_URL}/api/posts/${postId}/like/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Sync with exact server count in case of multiple likers
      setCount(response.data.likes_count);
    } catch (error) {
      console.error("Like error:", error);
      // Rollback UI if the request fails
      setIsLiked(isLiked);
      setCount(count);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleLike}
      style={styles.container}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <Ionicons
          name={isLiked ? "heart" : "heart-outline"}
          size={26}
          color={isLiked ? "#ff2d55" : "#333"}
        />
      </Animated.View>
      <Text style={styles.countText}>{count}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingRight: 15,
  },
  countText: {
    marginLeft: 6,
    fontWeight: "600",
    fontSize: 15,
    color: "#333",
  },
});

export default LikeButton;
