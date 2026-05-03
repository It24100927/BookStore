import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { validateEmail, validatePassword, validateUsername } from "../../lib/validation";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const { isLoading, register } = useAuthStore();
  const router = useRouter();

  const validate = () => {
    const e = {};
    if (!validateUsername(username)) e.username = "Username must be at least 3 characters";
    if (!validateEmail(email)) e.email = "Enter a valid email address";
    if (!validatePassword(password)) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    const result = await register(username, email, password);
    if (!result.success) setErrors({ general: result.error });
  };

  const clearError = (field) => setErrors((e) => ({ ...e, [field]: null, general: null }));

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={s.brand}>
          <View style={s.logoRing}>
            <Ionicons name="book" size={32} color={COLORS.primary} />
          </View>
          <Text style={s.appName}>BookWorm</Text>
          <Text style={s.tagline}>Join thousands of readers today</Text>
        </View>

        {/* Form Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Create Account</Text>
          <Text style={s.cardSub}>Start your reading journey</Text>

          {errors.general && (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
              <Text style={s.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          {/* Username */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Username</Text>
            <View style={[
              s.inputRow,
              focusedField === "username" && s.inputRowFocused,
              errors.username && s.inputRowError,
            ]}>
              <Ionicons
                name="person-outline" size={18}
                color={focusedField === "username" ? COLORS.primary : COLORS.textMuted}
              />
              <TextInput
                style={s.input}
                placeholder="e.g. johndoe"
                placeholderTextColor={COLORS.placeholderText}
                value={username}
                onChangeText={(t) => { setUsername(t); clearError("username"); }}
                autoCapitalize="none"
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
              <Ionicons
                name="mail-outline" size={18}
                color={focusedField === "email" ? COLORS.primary : COLORS.textMuted}
              />
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.placeholderText}
                value={email}
                onChangeText={(t) => { setEmail(t); clearError("email"); }}
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
              <Ionicons
                name="lock-closed-outline" size={18}
                color={focusedField === "password" ? COLORS.primary : COLORS.textMuted}
              />
              <TextInput
                style={s.input}
                placeholder="Min. 6 characters"
                placeholderTextColor={COLORS.placeholderText}
                value={password}
                onChangeText={(t) => { setPassword(t); clearError("password"); }}
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={18} color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={s.fieldError}>{errors.password}</Text>}
          </View>

          {/* Password requirements hint */}
          <View style={s.hint}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
            <Text style={s.hintText}>At least 6 characters. Use a mix of letters and numbers.</Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.btn, isLoading && s.btnLoading]}
            onPress={handleSignUp}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={s.btnText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>Already a member?</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity style={s.loginBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={s.loginBtnText}>Sign In Instead</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.legal}>
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 40 },

  brand: { alignItems: "center", marginBottom: 32 },
  logoRing: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: COLORS.primaryGlow,
    borderWidth: 1.5, borderColor: COLORS.primaryBorder,
    justifyContent: "center", alignItems: "center", marginBottom: 14,
  },
  appName: { fontSize: 30, fontWeight: "800", color: COLORS.textDark, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: COLORS.cardBackground, borderRadius: 24,
    padding: 24, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 10,
  },
  cardTitle: { fontSize: 22, fontWeight: "800", color: COLORS.textDark, marginBottom: 4 },
  cardSub: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },

  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.dangerBg, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: COLORS.danger + "50", marginBottom: 16,
  },
  errorBannerText: { color: COLORS.danger, fontSize: 13, fontWeight: "600", flex: 1 },

  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
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

  hint: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 20, opacity: 0.75 },
  hintText: { flex: 1, fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },

  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14, height: 54, marginTop: 4,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnLoading: { opacity: 0.75 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 13, color: COLORS.textMuted, fontWeight: "600" },

  loginBtn: {
    borderWidth: 1.5, borderColor: COLORS.primaryBorder, borderRadius: 14,
    height: 50, justifyContent: "center", alignItems: "center",
    backgroundColor: COLORS.primaryGlow,
  },
  loginBtnText: { color: COLORS.primaryLight, fontSize: 15, fontWeight: "700" },

  legal: { fontSize: 11, color: COLORS.textMuted, textAlign: "center", marginTop: 24, lineHeight: 16 },
});
