import { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert, RefreshControl,
  ActivityIndicator, StyleSheet, ScrollView,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { API_URL } from "../../constants/api";
import COLORS from "../../constants/colors";
import Loader from "../../components/Loader";

const STATUSES = ["pending", "shipped", "delivered", "cancelled"];

const STATUS_META = {
  pending:   { color: COLORS.warning,  bg: COLORS.warningBg,  icon: "time-outline",          label: "Pending" },
  shipped:   { color: COLORS.info,     bg: COLORS.infoBg,     icon: "bicycle-outline",        label: "Shipped" },
  delivered: { color: COLORS.success,  bg: COLORS.successBg,  icon: "checkmark-circle-outline", label: "Delivered" },
  cancelled: { color: COLORS.danger,   bg: COLORS.dangerBg,   icon: "close-circle-outline",   label: "Cancelled" },
};

export default function AdminOrdersScreen() {
  const { token } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchOrders = async () => {
    try {
      const currentToken = useAuthStore.getState().token;
      const res = await fetch(`${API_URL}/orders?limit=100`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch orders");
      setOrders(data.orders || []);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchOrders(); }, []));

  const updateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      const currentToken = useAuthStore.getState().token;
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update status");
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: newStatus } : o));
    } catch (e) {
      Alert.alert("Update Failed", e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusMeta = (status) => STATUS_META[status] || { color: COLORS.textMuted, bg: COLORS.inputBackground, icon: "help-circle-outline", label: status };

  // Filter orders
  const filteredOrders = filterStatus === "all"
    ? orders
    : orders.filter((o) => o.status === filterStatus);

  const renderOrder = ({ item: order }) => {
    const meta = getStatusMeta(order.status);
    const isExpanded = expandedId === order._id;
    const isUpdating = updatingId === order._id;

    // Build shipping address string safely
    const addr = order.shippingAddress;
    const addressStr = addr
      ? [addr.street, addr.postalCode, addr.country].filter(Boolean).join(", ")
      : "No address provided";

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.95}
        onPress={() => setExpandedId(isExpanded ? null : order._id)}
      >
        {/* Card Header */}
        <View style={s.cardHeader}>
          <View style={s.userRow}>
            <Image
              source={{ uri: order.user?.profileImage }}
              style={s.userAvatar}
              contentFit="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{order.user?.username || "Unknown User"}</Text>
              <Text style={s.userEmail} numberOfLines={1}>{order.user?.email || "No email"}</Text>
            </View>
            <View>
              <Text style={s.orderDate}>
                {new Date(order.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "2-digit" })}
              </Text>
              <Text style={[s.orderTime, { textAlign: "right" }]}>
                {new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>

          {/* Order ID + Total + Status */}
          <View style={s.orderMeta}>
            <View>
              <Text style={s.orderId}>#{order._id.slice(-8).toUpperCase()}</Text>
              <Text style={s.totalText}>Rs. {order.totalPrice?.toFixed(2)}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={13} color={meta.color} />
              <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
        </View>

        {/* Always-visible: items preview */}
        <View style={s.itemsPreview}>
          {order.orderItems.slice(0, 3).map((item, idx) => (
            <View key={idx} style={s.itemRow}>
              <Image source={item.image} style={s.itemImage} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={s.itemMeta}>Qty: {item.quantity} × Rs. {item.price?.toFixed(2)}</Text>
              </View>
              <Text style={s.itemLineTotal}>Rs. {(item.quantity * item.price).toFixed(2)}</Text>
            </View>
          ))}
          {order.orderItems.length > 3 && (
            <Text style={s.moreItems}>+{order.orderItems.length - 3} more item(s)</Text>
          )}
        </View>

        {/* Expand toggle */}
        <TouchableOpacity
          style={s.expandToggle}
          onPress={() => setExpandedId(isExpanded ? null : order._id)}
        >
          <Text style={s.expandToggleText}>{isExpanded ? "Hide details" : "Show details"}</Text>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Expanded details */}
        {isExpanded && (
          <View style={s.expandedArea}>
            {/* Shipping address */}
            <View style={s.detailSection}>
              <View style={s.detailSectionHeader}>
                <Ionicons name="location" size={15} color={COLORS.primary} />
                <Text style={s.detailSectionTitle}>Shipping Address</Text>
              </View>
              <Text style={s.detailValue}>{addressStr}</Text>
            </View>

            {/* Payment method */}
            <View style={s.detailSection}>
              <View style={s.detailSectionHeader}>
                <Ionicons name="card" size={15} color={COLORS.primary} />
                <Text style={s.detailSectionTitle}>Payment Method</Text>
              </View>
              <View style={s.paymentMethodRow}>
                <Text style={s.detailValue}>{order.paymentMethod || "Cash on Delivery"}</Text>
                {order.paymentMethod === "Cash on Delivery" && (
                  <View style={[s.codBadge, { backgroundColor: COLORS.warningBg }]}>
                    <Ionicons name="cash" size={12} color={COLORS.warning} />
                    <Text style={[s.codBadgeText, { color: COLORS.warning }]}>COD</Text>
                  </View>
                )}
                {order.paymentMethod === "Card" && (
                  <View style={[s.codBadge, { backgroundColor: COLORS.infoBg }]}>
                    <Ionicons name="card" size={12} color={COLORS.info} />
                    <Text style={[s.codBadgeText, { color: COLORS.info }]}>Card</Text>
                  </View>
                )}
              </View>
            </View>

            {/* All items (if more than 3) */}
            {order.orderItems.length > 3 && (
              <View style={s.detailSection}>
                <View style={s.detailSectionHeader}>
                  <Ionicons name="bag" size={15} color={COLORS.primary} />
                  <Text style={s.detailSectionTitle}>All Items</Text>
                </View>
                {order.orderItems.map((item, idx) => (
                  <View key={idx} style={s.itemRow}>
                    <Image source={item.image} style={s.itemImage} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={s.itemMeta}>Qty: {item.quantity} × Rs. {item.price?.toFixed(2)}</Text>
                    </View>
                    <Text style={s.itemLineTotal}>Rs. {(item.quantity * item.price).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Status updater */}
            <View style={s.detailSection}>
              <View style={s.detailSectionHeader}>
                <Ionicons name="swap-horizontal" size={15} color={COLORS.primary} />
                <Text style={s.detailSectionTitle}>Update Status</Text>
                {isUpdating && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
              </View>
              <View style={s.statusGrid}>
                {STATUSES.map((status) => {
                  const sm = getStatusMeta(status);
                  const isActive = order.status === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        s.statusBtn,
                        isActive && { backgroundColor: sm.color, borderColor: sm.color },
                        !isActive && { borderColor: COLORS.border },
                      ]}
                      onPress={() => {
                        if (isActive || isUpdating) return;
                        Alert.alert(
                          "Update Status",
                          `Change to "${sm.label}"?`,
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Update", onPress: () => updateStatus(order._id, status) },
                          ]
                        );
                      }}
                      disabled={isActive || isUpdating}
                      activeOpacity={0.75}
                    >
                      <Ionicons name={sm.icon} size={14} color={isActive ? "#fff" : sm.color} />
                      <Text style={[s.statusBtnText, { color: isActive ? "#fff" : COLORS.textSecondary }]}>
                        {sm.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) return <Loader />;

  const totalRevenue = orders.reduce((sum, o) => o.status !== "cancelled" ? sum + (o.totalPrice || 0) : sum, 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const shippedCount = orders.filter((o) => o.status === "shipped").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Order Management</Text>
          <Text style={s.subtitle}>{orders.length} total orders</Text>
        </View>
      </View>

      {/* Stats row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.statsRow}
      >
        <View style={s.statBox}>
          <Text style={[s.statValue, { color: COLORS.primary }]}>Rs. {totalRevenue.toFixed(0)}</Text>
          <Text style={s.statLabel}>Revenue</Text>
        </View>
        <View style={[s.statBox, { borderLeftColor: COLORS.warning }]}>
          <Text style={[s.statValue, { color: COLORS.warning }]}>{pendingCount}</Text>
          <Text style={s.statLabel}>Pending</Text>
        </View>
        <View style={[s.statBox, { borderLeftColor: COLORS.info }]}>
          <Text style={[s.statValue, { color: COLORS.info }]}>{shippedCount}</Text>
          <Text style={s.statLabel}>Shipped</Text>
        </View>
        <View style={[s.statBox, { borderLeftColor: COLORS.success }]}>
          <Text style={[s.statValue, { color: COLORS.success }]}>{deliveredCount}</Text>
          <Text style={s.statLabel}>Delivered</Text>
        </View>
      </ScrollView>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {["all", ...STATUSES].map((st) => {
          const active = filterStatus === st;
          const meta = st === "all" ? { color: COLORS.primary, bg: COLORS.primaryGlow } : getStatusMeta(st);
          return (
            <TouchableOpacity
              key={st}
              style={[s.filterChip, active && { backgroundColor: meta.color, borderColor: meta.color }]}
              onPress={() => setFilterStatus(st)}
            >
              <Text style={[s.filterChipText, active && { color: "#fff" }]}>
                {st === "all" ? "All Orders" : meta.label}
                {" "}
                {st !== "all" ? `(${orders.filter(o => o.status === st).length})` : `(${orders.length})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Order list */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(o) => o._id}
        renderItem={renderOrder}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchOrders(); }}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconRing}>
              <Ionicons name="clipboard-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={s.emptyTitle}>No orders found</Text>
            <Text style={s.emptyDesc}>
              {filterStatus !== "all" ? `No ${filterStatus} orders` : "No orders yet"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 24, fontWeight: "900", color: COLORS.textDark },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },

  // Stats
  statsRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  statBox: {
    backgroundColor: COLORS.cardBackground, borderRadius: 14, padding: 14,
    minWidth: 110, borderLeftWidth: 3, borderLeftColor: COLORS.primary,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1,
  },
  statValue: { fontSize: 20, fontWeight: "900", color: COLORS.textDark },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: "600", marginTop: 4 },

  // Filter chips
  filterRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.cardBackground, borderWidth: 1.5, borderColor: COLORS.border,
  },
  filterChipText: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary },

  // List
  list: { padding: 16, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: COLORS.cardBackground, borderRadius: 18, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    overflow: "hidden",
  },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },

  userRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.inputBackground },
  userName: { fontSize: 15, fontWeight: "700", color: COLORS.textDark },
  userEmail: { fontSize: 12, color: COLORS.textSecondary },
  orderDate: { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },
  orderTime: { fontSize: 11, color: COLORS.textMuted },

  orderMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: 11, color: COLORS.textMuted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
  totalText: { fontSize: 20, fontWeight: "900", color: COLORS.primary },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "800", textTransform: "capitalize" },

  // Items preview
  itemsPreview: { padding: 14, paddingBottom: 0 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  itemImage: { width: 36, height: 52, borderRadius: 6, backgroundColor: COLORS.inputBackground },
  itemTitle: { fontSize: 13, fontWeight: "600", color: COLORS.textDark, marginBottom: 2 },
  itemMeta: { fontSize: 11, color: COLORS.textSecondary },
  itemLineTotal: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  moreItems: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic", marginBottom: 8, marginLeft: 4 },

  // Expand toggle
  expandToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4,
  },
  expandToggleText: { fontSize: 13, color: COLORS.primary, fontWeight: "700" },

  // Expanded area
  expandedArea: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },

  detailSection: { marginBottom: 16 },
  detailSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  detailSectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  detailValue: { fontSize: 15, color: COLORS.textDark, fontWeight: "500", lineHeight: 21 },

  paymentMethodRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  codBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  codBadgeText: { fontSize: 11, fontWeight: "800" },

  // Status grid (2×2)
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: COLORS.cardBackground, borderWidth: 1.5,
    minWidth: "45%",
  },
  statusBtnText: { fontSize: 13, fontWeight: "700" },

  // Empty
  empty: { alignItems: "center", paddingTop: 80 },
  emptyIconRing: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.primaryGlow,
    borderWidth: 2, borderColor: COLORS.primaryBorder,
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textDark },
  emptyDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});
