import { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";

const ICONS = {
  success: { name: "checkmark-circle", color: COLORS.success },
  error: { name: "close-circle", color: COLORS.danger },
  info: { name: "information-circle", color: COLORS.info },
  warning: { name: "warning", color: COLORS.warning },
};

/**
 * Usage: <Toast visible={show} message="Done!" type="success" onHide={() => setShow(false)} />
 */
export default function Toast({ visible, message, type = "success", duration = 2500, onHide }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 20, duration: 250, useNativeDriver: true }),
        ]).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;
  const icon = ICONS[type] || ICONS.info;

  return (
    <Animated.View style={[s.container, { opacity, transform: [{ translateY }] }]}>
      <View style={[s.inner, { borderLeftColor: icon.color }]}>
        <Ionicons name={icon.name} size={22} color={icon.color} />
        <Text style={s.text} numberOfLines={3}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
});
