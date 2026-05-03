import { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, ActivityIndicator, StyleSheet, TextInput,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "../../store/authStore";
import { API_URL } from "../../constants/api";
import COLORS from "../../constants/colors";
import Loader from "../../components/Loader";

export default function AdminBooksScreen() {
  const { token } = useAuthStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("books");
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [bookSearch, setBookSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchBooks = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);

      const currentToken = useAuthStore.getState().token;
      const response = await fetch(`${API_URL}/books?page=${pageNum}&limit=20`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch books");

      const newBooks = refresh || pageNum === 1 ? data.books : [...books, ...data.books];
      setBooks(newBooks);
      setHasMore(pageNum < data.totalPages);
      setPage(pageNum);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const currentToken = useAuthStore.getState().token;
      const response = await fetch(`${API_URL}/auth/admin/users?limit=100`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch users");
      setUsers(data.users);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (activeTab === "books") fetchBooks(1, false);
      else fetchUsers();
    }, [activeTab])
  );

  const handleDeleteBook = (bookId, bookTitle) => {
    Alert.alert(
      "Delete Book",
      `Delete "${bookTitle}"? This will also remove all reviews.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(bookId);
              const currentToken = useAuthStore.getState().token;
              const res = await fetch(`${API_URL}/books/${bookId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${currentToken}` },
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.message);
              setBooks((prev) => prev.filter((b) => b._id !== bookId));
            } catch (error) {
              Alert.alert("Error", error.message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = (userId, userName) => {
    Alert.alert(
      "Delete User",
      `Delete "${userName}"? This removes all their orders and reviews.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(userId);
              const currentToken = useAuthStore.getState().token;
              const res = await fetch(`${API_URL}/auth/admin/users/${userId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${currentToken}` },
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.message);
              setUsers((prev) => prev.filter((u) => u._id !== userId));
            } catch (error) {
              Alert.alert("Error", error.message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // Filtered lists
  const filteredBooks = books.filter((b) =>
    b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
    b.category?.toLowerCase().includes(bookSearch.toLowerCase())
  );
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const renderBookItem = ({ item }) => {
    const discountedPrice = item.discountPercentage > 0
      ? item.price * (1 - item.discountPercentage / 100)
      : item.price;

    return (
      <View style={s.bookCard}>
        <Image source={item.image} style={s.bookImage} contentFit="cover" />
        {item.discountPercentage > 0 && (
          <View style={s.discountChip}>
            <Text style={s.discountChipText}>-{item.discountPercentage}%</Text>
          </View>
        )}
        <View style={s.bookInfo}>
          <View style={s.bookTop}>
            <View style={s.categoryPill}>
              <Text style={s.categoryPillText}>{item.category || "Other"}</Text>
            </View>
            <View style={[s.stockPill, item.stockCount > 0 ? s.stockIn : s.stockOut]}>
              <View style={[s.stockDot, { backgroundColor: item.stockCount > 0 ? COLORS.success : COLORS.danger }]} />
              <Text style={[s.stockPillText, { color: item.stockCount > 0 ? COLORS.success : COLORS.danger }]}>
                {item.stockCount > 0 ? `${item.stockCount}` : "Out"}
              </Text>
            </View>
          </View>
          <Text style={s.bookTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.bookCaption} numberOfLines={1}>{item.caption}</Text>
          <View style={s.bookBottom}>
            <View>
              {item.discountPercentage > 0 && (
                <Text style={s.originalPrice}>Rs. {item.price.toFixed(2)}</Text>
              )}
              <Text style={s.priceText}>Rs. {discountedPrice.toFixed(2)}</Text>
            </View>
            <View style={s.actionsRow}>
              <TouchableOpacity
                style={[s.actionBtn, s.editBtn]}
                onPress={() => router.push({ pathname: "/admin-book-form", params: { id: item._id } })}
              >
                <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, s.deleteBtn]}
                onPress={() => handleDeleteBook(item._id, item.title)}
                disabled={deletingId === item._id}
              >
                {deletingId === item._id
                  ? <ActivityIndicator size="small" color={COLORS.danger} />
                  : <Ionicons name="trash-outline" size={16} color={COLORS.danger} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderUserItem = ({ item }) => (
    <View style={s.userCard}>
      <Image source={{ uri: item.profileImage }} style={s.userAvatar} />
      <View style={s.userInfo}>
        <View style={s.userTop}>
          <Text style={s.userName}>{item.username}</Text>
          <View style={[s.rolePill, item.role === "admin" ? s.roleAdmin : s.roleCustomer]}>
            <Text style={[s.rolePillText, { color: item.role === "admin" ? COLORS.accent : COLORS.primaryLight }]}>
              {item.role}
            </Text>
          </View>
        </View>
        <Text style={s.userEmail}>{item.email}</Text>
        {item.address?.street ? (
          <View style={s.addressBox}>
            <Ionicons name="location-outline" size={12} color={COLORS.primaryLight} />
            <Text style={s.addressText} numberOfLines={1}>
              {item.address.street}, {item.address.postalCode}, {item.address.country}
            </Text>
          </View>
        ) : null}
        {item.mobile?.number ? (
          <View style={s.addressBox}>
            <Ionicons name="call-outline" size={12} color={COLORS.teal} />
            <Text style={s.addressText}>{item.mobile.flag} {item.mobile.countryCode} {item.mobile.number}</Text>
          </View>
        ) : null}
        <Text style={s.userJoined}>
          Joined {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </Text>
      </View>
      {item.role !== "admin" && (
        <TouchableOpacity
          style={s.deleteUserBtn}
          onPress={() => handleDeleteUser(item._id, item.username)}
          disabled={deletingId === item._id}
        >
          {deletingId === item._id
            ? <ActivityIndicator size="small" color={COLORS.danger} />
            : <Ionicons name="trash-outline" size={18} color={COLORS.danger} />}
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && !refreshing) return <Loader />;

  // Stats row
  const outOfStock = books.filter((b) => b.stockCount === 0).length;
  const totalRevenue = books.reduce((sum, b) => sum + b.price * b.stockCount, 0);
  const admins = users.filter((u) => u.role === "admin").length;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Admin Dashboard</Text>
          <Text style={s.subtitle}>Manage inventory & user accounts</Text>
        </View>
        {activeTab === "books" && (
          <TouchableOpacity style={s.addBtn} onPress={() => router.push("/admin-book-form")}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Bar */}
      <View style={s.statsBar}>
        {activeTab === "books" ? (
          <>
            <View style={s.statItem}>
              <Text style={s.statVal}>{books.length}</Text>
              <Text style={s.statLbl}>Total Books</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statVal, outOfStock > 0 && { color: COLORS.danger }]}>{outOfStock}</Text>
              <Text style={s.statLbl}>Out of Stock</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statVal}>Rs. {(totalRevenue / 1000).toFixed(0)}K</Text>
              <Text style={s.statLbl}>Inventory Value</Text>
            </View>
          </>
        ) : (
          <>
            <View style={s.statItem}>
              <Text style={s.statVal}>{users.length}</Text>
              <Text style={s.statLbl}>Total Users</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statVal}>{users.length - admins}</Text>
              <Text style={s.statLbl}>Customers</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statVal}>{admins}</Text>
              <Text style={s.statLbl}>Admins</Text>
            </View>
          </>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {["books", "users"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === "books" ? "library-outline" : "people-outline"}
              size={16}
              color={activeTab === tab ? "#fff" : COLORS.textMuted}
            />
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === "books" ? `Books (${filteredBooks.length})` : `Users (${filteredUsers.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder={activeTab === "books" ? "Search by title or category..." : "Search by name or email..."}
          placeholderTextColor={COLORS.placeholderText}
          value={activeTab === "books" ? bookSearch : userSearch}
          onChangeText={activeTab === "books" ? setBookSearch : setUserSearch}
        />
        {(activeTab === "books" ? bookSearch : userSearch).length > 0 && (
          <TouchableOpacity onPress={() => activeTab === "books" ? setBookSearch("") : setUserSearch("")}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {activeTab === "books" ? (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item) => item._id}
          renderItem={renderBookItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchBooks(1, true)}
              colors={[COLORS.primary]} tintColor={COLORS.primary}
            />
          }
          onEndReached={() => hasMore && !bookSearch && fetchBooks(page + 1)}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="library-outline" size={56} color={COLORS.textMuted} />
              <Text style={s.emptyText}>{bookSearch ? "No books match your search" : "No books in inventory"}</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderUserItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchUsers(); }}
              colors={[COLORS.primary]} tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={56} color={COLORS.textMuted} />
              <Text style={s.emptyText}>{userSearch ? "No users match your search" : "No users found"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: COLORS.cardBackground, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 24, fontWeight: "900", color: COLORS.textDark },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center",
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },

  // Stats
  statsBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: COLORS.cardBackground, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "900", color: COLORS.textDark },
  statLbl: { fontSize: 11, color: COLORS.textMuted, fontWeight: "600", marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  // Tabs
  tabRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
  tabTextActive: { color: "#fff" },

  // Search
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: COLORS.cardBackground, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  list: { paddingHorizontal: 16, paddingBottom: 30, paddingTop: 4 },

  // Book Card
  bookCard: {
    flexDirection: "row", backgroundColor: COLORS.cardBackground, borderRadius: 16,
    marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border,
  },
  bookImage: { width: 80, height: 120 },
  discountChip: {
    position: "absolute", top: 6, left: 6, backgroundColor: COLORS.danger,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  discountChipText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  bookInfo: { flex: 1, padding: 12, justifyContent: "space-between" },
  bookTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  categoryPill: {
    backgroundColor: COLORS.primaryGlow, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.primaryBorder,
  },
  categoryPillText: { fontSize: 10, fontWeight: "700", color: COLORS.primaryLight },
  stockPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  stockIn: { backgroundColor: COLORS.successBg },
  stockOut: { backgroundColor: COLORS.dangerBg },
  stockDot: { width: 5, height: 5, borderRadius: 2.5 },
  stockPillText: { fontSize: 10, fontWeight: "800" },
  bookTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textDark, lineHeight: 18, marginBottom: 3 },
  bookCaption: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  bookBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  originalPrice: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: "line-through" },
  priceText: { fontSize: 16, fontWeight: "800", color: COLORS.primary },
  actionsRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center",
  },
  editBtn: { backgroundColor: COLORS.primaryGlow, borderWidth: 1, borderColor: COLORS.primaryBorder },
  deleteBtn: { backgroundColor: COLORS.dangerBg, borderWidth: 1, borderColor: COLORS.danger + "40" },

  // User Card
  userCard: {
    flexDirection: "row", backgroundColor: COLORS.cardBackground, borderRadius: 16,
    marginBottom: 10, padding: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: "flex-start",
  },
  userAvatar: { width: 48, height: 48, borderRadius: 14, marginRight: 12 },
  userInfo: { flex: 1 },
  userTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  userName: { fontSize: 15, fontWeight: "700", color: COLORS.textDark },
  rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  roleAdmin: { backgroundColor: COLORS.accentGlow },
  roleCustomer: { backgroundColor: COLORS.primaryGlow },
  rolePillText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  userEmail: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  addressBox: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  addressText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  userJoined: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  deleteUserBtn: {
    padding: 8, backgroundColor: COLORS.dangerBg, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.danger + "30",
  },

  // Empty
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, marginTop: 14, fontWeight: "600" },
});
