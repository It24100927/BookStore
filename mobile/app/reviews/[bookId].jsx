import { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { API_URL } from "../../constants/api";
import Loader from "../../components/Loader";
import COLORS from "../../constants/colors";

export default function ReviewsScreen() {
  const { bookId, title } = useLocalSearchParams();
  const { token, user } = useAuthStore();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [editingId, setEditingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const currentToken = useAuthStore.getState().token;
      const response = await fetch(`${API_URL}/reviews/book/${bookId}`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch reviews");
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
      setReviewCount(data.reviewCount || 0);
    } catch (_err) {
      Alert.alert("Error", _err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (bookId) fetchReviews(); }, [bookId]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 5) { Alert.alert("Validation", "Review must be at least 5 characters"); return; }
    if (trimmed.length > 500) { Alert.alert("Validation", "Review must be under 500 characters"); return; }

    try {
      setSubmitting(true);
      const isEditing = Boolean(editingId);
      const endpoint = isEditing ? `${API_URL}/reviews/${editingId}` : `${API_URL}/reviews/book/${bookId}`;

      const currentToken = useAuthStore.getState().token;
      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, rating }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to submit review");

      await fetchReviews();
      setText(""); setRating(5); setEditingId(null);
    } catch (_err) {
      Alert.alert("Error", _err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (reviewId) => {
    if (!replyText.trim()) return;
    try {
      const currentToken = useAuthStore.getState().token;
      const response = await fetch(`${API_URL}/reviews/${reviewId}/reply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      await fetchReviews();
      setReplyText(""); setReplyingTo(null);
    } catch (_err) {
      Alert.alert("Error", _err.message);
    }
  };

  const handleDelete = async (reviewId) => {
    Alert.alert("Delete Review", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const currentToken = useAuthStore.getState().token;
            await fetch(`${API_URL}/reviews/${reviewId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${currentToken}` },
            });
            await fetchReviews();
          } catch {
            Alert.alert("Error", "Failed to delete review");
          }
        },
      },
    ]);
  };

  const handleDeleteReply = async (reviewId, replyId) => {
    try {
      const currentToken = useAuthStore.getState().token;
      await fetch(`${API_URL}/reviews/${reviewId}/reply/${replyId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${currentToken}` },
      });
      await fetchReviews();
    } catch {
      Alert.alert("Error", "Failed to delete reply");
    }
  };

  const Stars = ({ count, size = 16, interactive = false, onChange }) => (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} disabled={!interactive} onPress={() => onChange?.(i)} activeOpacity={0.7}>
          <Ionicons
            name={i <= count ? "star" : "star-outline"}
            size={size}
            color={i <= count ? COLORS.star : COLORS.starEmpty}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderItem = ({ item }) => {
    // FIX: use _id (from MongoDB) not .id (React Native shorthand)
    const isOwner = item.user?._id === user?._id;
    const canDelete = isOwner || isAdmin;

    return (
      <View style={s.reviewCard}>
        {/* Review Header */}
        <View style={s.reviewHeader}>
          <Image source={{ uri: item.user?.profileImage }} style={s.avatar} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={s.username}>{item.user?.username || "Unknown"}</Text>
              {item.user?.role === "admin" && (
                <View style={s.adminBadge}><Text style={s.adminBadgeText}>Admin</Text></View>
              )}
            </View>
            <Stars count={item.rating} size={13} />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {isOwner && (
              <TouchableOpacity onPress={() => { setEditingId(item._id); setText(item.text); setRating(item.rating || 5); }}>
                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity onPress={() => handleDelete(item._id)}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={s.reviewText}>{item.text}</Text>
        <Text style={s.reviewDate}>{new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</Text>

        {/* Replies */}
        {item.replies?.length > 0 && (
          <View style={s.repliesSection}>
            {item.replies.map((reply) => (
              <View key={reply._id} style={s.replyCard}>
                <Image source={{ uri: reply.user?.profileImage }} style={s.replyAvatar} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={s.replyUsername}>{reply.user?.username}</Text>
                    {reply.user?.role === "admin" && (
                      <View style={s.adminBadgeSm}><Text style={s.adminBadgeSmText}>Admin</Text></View>
                    )}
                  </View>
                  <Text style={s.replyText}>{reply.text}</Text>
                </View>
                {(reply.user?._id === user?._id || isAdmin) && (
                  <TouchableOpacity onPress={() => handleDeleteReply(item._id, reply._id)}>
                    <Ionicons name="close" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Reply trigger */}
        <TouchableOpacity style={s.replyTrigger} onPress={() => setReplyingTo(replyingTo === item._id ? null : item._id)}>
          <Ionicons name="chatbubble-outline" size={14} color={COLORS.primaryLight} />
          <Text style={s.replyTriggerText}>{replyingTo === item._id ? "Cancel" : "Reply"}</Text>
        </TouchableOpacity>

        {replyingTo === item._id && (
          <View style={s.replyInputRow}>
            <TextInput
              style={s.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Write a reply..."
              placeholderTextColor={COLORS.placeholderText}
            />
            <TouchableOpacity style={s.replySendBtn} onPress={() => handleReply(item._id)}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) return <Loader />;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View>
            {/* Back Button + Title */}
            <View style={s.topBar}>
              <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.screenTitle}>Reviews & Ratings</Text>
                <Text style={s.bookTitle} numberOfLines={1}>{title || "Book"}</Text>
              </View>
            </View>

            {/* Average Rating */}
            {reviewCount > 0 && (
              <View style={s.avgCard}>
                <View style={s.avgLeft}>
                  <Text style={s.avgNumber}>{Number(averageRating).toFixed(1)}</Text>
                  <Stars count={Math.round(averageRating)} size={20} />
                  <Text style={s.avgCount}>{reviewCount} review{reviewCount !== 1 ? "s" : ""}</Text>
                </View>
              </View>
            )}

            {/* Write Review (customers only) */}
            {!isAdmin && (
              <View style={s.inputCard}>
                <Text style={s.inputLabel}>{editingId ? "✏️ Edit Your Review" : "✍️ Write a Review"}</Text>
                <Stars count={rating} size={30} interactive onChange={setRating} />
                <TextInput
                  style={s.textArea}
                  value={text}
                  onChangeText={(t) => { if (t.length <= 500) setText(t); }}
                  multiline
                  placeholder="Share your thoughts (5–500 chars)..."
                  placeholderTextColor={COLORS.placeholderText}
                />
                <View style={s.inputFooter}>
                  <Text style={[s.charCount, text.trim().length > 480 && { color: COLORS.warning }]}>
                    {text.trim().length}/500
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {editingId && (
                      <TouchableOpacity style={s.cancelBtn} onPress={() => { setEditingId(null); setText(""); setRating(5); }}>
                        <Text style={s.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
                      {submitting ? <ActivityIndicator color="#fff" size="small" /> : (
                        <Text style={s.submitText}>{editingId ? "Update" : "Post Review"}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="chatbubbles-outline" size={56} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No reviews yet</Text>
            <Text style={s.emptyDesc}>Be the first to share your thoughts!</Text>
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 20, paddingBottom: 40 },

  topBar: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.cardBackground,
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.border,
  },
  screenTitle: { fontSize: 22, fontWeight: "800", color: COLORS.textDark },
  bookTitle: { fontSize: 13, color: COLORS.primaryLight, fontWeight: "600", marginTop: 2 },

  // Avg rating
  avgCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.cardBackground,
    borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  avgLeft: { alignItems: "center", gap: 6 },
  avgNumber: { fontSize: 48, fontWeight: "900", color: COLORS.star, lineHeight: 52 },
  avgCount: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  // Input
  inputCard: {
    backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: COLORS.borderGlow,
  },
  inputLabel: { fontSize: 16, fontWeight: "700", color: COLORS.textDark, marginBottom: 12 },
  textArea: {
    backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 14,
    color: COLORS.textPrimary, fontSize: 14, minHeight: 90, textAlignVertical: "top", marginTop: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  inputFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  charCount: { fontSize: 12, color: COLORS.textMuted },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: COLORS.cardBackground },
  cancelText: { color: COLORS.textSecondary, fontWeight: "600" },
  submitBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: COLORS.primary },
  submitText: { color: "#fff", fontWeight: "700" },

  // Review card
  reviewCard: {
    backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: COLORS.border },
  username: { fontSize: 14, fontWeight: "700", color: COLORS.textDark, marginBottom: 3 },
  adminBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adminBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  reviewText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 21, marginBottom: 6 },
  reviewDate: { fontSize: 11, color: COLORS.textMuted },

  // Replies
  repliesSection: { marginTop: 12, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: COLORS.primaryGlow },
  replyCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10, paddingVertical: 4 },
  replyAvatar: { width: 26, height: 26, borderRadius: 13 },
  replyUsername: { fontSize: 12, fontWeight: "700", color: COLORS.textDark },
  adminBadgeSm: { backgroundColor: COLORS.primary, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  adminBadgeSmText: { color: "#fff", fontSize: 8, fontWeight: "700" },
  replyText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },

  replyTrigger: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  replyTriggerText: { fontSize: 13, color: COLORS.primaryLight, fontWeight: "600" },
  replyInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  replyInput: {
    flex: 1, backgroundColor: COLORS.cardBackground, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, color: COLORS.textPrimary, fontSize: 13, borderWidth: 1, borderColor: COLORS.border,
  },
  replySendBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center",
  },

  // Empty
  empty: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: COLORS.textPrimary, marginTop: 14 },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
});
