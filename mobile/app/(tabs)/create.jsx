import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import COLORS from "../../constants/colors";

// This tab is hidden from the tab bar.
// Book creation is now admin-only via the admin-book-form screen.
export default function Create() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if someone navigates here directly
    router.replace("/");
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
      }}
    >
      <Text style={{ color: COLORS.textSecondary }}>Redirecting...</Text>
    </View>
  );
}
