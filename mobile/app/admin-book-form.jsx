import { useEffect, useState } from "react";
import {
  View, Text, Platform, KeyboardAvoidingView, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import COLORS from "../constants/colors";
import { API_URL } from "../constants/api";
import { useAuthStore } from "../store/authStore";
import Loader from "../components/Loader";

const CATEGORIES = [
  "Fiction", "Non-Fiction", "Novel", "Science Fiction", "Fantasy",
  "Mystery", "Thriller", "Romance", "Horror", "Biography",
  "Self-Help", "History", "Science", "Technology", "Business",
  "Children", "Poetry", "Comics", "Other"
];

export default function AdminBookForm() {
  const { id } = useLocalSearchParams();
  const isEditing = Boolean(id);
  const router = useRouter();
  const { token } = useAuthStore();

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [price, setPrice] = useState("");
  const [stockCount, setStockCount] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("0");
  const [category, setCategory] = useState("Other");
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [showCategories, setShowCategories] = useState(false);

  useEffect(() => { if (isEditing) fetchBook(); }, [id]);

  const fetchBook = async () => {
    try {
      const currentToken = useAuthStore.getState().token;
      const response = await fetch(`${API_URL}/books/${id}`, { headers: { Authorization: `Bearer ${currentToken}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch book");

      setTitle(data.title);
      setCaption(data.caption);
      setPrice(String(data.price));
      setStockCount(String(data.stockCount));
      setDiscountPercentage(String(data.discountPercentage || 0));
      setCategory(data.category || "Other");
      setImage(data.image);
    } catch (error) {
      Alert.alert("Error", error.message);
      router.back();
    } finally {
      setFetching(false);
    }
  };

  const pickImage = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission", "Need camera roll permissions"); return; }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images", allowsEditing: true, aspect: [3, 4], quality: 0.5, base64: true,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setImageBase64(result.assets[0].base64 || await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'base64' }));
      }
    } catch (error) { Alert.alert("Error", "Problem selecting image"); }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !caption.trim()) { Alert.alert("Validation", "Title and description required"); return; }
    
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) { Alert.alert("Validation", "Valid price required"); return; }
    
    const numStock = Number(stockCount);
    if (isNaN(numStock) || numStock < 0 || !Number.isInteger(numStock)) { Alert.alert("Validation", "Valid stock count required"); return; }

    const numDiscount = Number(discountPercentage);
    if (isNaN(numDiscount) || numDiscount < 0 || numDiscount > 100) { Alert.alert("Validation", "Discount must be between 0 and 100%"); return; }

    if (!isEditing && !imageBase64 && !image) { Alert.alert("Validation", "Book cover image required"); return; }

    try {
      setLoading(true);
      let imagePayload;
      if (imageBase64) {
        const ext = image.split('.').pop() || 'jpeg';
        imagePayload = `data:image/${ext.toLowerCase()};base64,${imageBase64}`;
      }

      const body = { title: title.trim(), caption: caption.trim(), price: numPrice, stockCount: numStock, discountPercentage: numDiscount, category };
      if (imagePayload) body.image = imagePayload;
      if (!isEditing && !imagePayload && image) body.image = image;

      const currentToken = useAuthStore.getState().token;
      const response = await fetch(isEditing ? `${API_URL}/books/${id}` : `${API_URL}/books`, {
        method: isEditing ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) { const d = await response.json(); throw new Error(d.message); }

      Alert.alert("Success", isEditing ? "Book updated" : "Book added");
      router.back();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <Loader />;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEditing ? "Edit Book" : "New Book"}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.imageSection}>
          <TouchableOpacity style={s.imagePicker} onPress={pickImage} activeOpacity={0.8}>
            {image ? (
              <Image source={{ uri: image }} style={s.previewImage} contentFit="cover" />
            ) : (
              <View style={s.imagePlaceholder}>
                <Ionicons name="image-outline" size={48} color={COLORS.textSecondary} />
                <Text style={s.imagePlaceholderText}>Add Cover Image</Text>
              </View>
            )}
            <View style={s.editBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.form}>
          <Text style={s.label}>Book Title</Text>
          <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. The Great Gatsby" placeholderTextColor={COLORS.placeholderText} />

          <Text style={s.label}>Category</Text>
          <TouchableOpacity style={s.catSelector} onPress={() => setShowCategories(!showCategories)}>
            <Text style={s.catText}>{category}</Text>
            <Ionicons name={showCategories ? "chevron-up" : "chevron-down"} size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          {showCategories && (
            <ScrollView nestedScrollEnabled={true} style={s.catDropdown}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={s.catItem} onPress={() => { setCategory(cat); setShowCategories(false); }}>
                  <Text style={[s.catItemText, category === cat && s.catItemTextActive]}>{cat}</Text>
                  {category === cat && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={s.row}>
            <View style={s.half}>
              <Text style={s.label}>Price (Rs.)</Text>
              <TextInput style={s.input} value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" placeholderTextColor={COLORS.placeholderText} />
            </View>
            <View style={s.third}>
              <Text style={s.label}>Discount %</Text>
              <TextInput style={s.input} value={discountPercentage} onChangeText={setDiscountPercentage} placeholder="0" keyboardType="number-pad" placeholderTextColor={COLORS.placeholderText} />
            </View>
            <View style={s.third}>
              <Text style={s.label}>Stock</Text>
              <TextInput style={s.input} value={stockCount} onChangeText={setStockCount} placeholder="0" keyboardType="number-pad" placeholderTextColor={COLORS.placeholderText} />
            </View>
          </View>

          <Text style={s.label}>Description</Text>
          <TextInput style={s.textArea} value={caption} onChangeText={setCaption} placeholder="Book synopsis..." multiline placeholderTextColor={COLORS.placeholderText} />

          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{isEditing ? "Save Changes" : "Publish Book"}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: COLORS.cardBackground, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textDark },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  imageSection: { alignItems: "center", marginBottom: 24 },
  imagePicker: { width: 140, height: 200, borderRadius: 12, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  previewImage: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center" },
  imagePlaceholderText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, fontWeight: "600" },
  editBadge: { position: "absolute", bottom: 10, right: 10, backgroundColor: COLORS.primary, width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: COLORS.cardBackground },
  
  form: { backgroundColor: COLORS.cardBackground, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, height: 50, color: COLORS.textPrimary, fontSize: 15, marginBottom: 20 },
  
  catSelector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, height: 50, marginBottom: 20 },
  catText: { color: COLORS.textPrimary, fontSize: 15 },
  catDropdown: { backgroundColor: COLORS.cardBackground, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20, maxHeight: 200 },
  catItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  catItemText: { color: COLORS.textPrimary, fontSize: 15 },
  catItemTextActive: { color: COLORS.primary, fontWeight: "600" },

  row: { flexDirection: "row", gap: 10 },
  half: { flex: 2 },
  third: { flex: 1.2 },
  textArea: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 16, color: COLORS.textPrimary, fontSize: 15, minHeight: 120, textAlignVertical: "top", marginBottom: 24 },
  
  submitBtn: { backgroundColor: COLORS.primary, height: 54, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
