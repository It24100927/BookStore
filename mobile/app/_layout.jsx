import { SplashScreen, Stack, Redirect } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "../components/SafeScreen";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

// This inner component handles auth redirects.
// It ONLY runs after the <Stack> (the Root Layout navigator) has mounted,
// which is the key requirement for Expo Router v6.
function AuthGate() {
  const { user, token } = useAuthStore();
  const segments = require("expo-router").useSegments();

  const inAuthScreen = segments[0] === "(auth)";
  const isSignedIn = user && token;

  if (!isSignedIn && !inAuthScreen) {
    return <Redirect href="/(auth)" />;
  }

  if (isSignedIn && inAuthScreen) {
    return <Redirect href="/(tabs)" />;
  }

  return null;
}

export default function RootLayout() {
  const { checkAuth, isCheckingAuth } = useAuthStore();
  const { loadCart } = useCartStore();

  const [fontsLoaded] = useFonts({
    "JetBrainsMono-Medium": require("../assets/fonts/JetBrainsMono-Medium.ttf"),
  });

  useEffect(() => {
    checkAuth();
    loadCart();
  }, []);

  useEffect(() => {
    if (fontsLoaded && !isCheckingAuth) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isCheckingAuth]);

  // Don't render anything until auth state and fonts are both ready.
  // This prevents a flash of the wrong screen.
  if (!fontsLoaded || isCheckingAuth) return null;

  return (
    <SafeAreaProvider>
      <SafeScreen>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="admin-book-form" options={{ headerShown: false }} />
          <Stack.Screen name="admin-user-form" options={{ headerShown: false }} />
          <Stack.Screen name="edit-book/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="reviews/[bookId]" options={{ headerShown: false }} />
        </Stack>

        {/* AuthGate renders INSIDE the navigator tree, so navigation is safe */}
        <AuthGate />
      </SafeScreen>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
