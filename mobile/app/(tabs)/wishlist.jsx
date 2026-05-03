import { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { API_URL } from "../../constants/api";
import COLORS from "../../constants/colors";
import Loader from "../../components/Loader";
import Toast from "../../components/Toast";

export default function WishlistScreen() {
  const { token } = useAuthStore();
  const { addToCart, isInCart } = useCartStore();
  const router = useRouter();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
  };

  const fetchWishlist = async () => {
    try {
      const currentToken = useAuthStore.getState().token;
      const response = await fetch(`${API_URL}/wishlist`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch wishlist");
      setBooks(Array.isArray(data) ? data : []);
    } catch (_err) {
      Alert.alert("Error", _err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchWishlist();
  }, []));

  const handleRemove = async (bookId) => {
    try {
      setRemovingId(bookId);
      const currentToken = useAuthStore.getState().token;
      const response = await fetch(`${API_URL}/wishlist/${bookId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!response.ok) throw new Error("Failed to remove");
      setBooks((prev) => prev.filter((b) => b._id !== bookId));
      showToast("Removed from wishlist", "info");
    } catch {
      showToast("Could not remove item", "error");
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = (book) => {
    if (book.stockCount <= 0) {
      showToast("This book is currently out of stock", "warning");
      return;
    }
    addToCart(book);
    showToast(`"${book.title}" added to cart!`, "success");
  };

  const renderItem = ({ item }) => {
    const discountedPrice = item.discountPercentage > 0
      ? item.price * (1 - item.discountPercentage / 100)
      : item.price;
    const inCart = isInCart(item._id);

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.88}
        onPress={() => router.push({ pathname: `/reviews/${item._id}`, params: { title: item.title } })}
      >
        <Image source={item.image} style={s.image} contentFit="cover" />

        {/* Discount Badge */}
        {item.discountPercentage > 0 && (
          <View style={s.discountBadge}>
            <Text style={s.discountText}>-{item.discountPercentage}%</Text>
          </View>
        )}

        <View style={s.info}>
          <Text style={s.category}>{item.category || "Book"}</Text>
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>

          {/* Price */}
          <View style={s.priceRow}>
            {item.discountPercentage > 0 ? (
              <>
                <Text style={s.originalPrice}>Rs. {item.price.toFixed(2)}</Text>
                <Text style={s.price}>Rs. {discountedPrice.toFixed(2)}</Text>
              </>
            ) : (
              <Text style={s.price}>Rs. {item.price.toFixed(2)}</Text>
            )}
          </View>

          {/* Stock */}
          {item.stockCount > 0 ? (
            <View style={s.stockRow}>
              <View style={s.stockDot} />
              <Text style={s.stockText}>{item.stockCount} in stock</Text>
            </View>
          ) : (
            <Text style={s.outOfStock}>Out of Stock</Text>
          )}

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.cartBtn, inCart && s.cartBtnActive, item.stockCount <= 0 && s.cartBtnDisabled]}
              onPress={() => handleAddToCart(item)}
              disabled={item.stockCount <= 0}
            >
              <Ionicons name={inCart ? "cart" : "cart-outline"} size={16} color="#fff" />
              <Text style={s.cartBtnText}>{inCart ? "In Cart" : "Add to Cart"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.removeBtn}
              onPress={() => handleRemove(item._id)}
              disabled={removingId === item._id}
            >
              {removingId === item._id
                ? <ActivityIndicator size="small" color={COLORS.danger} />
                : <Ionicons name="heart-dislike-outline" size={20} color={COLORS.danger} />}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <Loader />;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>My Wishlist</Text>
          <Text style={s.headerSub}>{books.length} saved book{books.length !== 1 ? "s" : ""}</Text>
        </View>
        <View style={[s.headerIcon, { backgroundColor: COLORS.accentGlow }]}>
          <Ionicons name="heart" size={22} color={COLORS.accent} />
        </View>
      </View>

      <FlatList
        data={books}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchWishlist(); }}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconBg}>
              <Ionicons name="heart-outline" size={52} color={COLORS.accent} />
            </View>
            <Text style={s.emptyTitle}>Your wishlist is empty</Text>
            <Text style={s.emptyDesc}>Save books you love and find them here</Text>
            <TouchableOpacity style={s.browseBtn} onPress={() => router.push("/")}>
              <Text style={s.browseBtnText}>Browse Books</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  headerTitle: { fontSize: 26, fontWeight: "900", color: COLORS.textDark },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  headerIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: "center", alignItems: "center" },

  list: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 8 },

  card: {
    flexDirection: "row", backgroundColor: COLORS.cardBackground, borderRadius: 18,
    marginBottom: 14, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border,
  },
  image: { width: 110, height: 150 },
  discountBadge: {
    position: "absolute", top: 8, left: 8, backgroundColor: COLORS.danger,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  discountText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  info: { flex: 1, padding: 14, justifyContent: "space-between" },
  category: { fontSize: 11, fontWeight: "700", color: COLORS.primaryLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  title: { fontSize: 15, fontWeight: "700", color: COLORS.textDark, lineHeight: 20, marginBottom: 8 },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  price: { fontSize: 16, fontWeight: "800", color: COLORS.primary },
  originalPrice: { fontSize: 13, color: COLORS.textMuted, textDecorationLine: "line-through" },

  stockRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  stockDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.success },
  stockText: { fontSize: 12, color: COLORS.success, fontWeight: "600" },
  outOfStock: { fontSize: 12, color: COLORS.danger, fontWeight: "700", marginBottom: 10 },

  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  cartBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: COLORS.primary, paddingVertical: 9, borderRadius: 10,
  },
  cartBtnActive: { backgroundColor: COLORS.teal },
  cartBtnDisabled: { backgroundColor: COLORS.textMuted, opacity: 0.5 },
  cartBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  removeBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.dangerGlow,
    justifyContent: "center", alignItems: "center",
  },

  // Empty
  empty: { alignItems: "center", paddingTop: 80 },
  emptyIconBg: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.accentGlow,
    justifyContent: "center", alignItems: "center", marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textPrimary },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6, textAlign: "center" },
  browseBtn: { marginTop: 24, backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 14, borderRadius: 14 },
  browseBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
