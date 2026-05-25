// app/_layout.tsx
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { ThemeProvider } from './contexts/ThemeContext';

const { height } = Dimensions.get("window");
const KUTU_BLUE = "#2b59c3";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [animationFinished, setAnimationFinished] = useState(false);
  const slideUp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function prepare() {
      await SplashScreen.hideAsync();
      Animated.timing(slideUp, {
        toValue: -height,
        duration: 600,
        delay: 2000,
        useNativeDriver: true,
      }).start(() => setAnimationFinished(true));
    }
    prepare();
  }, []);

  return (
    <ThemeProvider>
      <View style={styles.master}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="CommentsScreen"
            options={{
              headerShown: true,
              title: "Comments",
              headerTintColor: KUTU_BLUE,
              headerBackTitle: "Back",
              presentation: "card",
            }}
          />
          <Stack.Screen name="signup" options={{ presentation: "modal" }} />
        </Stack>

        {!animationFinished && (
          <Animated.View style={[styles.splashOverlay, { transform: [{ translateY: slideUp }] }]}>
            <Image source={require("../assets/images/kutu-logo.jpg")} style={styles.logo} />
            <Text style={styles.splashText}>sei kutu sei bam</Text>
          </Animated.View>
        )}
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  master: { flex: 1, backgroundColor: "transparent" },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: KUTU_BLUE,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
  logo: { width: 160, height: 160, marginBottom: 15, borderRadius: 20 },
  splashText: { color: "white", fontSize: 28, fontWeight: "900" },
});