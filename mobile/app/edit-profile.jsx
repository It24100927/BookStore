import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Image } from "expo-image";
import { useAuthStore } from "../store/authStore";
import COLORS from "../constants/colors";

const COUNTRIES = [
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "Italy", code: "+39", flag: "🇮🇹" },
  { name: "Spain", code: "+34", flag: "🇪🇸" },
  { name: "Switzerland", code: "+41", flag: "🇨🇭" },
  { name: "Netherlands", code: "+31", flag: "🇳🇱" },
  { name: "Sweden", code: "+46", flag: "🇸🇪" },
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "China", code: "+86", flag: "🇨🇳" },
  { name: "Japan", code: "+81", flag: "🇯🇵" },
  { name: "South Korea", code: "+82", flag: "🇰🇷" },
  { name: "Brazil", code: "+55", flag: "🇧🇷" },
  { name: "Mexico", code: "+52", flag: "🇲🇽" },
  { name: "Argentina", code: "+54", flag: "🇦🇷" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "Nigeria", code: "+234", flag: "🇳🇬" },
  { name: "Egypt", code: "+20", flag: "🇪🇬" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "United Arab Emirates", code: "+971", flag: "🇦🇪" },
  { name: "Singapore", code: "+65", flag: "🇸🇬" },
  { name: "New Zealand", code: "+64", flag: "🇳🇿" },
  { name: "Russia", code: "+7", flag: "🇷🇺" },
  { name: "Turkey", code: "+90", flag: "🇹🇷" },
  { name: "Sri Lanka", code: "+94", flag: "🇱🇰" },
  { name: "Pakistan", code: "+92", flag: "🇵🇰" },
  { name: "Bangladesh", code: "+880", flag: "🇧🇩" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Philippines", code: "+63", flag: "🇵🇭" },
  { name: "Vietnam", code: "+84", flag: "🇻🇳" },
  { name: "Thailand", code: "+66", flag: "🇹🇭" },
  { name: "Malaysia", code: "+60", flag: "🇲🇾" },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, isLoading, updateProfile } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [mobileCode, setMobileCode] = useState(user?.mobile?.countryCode || "+1");
  const [mobileFlag, setMobileFlag] = useState(user?.mobile?.flag || "🇺🇸");
  const [mobileNumber, setMobileNumber] = useState(user?.mobile?.number || "");

  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  
  // Delivery Address
  const [street, setStreet] = useState(user?.address?.street || "");
  const [postalCode, setPostalCode] = useState(user?.address?.postalCode || "");
  const [country, setCountry] = useState(user?.address?.country || "");
  
  // Payment Card
  const [cardNumber, setCardNumber] = useState(user?.paymentCard?.cardNumber || "");
  const [expiryDate, setExpiryDate] = useState(user?.paymentCard?.expiryDate || "");
  const [cvv, setCvv] = useState(user?.paymentCard?.cvv || "");

  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [profileImageBase64, setProfileImageBase64] = useState(null);

  const handleSave = async () => {
    let paymentCard = null;
    if (cardNumber || expiryDate || cvv) {
      if (!cardNumber || !expiryDate || !cvv) {
        Alert.alert("Validation", "Please fill out all card details if you wish to save a payment method.");
        return;
      }
      paymentCard = { cardNumber, expiryDate, cvv };
    }

    const address = { street, postalCode, country };
    const mobile = { countryCode: mobileCode, number: mobileNumber, flag: mobileFlag };

    let imagePayload = undefined;
    if (profileImageBase64 && profileImage) {
      const ext = profileImage.split('.').pop() || 'jpeg';
      imagePayload = `data:image/${ext.toLowerCase()};base64,${profileImageBase64}`;
    }

    const result = await updateProfile({ username, email, password, profileImage: imagePayload, mobile, address, paymentCard });

    if (!result.success) {
      Alert.alert("Error", result.error);
      return;
    }

    Alert.alert("Success", result.message || "Profile updated successfully");
    router.back();
  };

  const pickImage = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission", "Need camera roll permissions"); return; }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images", allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
        setProfileImageBase64(result.assets[0].base64 || await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'base64' }));
      }
    } catch (error) { Alert.alert("Error", "Problem selecting image"); }
  };

  const renderCardType = () => {
    const cleanNum = cardNumber.replace(/\s+/g, '');
    if (/^4/.test(cleanNum)) return "VISA";
    if (/^5[1-5]/.test(cleanNum) || /^22/.test(cleanNum)) return "MASTERCARD";
    return "";
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Avatar Section */}
        <View style={s.avatarSection}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={s.avatarContainer}>
            <Image source={{ uri: profileImage }} style={s.avatarImage} contentFit="cover" />
            <View style={s.avatarEditBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Details Block */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Account Details</Text>
          
          <Text style={s.label}>Username</Text>
          <TextInput
            style={s.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="Your username"
            placeholderTextColor={COLORS.placeholderText}
          />

          <Text style={s.label}>Email Address</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={COLORS.placeholderText}
          />

          <Text style={s.label}>Mobile Number</Text>
          <View style={s.phoneRow}>
            <TouchableOpacity style={s.countryPickerBtn} onPress={() => setCountryModalVisible(true)}>
              <Text style={s.countryFlag}>{mobileFlag}</Text>
              <Text style={s.countryCode}>{mobileCode}</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              keyboardType="phone-pad"
              placeholder="(555) 123-4567"
              placeholderTextColor={COLORS.placeholderText}
            />
          </View>

          <Text style={[s.label, { marginTop: 16 }]}>New Password (Optional)</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Leave blank to keep current"
            placeholderTextColor={COLORS.placeholderText}
          />
        </View>

        {/* Address Block — customers only */}
        {!isAdmin && (
        <View style={s.card}>
          <Text style={s.sectionLabel}>Delivery Address</Text>
          <Text style={s.label}>Street Address</Text>
          <TextInput
            style={[s.input, { height: 80, textAlignVertical: "top", paddingTop: 14 }]}
            value={street}
            onChangeText={setStreet}
            multiline
            placeholder="e.g. 123 Main St, Apt 4B"
            placeholderTextColor={COLORS.placeholderText}
          />

          <View style={s.row}>
            <View style={s.half}>
              <Text style={s.label}>Postal Code</Text>
              <TextInput
                style={s.input}
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="10001"
                placeholderTextColor={COLORS.placeholderText}
              />
            </View>
            <View style={s.half}>
              <Text style={s.label}>Country</Text>
              <TextInput
                style={s.input}
                value={country}
                onChangeText={setCountry}
                placeholder="USA"
                placeholderTextColor={COLORS.placeholderText}
              />
            </View>
          </View>
          <Text style={s.helper}>This address will be used for your book deliveries.</Text>
        </View>
        )}

        {/* Payment Method Block — customers only */}
        {!isAdmin && (
        <View style={s.card}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionLabel}>Payment Method</Text>
            {renderCardType() === "VISA" && (
              <Image source="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" style={{ width: 40, height: 16 }} contentFit="contain" />
            )}
            {renderCardType() === "MASTERCARD" && (
              <Image source="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/512px-MasterCard_Logo.svg.png" style={{ width: 40, height: 24 }} contentFit="contain" />
            )}
            {!renderCardType() && (
              <Ionicons name="card-outline" size={20} color={COLORS.textSecondary} />
            )}
          </View>
          
          <Text style={s.label}>Card Number</Text>
          <TextInput
            style={s.input}
            value={cardNumber}
            onChangeText={setCardNumber}
            keyboardType="number-pad"
            maxLength={19}
            placeholder="XXXX XXXX XXXX XXXX"
            placeholderTextColor={COLORS.placeholderText}
          />

          <View style={s.row}>
            <View style={s.half}>
              <Text style={s.label}>Expiry Date</Text>
              <TextInput
                style={s.input}
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="MM/YY"
                maxLength={5}
                placeholderTextColor={COLORS.placeholderText}
              />
            </View>
            <View style={s.half}>
              <Text style={s.label}>CVV</Text>
              <TextInput
                style={s.input}
                value={cvv}
                onChangeText={setCvv}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                placeholder="123"
                placeholderTextColor={COLORS.placeholderText}
              />
            </View>
          </View>
          <Text style={s.helper}>Added securely. Leave blank if you prefer Cash on Delivery.</Text>
        </View>
        )}

        <TouchableOpacity style={s.button} onPress={handleSave} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.buttonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Country Modal */}
      <Modal visible={countryModalVisible} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setCountryModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.name}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={s.modalRow} 
                  onPress={() => {
                    setMobileCode(item.code);
                    setMobileFlag(item.flag);
                    setCountryModalVisible(false);
                  }}
                >
                  <Text style={s.modalFlag}>{item.flag}</Text>
                  <Text style={s.modalCountryName}>{item.name}</Text>
                  <Text style={s.modalCountryCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: COLORS.cardBackground, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textDark },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  // Avatar
  avatarSection: { alignItems: "center", marginBottom: 20 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary },
  avatarImage: { width: "100%", height: "100%", borderRadius: 50 },
  avatarEditBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: COLORS.primary, width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: COLORS.cardBackground },

  card: { backgroundColor: COLORS.cardBackground, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  sectionLabel: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  
  label: { fontSize: 12, fontWeight: "700", color: COLORS.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, height: 50, color: COLORS.textPrimary, fontSize: 15, marginBottom: 16 },
  
  // Phone Pickers
  phoneRow: { flexDirection: "row", gap: 12 },
  countryPickerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background, borderWidth: 1, 
    borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, height: 50, gap: 6,
  },
  countryFlag: { fontSize: 20 },
  countryCode: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },

  row: { flexDirection: "row", gap: 16 },
  half: { flex: 1 },
  helper: { fontSize: 12, color: COLORS.textMuted, marginTop: -6 },
  
  button: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 10 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: COLORS.cardBackground, height: "60%", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary },
  modalRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 16 },
  modalFlag: { fontSize: 24 },
  modalCountryName: { flex: 1, fontSize: 16, color: COLORS.textDark, fontWeight: "500" },
  modalCountryCode: { fontSize: 15, color: COLORS.textSecondary, fontWeight: "600" },
});
