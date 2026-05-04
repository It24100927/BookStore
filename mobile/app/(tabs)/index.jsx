import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator,
  RefreshControl, TextInput, ScrollView, StyleSheet,
} from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { API_URL } from "../../constants/api";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import Loader from "../../components/Loader";
import Toast from "../../components/Toast";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CATEGORIES = [
  "All", "Fiction", "Non-Fiction", "Novel", "Science Fiction", "Fantasy",
  "Mystery", "Thriller", "Romance", "Horror", "Biography", "Self-Help",
  "History", "Science", "Technology", "Business", "Children", "Poetry", "Comics", "Other",
];

const SORT_OPTIONS = [
  { key: "newest",  label: "Newest",    icon: "time-outline" },
  { key: "rating",  label: "Top Rated", icon: "star" },
  { key: "popular", label: "Most Sold", icon: "flame" },
];

export default function Home() {
  const { token, user } = useAuthStore();
  const { addToCart, getItemCount } = useCartStore();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [wishlistLoadingId, setWishlistLoadingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSort, setActiveSort] = useState("newest");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const showToast = (message, type = "success") => setToast({ visible: true, message, type });

  const fetchBooks = async (pageNum = 1, refresh = false, search = searchQuery, category = activeCategory, sort = activeSort) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const currentToken = useAuthStore.getState().token;

      let url = `${API_URL}/books?page=${pageNum}&limit=10`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (category !== "All") url += `&category=${encodeURIComponent(category)}`;
      if (sort !== "newest") url += `&sort=${sort}`;

      const response = await fetch(url, { headers: { Authorization: `Bearer ${currentToken}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch books");

      const newBooks = refresh || pageNum === 1 ? data.books : [...books, ...data.books];
      const seen = new Set();
      const uniqueBooks = newBooks.filter((b) => {
        if (seen.has(b._id)) return false;
        seen.add(b._id);
        return true;
      });

      setBooks(uniqueBooks);
      setHasMore(pageNum < data.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.log("Error fetching books", error);
    } finally {
      if (refresh) {
        await sleep(600);
        setRefreshing(false);
      } else setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    if (isAdmin) return;
    try {
      const currentToken = useAuthStore.getState().token;
      const response = await fetch(`${API_URL}/wishlist`, { headers: { Authorization: `Bearer ${currentToken}` } });
      const data = await response.json();
      if (!response.ok) return;
      setWishlistIds(new Set(data.map((book) => book._id)));
    } catch (error) {
      console.log("Error fetching wishlist", error);
    }
  };

  useEffect(() => {
    fetchBooks();
    fetchWishlist();
  }, []);

  useFocusEffect(useCallback(() => { fetchWishlist(); }, []));

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => {
      fetchBooks(1, false, text, activeCategory, activeSort);
    }, 500));
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    fetchBooks(1, false, searchQuery, cat, activeSort);
  };

  const handleSortChange = (sortKey) => {
    setActiveSort(sortKey);
    fetchBooks(1, true, searchQuery, activeCategory, sortKey);
  };

  const toggleWishlist = async (bookId) => {
    try {
      setWishlistLoadingId(bookId);
      const currentToken = useAuthStore.getState().token;
      const isSaved = wishlistIds.has(bookId);
      const response = await fetch(`${API_URL}/wishlist/${bookId}`, {
        method: isSaved ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(data.message);
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (isSaved) { next.delete(bookId); } else { next.add(bookId); }
        return next;
      });
    } catch (error) {
      showToast(error.message || "Unable to update wishlist", "error");
    } finally {
      setWishlistLoadingId(null);
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

  const handleLoadMore = () => {
    if (hasMore && !loading && !refreshing) fetchBooks(page + 1);
  };

  // Render star rating row
  const renderStars = (rating) => {
    const r = Math.round(rating * 2) / 2; // half-star precision
    return (
      <View style={s.starsRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Ionicons
            key={i}
            name={r >= i ? "star" : r >= i - 0.5 ? "star-half" : "star-outline"}
            size={11}
            color={r > 0 ? COLORS.star : COLORS.starEmpty}
          />
        ))}
        {rating > 0 && (
          <Text style={s.ratingVal}>{rating.toFixed(1)}</Text>
        )}
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const discountedPrice = item.discountPercentage > 0
      ? item.price * (1 - item.discountPercentage / 100)
      : item.price;

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.88}
        onPress={() => router.push({ pathname: `/reviews/${item._id}`, params: { title: item.title } })}
      >
        <View style={s.imageWrapper}>
          <Image source={item.image} style={s.cardImage} contentFit="cover" />
          {/* Discount badge */}
          {item.discountPercentage > 0 && (
            <View style={s.discountBadge}>
              <Text style={s.discountBadgeText}>-{item.discountPercentage}%</Text>
            </View>
          )}
          {/* Most Sold badge */}
          {activeSort === "popular" && item.soldCount > 0 && (
            <View style={s.soldBadge}>
              <Ionicons name="flame" size={9} color="#fff" />
              <Text style={s.soldBadgeText}>{item.soldCount} sold</Text>
            </View>
          )}
          {/* Stock out overlay */}
          {item.stockCount === 0 && (
            <View style={s.soldOutOverlay}>
              <Text style={s.soldOutText}>SOLD OUT</Text>
            </View>
          )}
        </View>

        <View style={s.cardBody}>
          {/* Category tag */}
          <View style={s.categoryTag}>
            <Text style={s.categoryTagText} numberOfLines={1}>{item.category || "Other"}</Text>
          </View>

          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>

          {/* Star rating */}
          {renderStars(item.averageRating || 0)}

          {/* Price row */}
          <View style={s.priceRow}>
            <View>
              {item.discountPercentage > 0 && (
                <Text style={s.priceStrike}>Rs. {item.price.toFixed(2)}</Text>
              )}
              <Text style={s.cardPrice}>Rs. {discountedPrice.toFixed(2)}</Text>
            </View>
            {item.stockCount > 0 && (
              <View style={s.stockPill}>
                <View style={s.stockDot} />
                <Text style={s.stockPillText}>{item.stockCount}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          {!isAdmin && (
            <View style={s.cardActions}>
              <TouchableOpacity
                style={s.wishBtn}
                onPress={(e) => { e.stopPropagation(); toggleWishlist(item._id); }}
                disabled={wishlistLoadingId === item._id}
              >
                {wishlistLoadingId === item._id ? (
                  <ActivityIndicator size="small" color={COLORS.danger} />
                ) : (
                  <Ionicons
                    name={wishlistIds.has(item._id) ? "heart" : "heart-outline"}
                    size={18}
                    color={wishlistIds.has(item._id) ? COLORS.danger : COLORS.textMuted}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.addCartBtn, item.stockCount <= 0 && s.addCartBtnDisabled]}
                onPress={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                disabled={item.stockCount <= 0}
                activeOpacity={0.8}
              >
                <Ionicons name="bag-add-outline" size={14} color="#fff" />
                <Text style={s.addCartText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <Loader />;

  const cartCount = getItemCount();

  return (
    <View style={s.container}>
      <FlatList
        data={books}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchBooks(1, true)}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={s.header}>
              <View>
                <Text style={s.greeting}>Good reading, {user?.username || "Reader"} 👋</Text>
                <Text style={s.headerTitle}>BookWorm Store</Text>
              </View>
              <View style={s.headerRight}>
                {!isAdmin && (
                  <TouchableOpacity style={s.cartIconBtn} onPress={() => router.push("/cart")}>
                    <Ionicons name="bag-outline" size={22} color={COLORS.primary} />
                    {cartCount > 0 && (
                      <View style={s.cartBadge}>
                        <Text style={s.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={s.avatarBtn}
                  onPress={() => router.push("/profile")}
                >
                  <Image source={{ uri: user?.profileImage }} style={s.avatar} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search */}
            <View style={s.searchBar}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by title, author, genre..."
                placeholderTextColor={COLORS.placeholderText}
                value={searchQuery}
                onChangeText={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(""); fetchBooks(1, false, "", activeCategory); }}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Sort Chips — Newest | Top Rated | Most Sold */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.sortRow}
            >
              {SORT_OPTIONS.map((opt) => {
                const active = activeSort === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[s.sortChip, active && s.sortChipActive]}
                    onPress={() => handleSortChange(opt.key)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={14}
                      color={active ? "#fff" : (opt.key === "popular" ? COLORS.danger : opt.key === "rating" ? COLORS.star : COLORS.textMuted)}
                    />
                    <Text style={[s.sortChipText, active && s.sortChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Category horizontal scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => handleCategoryChange(cat)}
                  style={[s.catChip, activeCategory === cat && s.catChipActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[s.catChipText, activeCategory === cat && s.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Section label */}
            <View style={s.sectionLabel}>
              <Text style={s.sectionLabelText}>
                {activeSort === "popular" ? "🔥 Most Sold Books" : activeSort === "rating" ? "⭐ Top Rated Books" : "✨ Latest Arrivals"}
              </Text>
              <Text style={s.sectionCount}>{books.length} books</Text>
            </View>
          </View>
        }
        ListFooterComponent={
          hasMore && books.length > 0 ? (
            <ActivityIndicator style={{ marginVertical: 24 }} size="small" color={COLORS.primary} />
          ) : null
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconRing}>
              <Ionicons name="book-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={s.emptyTitle}>No books found</Text>
            <Text style={s.emptyDesc}>Try adjusting your search or filters</Text>
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
  list: { paddingHorizontal: 14, paddingBottom: 30 },
  row: { justifyContent: "space-between", marginBottom: 12 },

  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 16, paddingBottom: 14, paddingHorizontal: 2,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  greeting: { fontSize: 13, color: COLORS.textMuted, marginBottom: 2, fontWeight: "500" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: COLORS.textDark, letterSpacing: -0.5 },
  avatarBtn: { borderWidth: 2, borderColor: COLORS.primaryBorder, borderRadius: 22 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  cartIconBtn: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.primaryGlow,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: COLORS.primaryBorder,
  },
  cartBadge: {
    position: "absolute", top: -4, right: -4, backgroundColor: COLORS.danger,
    borderRadius: 9, minWidth: 18, height: 18, justifyContent: "center",
    alignItems: "center", paddingHorizontal: 3, borderWidth: 2, borderColor: COLORS.background,
  },
  cartBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },

  // Search
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.cardBackground, borderRadius: 14,
    paddingHorizontal: 14, height: 48, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: "500" },

  // Sort chips
  sortRow: { paddingBottom: 12, gap: 8, paddingRight: 4 },
  sortChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.cardBackground, borderWidth: 1.5, borderColor: COLORS.border,
  },
  sortChipActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  sortChipText: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary },
  sortChipTextActive: { color: "#fff" },

  // Category chips
  catRow: { paddingBottom: 12, gap: 8, paddingRight: 4 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.cardBackground, borderWidth: 1.5, borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primaryBorder },
  catChipText: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  catChipTextActive: { color: COLORS.primary, fontWeight: "700" },

  // Section label
  sectionLabel: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, paddingHorizontal: 2,
  },
  sectionLabelText: { fontSize: 16, fontWeight: "800", color: COLORS.textDark },
  sectionCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: "600" },

  // Card
  card: {
    width: "48.5%", backgroundColor: COLORS.cardBackground, borderRadius: 16,
    overflow: "hidden", borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  imageWrapper: { position: "relative" },
  cardImage: { width: "100%", height: 170 },
  discountBadge: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: COLORS.danger, paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8,
  },
  discountBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  soldBadge: {
    position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#EF4444", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  soldBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center", alignItems: "center",
  },
  soldOutText: { color: "#fff", fontSize: 12, fontWeight: "900", letterSpacing: 1 },

  cardBody: { padding: 10 },
  categoryTag: {
    backgroundColor: COLORS.primaryGlow, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 5,
    borderWidth: 1, borderColor: COLORS.primaryBorder,
  },
  categoryTagText: { color: COLORS.primary, fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textDark, lineHeight: 17, marginBottom: 5 },

  // Stars
  starsRow: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 8 },
  ratingVal: { fontSize: 11, fontWeight: "700", color: COLORS.textSecondary, marginLeft: 3 },

  // Price
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  priceStrike: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: "line-through" },
  cardPrice: { fontSize: 15, fontWeight: "900", color: COLORS.primary },
  stockPill: { flexDirection: "row", alignItems: "center", gap: 3 },
  stockDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.success },
  stockPillText: { fontSize: 10, color: COLORS.success, fontWeight: "700" },

  // Actions
  cardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wishBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.inputBackground,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },
  addCartBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, backgroundColor: COLORS.primary, paddingVertical: 8,
    borderRadius: 10, marginLeft: 8,
  },
  addCartBtnDisabled: { backgroundColor: COLORS.textMuted, opacity: 0.4 },
  addCartText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  // Empty
  empty: { alignItems: "center", paddingTop: 80, paddingBottom: 40 },
  emptyIconRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primaryGlow, borderWidth: 2, borderColor: COLORS.primaryBorder,
    justifyContent: "center", alignItems: "center", marginBottom: 18,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
});
