import { useState } from "react";
import {
  View, Text, Platform, KeyboardAvoidingView, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import COLORS from "../constants/colors";
import { API_URL } from "../constants/api";
import { useAuthStore } from "../store/authStore";
import { validateEmail, validatePassword, validateUsername } from "../lib/validation";

export default function AdminUserForm() {
  const router = useRouter();
  const { token } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!validateUsername(username)) e.username = "Username must be at least 3 characters";
    if (!validateEmail(email)) e.email = "Enter a valid email address";
    if (!validatePassword(password)) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const currentToken = useAuthStore.getState().token;
      const response = await fetch(`${API_URL}/auth/admin/create-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          role,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create user");

      Alert.alert("Success", data.message || "User created successfully", [
        { text: "Create Another", onPress: resetForm },
        { text: "Go Back", onPress: () => router.back() },
      ]);
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setRole("customer");
    setErrors({});
    setShowPassword(false);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* Top Bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create User</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Hero Icon */}
        <View style={s.heroSection}>
          <View style={s.heroIconRing}>
            <Ionicons name="person-add" size={36} color={COLORS.primary} />
          </View>
          <Text style={s.heroTitle}>New Account</Text>
          <Text style={s.heroSub}>Create a new admin or customer account</Text>
        </View>

        {/* Form Card */}
        <View style={s.formCard}>
          {/* General error */}
          {errors.general && (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
              <Text style={s.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          {/* Role Selector */}
          <Text style={s.label}>Account Type</Text>
          <View style={s.roleRow}>
            <TouchableOpacity
              style={[s.roleBtn, role === "customer" && s.roleBtnActive]}
              onPress={() => setRole("customer")}
              activeOpacity={0.8}
            >
              <View style={[s.roleIconBg, role === "customer" && s.roleIconBgActive]}>
                <Ionicons name="person" size={18} color={role === "customer" ? "#fff" : COLORS.textSecondary} />
              </View>
              <Text style={[s.roleBtnText, role === "customer" && s.roleBtnTextActive]}>Customer</Text>
              {role === "customer" && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} style={s.roleCheck} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.roleBtn, role === "admin" && s.roleBtnActiveAdmin]}
              onPress={() => setRole("admin")}
              activeOpacity={0.8}
            >
              <View style={[s.roleIconBg, role === "admin" && s.roleIconBgActiveAdmin]}>
                <Ionicons name="shield-checkmark" size={18} color={role === "admin" ? "#fff" : COLORS.textSecondary} />
              </View>
              <Text style={[s.roleBtnText, role === "admin" && s.roleBtnTextActiveAdmin]}>Admin</Text>
              {role === "admin" && <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} style={s.roleCheck} />}
            </TouchableOpacity>
          </View>

          {/* Username */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Username</Text>
            <View style={[
              s.inputRow,
              focusedField === "username" && s.inputRowFocused,
              errors.username && s.inputRowError,
            ]}>
              <Ionicons name="person-outline" size={18} color={focusedField === "username" ? COLORS.primary : COLORS.textMuted} />
              <TextInput
                style={s.input}
                placeholder="Min. 3 characters"
                placeholderTextColor={COLORS.placeholderText}
                value={username}
                onChangeText={(t) => { setUsername(t); setErrors((e) => ({ ...e, username: null, general: null })); }}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.username && <Text style={s.fieldError}>{errors.username}</Text>}
          </View>

          {/* Email */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Email Address</Text>
            <View style={[
              s.inputRow,
              focusedField === "email" && s.inputRowFocused,
              errors.email && s.inputRowError,
            ]}>
              <Ionicons name="mail-outline" size={18} color={focusedField === "email" ? COLORS.primary : COLORS.textMuted} />
              <TextInput
                style={s.input}
                placeholder="user@example.com"
                placeholderTextColor={COLORS.placeholderText}
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: null, general: null })); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.email && <Text style={s.fieldError}>{errors.email}</Text>}
          </View>

          {/* Password */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Password</Text>
            <View style={[
              s.inputRow,
              focusedField === "password" && s.inputRowFocused,
              errors.password && s.inputRowError,
            ]}>
              <Ionicons name="lock-closed-outline" size={18} color={focusedField === "password" ? COLORS.primary : COLORS.textMuted} />
              <TextInput
                style={s.input}
                placeholder="Min. 6 characters"
                placeholderTextColor={COLORS.placeholderText}
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: null, general: null })); }}
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={s.fieldError}>{errors.password}</Text>}
          </View>

          {/* Info Banner */}
          <View style={s.infoBanner}>
            <Ionicons name="information-circle" size={16} color={COLORS.info} />
            <Text style={s.infoBannerText}>
              {role === "admin"
                ? "Admin accounts have full access to manage books, orders, and users."
                : "Customer accounts can browse, purchase books, and manage orders."}
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, loading && s.submitBtnLoading]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={s.submitText}>Create {role === "admin" ? "Admin" : "Customer"}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    backgroundColor: COLORS.cardBackground, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textDark },

  scrollContent: { padding: 20, paddingBottom: 40 },

  // Hero
  heroSection: { alignItems: "center", marginBottom: 28 },
  heroIconRing: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primaryGlow,
    borderWidth: 1.5, borderColor: COLORS.primaryBorder,
    justifyContent: "center", alignItems: "center", marginBottom: 14,
  },
  heroTitle: { fontSize: 22, fontWeight: "800", color: COLORS.textDark },
  heroSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  // Form Card
  formCard: {
    backgroundColor: COLORS.cardBackground, borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },

  // Error Banner
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.dangerBg, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: COLORS.danger + "50", marginBottom: 16,
  },
  errorBannerText: { color: COLORS.danger, fontSize: 13, fontWeight: "600", flex: 1 },

  // Role Selector
  label: {
    fontSize: 13, fontWeight: "700", color: COLORS.textSecondary,
    marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5,
  },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  roleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.background, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  roleBtnActive: {
    borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow,
  },
  roleBtnActiveAdmin: {
    borderColor: COLORS.accent, backgroundColor: COLORS.accentGlow,
  },
  roleIconBg: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.inputBackground,
    justifyContent: "center", alignItems: "center",
  },
  roleIconBgActive: { backgroundColor: COLORS.primary },
  roleIconBgActiveAdmin: { backgroundColor: COLORS.accent },
  roleBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textSecondary },
  roleBtnTextActive: { color: COLORS.primary, fontWeight: "700" },
  roleBtnTextActiveAdmin: { color: COLORS.accentDark, fontWeight: "700" },
  roleCheck: { marginLeft: "auto" },

  // Fields
  fieldGroup: { marginBottom: 16 },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.inputBackground, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, height: 52,
  },
  inputRowFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.cardAlt },
  inputRowError: { borderColor: COLORS.danger },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary, fontWeight: "500" },
  eyeBtn: { padding: 4 },
  fieldError: { fontSize: 12, color: COLORS.danger, marginTop: 5, fontWeight: "600" },

  // Info Banner
  infoBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: COLORS.infoBg, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: COLORS.info + "30", marginBottom: 20,
  },
  infoBannerText: { color: COLORS.info, fontSize: 12, fontWeight: "500", flex: 1, lineHeight: 18 },

  // Submit
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: COLORS.primary, borderRadius: 14, height: 54,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  submitBtnLoading: { opacity: 0.75 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
