import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView,
  RefreshControl, StyleSheet, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";

import { useAuthStore } from "../../store/authStore";
import COLORS from "../../constants/colors";
import { formatMemberSince } from "../../lib/utils";
import { API_URL } from "../../constants/api";

export default function Profile() {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ orders: 0, wishlist: 0, reviews: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const { user, token, deleteAccount, logout, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const fetchStats = async () => {
    if (isAdmin) { setStatsLoading(false); return; }
    try {
      const currentToken = useAuthStore.getState().token;
      const [ordersRes, wishlistRes] = await Promise.all([
        fetch(`${API_URL}/orders/myorders`, { headers: { Authorization: `Bearer ${currentToken}` } }),
        fetch(`${API_URL}/wishlist`, { headers: { Authorization: `Bearer ${currentToken}` } }),
      ]);
      const [ordersData, wishlistData] = await Promise.all([ordersRes.json(), wishlistRes.json()]);
      setStats({
        orders: Array.isArray(ordersData) ? ordersData.length : 0,
        wishlist: Array.isArray(wishlistData) ? wishlistData.length : 0,
        reviews: 0, // Could be extended with a user reviews endpoint
      });
    } catch {
      // silently fail stats
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const confirmDeleteAccount = () => {
    Alert.alert("Delete Account", "This will permanently delete your account and all your data. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          const result = await deleteAccount();
          if (!result.success) Alert.alert("Error", result.error || "Failed to delete account");
        },
      },
    ]);
  };

  const confirmLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setStatsLoading(true);
    await fetchStats();
    setRefreshing(false);
  };

  const hasCard = user?.paymentCard?.cardNumber?.length > 0;
  const hasAddress = user?.address?.street?.length > 0;

  if (!user) return null;

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* Top Bar */}
      <View style={s.topBar}>
        <Text style={s.pageTitle}>My Account</Text>
        <TouchableOpacity style={s.logoutBtnSm} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      {/* Profile Hero Card */}
      <View style={s.heroCard}>
        <View style={s.avatarWrapper}>
          <Image source={{ uri: user.profileImage }} style={s.avatar} />
          <TouchableOpacity style={s.editAvatarBtn} onPress={() => router.push("/edit-profile")}>
            <Ionicons name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={s.profileInfo}>
          <Text style={s.username}>{user.username}</Text>
          <Text style={s.email}>{user.email}</Text>
          <View style={[s.roleBadge, isAdmin && s.roleBadgeAdmin]}>
            <Ionicons name={isAdmin ? "shield-checkmark" : "person"} size={12} color={isAdmin ? "#fff" : COLORS.primaryLight} />
            <Text style={[s.roleBadgeText, isAdmin && s.roleBadgeTextAdmin]}>
              {isAdmin ? "Administrator" : "Customer"}
            </Text>
          </View>
        </View>
      </View>
      <Text style={s.memberSince}>Member since {formatMemberSince(user.createdAt)}</Text>

      {/* Stats (Customers only) */}
      {!isAdmin && (
        <View style={s.statsRow}>
          <View style={s.statBox}>
            {statsLoading ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
              <Text style={s.statNumber}>{stats.orders}</Text>
            )}
            <View style={[s.statIconBg, { backgroundColor: COLORS.infoGlow }]}>
              <Ionicons name="receipt" size={18} color={COLORS.info} />
            </View>
            <Text style={s.statLabel}>Orders</Text>
          </View>
          <View style={s.statBox}>
            {statsLoading ? <ActivityIndicator size="small" color={COLORS.accent} /> : (
              <Text style={s.statNumber}>{stats.wishlist}</Text>
            )}
            <View style={[s.statIconBg, { backgroundColor: COLORS.accentGlow }]}>
              <Ionicons name="heart" size={18} color={COLORS.accent} />
            </View>
            <Text style={s.statLabel}>Wishlist</Text>
          </View>
          <View style={s.statBox}>
            {statsLoading ? <ActivityIndicator size="small" color={COLORS.star} /> : (
              <Text style={s.statNumber}>{stats.reviews}</Text>
            )}
            <View style={[s.statIconBg, { backgroundColor: COLORS.warningGlow }]}>
              <Ionicons name="star" size={18} color={COLORS.star} />
            </View>
            <Text style={s.statLabel}>Reviews</Text>
          </View>
        </View>
      )}

      {/* Payment Card Preview */}
      {!isAdmin && (
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Payment Card</Text>
            <TouchableOpacity onPress={() => router.push("/edit-profile")}>
              <Text style={s.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          {hasCard ? (
            <View style={s.cardPreview}>
              <View style={s.cardPreviewTop}>
                <Ionicons name="card" size={28} color={COLORS.primaryLight} />
                <Text style={s.cardType}>
                  {user.paymentCard.cardNumber.replace(/\s+/g, "").startsWith("4") ? "VISA" : "MASTERCARD"}
                </Text>
              </View>
              <Text style={s.cardMasked}>
                {"•••• •••• •••• " + user.paymentCard.cardNumber.replace(/\s+/g, "").slice(-4)}
              </Text>
              <View style={s.cardPreviewBottom}>
                <Text style={s.cardExpiry}>Expires {user.paymentCard.expiryDate}</Text>
                <View style={[s.cardStatusBadge, { backgroundColor: COLORS.successGlow }]}>
                  <View style={[s.cardStatusDot, { backgroundColor: COLORS.success }]} />
                  <Text style={[s.cardStatusText, { color: COLORS.success }]}>Active</Text>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.addCardBtn} onPress={() => router.push("/edit-profile")}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={s.addCardText}>Add Payment Card</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Delivery Address */}
      {!isAdmin && (
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity onPress={() => router.push("/edit-profile")}>
              <Text style={s.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          {hasAddress ? (
            <View style={s.addressCard}>
              <Ionicons name="location" size={18} color={COLORS.primaryLight} />
              <Text style={s.addressText}>
                {[user.address.street, user.address.postalCode, user.address.country].filter(Boolean).join(", ")}
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={s.addCardBtn} onPress={() => router.push("/edit-profile")}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={s.addCardText}>Add Delivery Address</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main Links */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Main Menu</Text>
        <View style={s.linksContainer}>
          {!isAdmin ? (
            <>
              <TouchableOpacity style={s.linkItem} onPress={() => router.push("/orders")}>
                <View style={[s.iconBox, { backgroundColor: COLORS.infoGlow }]}><Ionicons name="receipt-outline" size={20} color={COLORS.info} /></View>
                <Text style={s.linkText}>My Orders</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              <View style={s.divider} />
              <TouchableOpacity style={s.linkItem} onPress={() => router.push("/wishlist")}>
                <View style={[s.iconBox, { backgroundColor: COLORS.accentGlow }]}><Ionicons name="heart-outline" size={20} color={COLORS.accent} /></View>
                <Text style={s.linkText}>My Wishlist</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={s.linkItem} onPress={() => router.push("/admin-books")}>
                <View style={[s.iconBox, { backgroundColor: COLORS.successGlow }]}><Ionicons name="library-outline" size={20} color={COLORS.success} /></View>
                <Text style={s.linkText}>Manage Inventory</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              <View style={s.divider} />
              <TouchableOpacity style={s.linkItem} onPress={() => router.push("/admin-orders")}>
                <View style={[s.iconBox, { backgroundColor: COLORS.warningGlow }]}><Ionicons name="clipboard-outline" size={20} color={COLORS.warning} /></View>
                <Text style={s.linkText}>Manage Orders</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              <View style={s.divider} />
              <TouchableOpacity style={s.linkItem} onPress={() => router.push("/admin-user-form")}>
                <View style={[s.iconBox, { backgroundColor: COLORS.accentGlow }]}><Ionicons name="person-add-outline" size={20} color={COLORS.accent} /></View>
                <Text style={s.linkText}>Create User</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Account Settings */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Account Settings</Text>
        <View style={s.linksContainer}>
          <TouchableOpacity style={s.linkItem} onPress={() => router.push("/edit-profile")}>
            <View style={[s.iconBox, { backgroundColor: COLORS.primaryGlow }]}><Ionicons name="person-outline" size={20} color={COLORS.primaryLight} /></View>
            <Text style={s.linkText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={s.linkItem} onPress={confirmDeleteAccount} disabled={authLoading}>
            <View style={[s.iconBox, { backgroundColor: COLORS.dangerGlow }]}><Ionicons name="trash-outline" size={20} color={COLORS.danger} /></View>
            {authLoading ? <ActivityIndicator size="small" color={COLORS.danger} /> : (
              <Text style={[s.linkText, { color: COLORS.danger }]}>Delete Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  pageTitle: { fontSize: 28, fontWeight: "900", color: COLORS.textDark },
  logoutBtnSm: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.dangerGlow, justifyContent: "center", alignItems: "center" },

  heroCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, backgroundColor: COLORS.cardBackground, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  avatarWrapper: { position: "relative" },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: COLORS.primary },
  editAvatarBtn: { position: "absolute", bottom: 0, right: 0, backgroundColor: COLORS.primary, width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: COLORS.cardBackground },
  profileInfo: { marginLeft: 16, flex: 1 },
  username: { fontSize: 22, fontWeight: "800", color: COLORS.textDark },
  email: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8, marginTop: 2 },
  roleBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: COLORS.primaryGlow, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
  roleBadgeAdmin: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.primaryLight, textTransform: "uppercase" },
  roleBadgeTextAdmin: { color: "#fff" },

  memberSince: { fontSize: 13, color: COLORS.textMuted, textAlign: "center", marginVertical: 12 },

  statsRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 8 },
  statBox: { flex: 1, backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  statNumber: { fontSize: 24, fontWeight: "900", color: COLORS.textDark },
  statIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "600" },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  editLink: { fontSize: 13, color: COLORS.primaryLight, fontWeight: "700" },

  // Payment Card Preview
  cardPreview: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.borderGlow },
  cardPreviewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  cardType: { fontSize: 13, fontWeight: "800", color: COLORS.textSecondary, letterSpacing: 2 },
  cardMasked: { fontSize: 22, fontWeight: "700", color: COLORS.textDark, letterSpacing: 4, marginBottom: 16, fontVariant: ["tabular-nums"] },
  cardPreviewBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardExpiry: { fontSize: 13, color: COLORS.textSecondary },
  cardStatusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  cardStatusDot: { width: 6, height: 6, borderRadius: 3 },
  cardStatusText: { fontSize: 11, fontWeight: "700" },

  // Address
  addressCard: { flexDirection: "row", gap: 10, backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, alignItems: "flex-start" },
  addressText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },

  addCardBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed" },
  addCardText: { fontSize: 14, color: COLORS.primary, fontWeight: "600" },

  linksContainer: { backgroundColor: COLORS.cardBackground, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  linkItem: { flexDirection: "row", alignItems: "center", padding: 16 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 14 },
  linkText: { flex: 1, fontSize: 16, fontWeight: "600", color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 66 },
});
