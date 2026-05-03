import { useCallback, useState } from "react";
import {
  View, Text, FlatList, RefreshControl, Alert, StyleSheet, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "../../store/authStore";
import { API_URL } from "../../constants/api";
import COLORS from "../../constants/colors";
import Loader from "../../components/Loader";
import Toast from "../../components/Toast";

const STATUS_CONFIG = {
  pending:   { color: COLORS.warning,   icon: "time-outline",          label: "Pending" },
  shipped:   { color: COLORS.info,      icon: "bicycle-outline",       label: "Shipped" },
  delivered: { color: COLORS.success,   icon: "checkmark-circle",      label: "Delivered" },
  cancelled: { color: COLORS.textMuted, icon: "close-circle-outline",  label: "Cancelled" },
};

export default function OrdersScreen() {
  const { token } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const showToast = (message, type = "success") => setToast({ visible: true, message, type });

  const fetchOrders = async () => {
    try {
      const currentToken = useAuthStore.getState().token;
      const response = await fetch(`${API_URL}/orders/myorders`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to fetch orders");
      setOrders(data);
    } catch (_err) {
      Alert.alert("Error", _err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchOrders(); }, []));

  const handleCancel = (orderId) => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? Stock will be restored.",
      [
        { text: "Keep Order", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setCancellingId(orderId);
              const currentToken = useAuthStore.getState().token;
              const response = await fetch(`${API_URL}/orders/${orderId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${currentToken}` },
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.message || "Failed to cancel order");
              // Update local state instead of re-fetching
              setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status: "cancelled" } : o));
              showToast("Order cancelled. Stock has been restored.", "info");
            } catch (_err) {
              showToast(_err.message || "Could not cancel order", "error");
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const renderOrderItem = ({ item: order }) => {
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

    return (
      <View style={s.card}>
        {/* Card Header */}
        <View style={s.header}>
          <View>
            <Text style={s.orderId}>#{order._id.slice(-8).toUpperCase()}</Text>
            <Text style={s.date}>
              {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </Text>
          </View>
          <View style={[s.badge, { backgroundColor: cfg.color + "20" }]}>
            <Ionicons name={cfg.icon} size={14} color={cfg.color} />
            <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={s.items}>
          {order.orderItems.map((item, index) => (
            <View style={s.itemRow} key={index}>
              <Image source={item.image} style={s.itemImage} contentFit="cover" />
              <View style={s.itemInfo}>
                <Text style={s.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={s.itemMeta}>
                  Qty {item.quantity} × Rs. {item.price?.toFixed(2)}
                </Text>
              </View>
              <Text style={s.itemLineTotal}>Rs. {(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Delivery & Payment Info */}
        <View style={s.infoBox}>
          <View style={s.infoRow}>
            <Ionicons name="location-outline" size={15} color={COLORS.primaryLight} />
            <Text style={s.infoText} numberOfLines={2}>
              {order.shippingAddress
                ? `${order.shippingAddress.street}, ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}`
                : "N/A"}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name={order.paymentMethod === "Card" ? "card-outline" : "cash-outline"} size={15} color={COLORS.primaryLight} />
            <Text style={s.infoText}>{order.paymentMethod || "Cash on Delivery"}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.itemCount}>
            {order.orderItems.reduce((sum, i) => sum + i.quantity, 0)} item{order.orderItems.reduce((sum, i) => sum + i.quantity, 0) !== 1 ? "s" : ""}
          </Text>
          <Text style={s.total}>Rs. {order.totalPrice?.toFixed(2)}</Text>
        </View>

        {/* Cancel Button — only for pending orders */}
        {order.status === "pending" && (
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => handleCancel(order._id)}
            disabled={cancellingId === order._id}
          >
            {cancellingId === order._id ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
                <Text style={s.cancelBtnText}>Cancel Order</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) return <Loader />;

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <Text style={s.title}>My Orders</Text>
        <Text style={s.subtitle}>{orders.length > 0 ? `${orders.length} order${orders.length > 1 ? "s" : ""}` : "No orders yet"}</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrderItem}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
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
            <View style={s.emptyIconBg}>
              <Ionicons name="receipt-outline" size={52} color={COLORS.primary} />
            </View>
            <Text style={s.emptyTitle}>No orders yet</Text>
            <Text style={s.emptySub}>Your purchase history will appear here</Text>
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
  topBar: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: COLORS.cardBackground, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: "900", color: COLORS.textDark },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.cardBackground, borderRadius: 18, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  orderId: { fontSize: 15, fontWeight: "800", color: COLORS.textDark, letterSpacing: 0.5, marginBottom: 3 },
  date: { fontSize: 12, color: COLORS.textSecondary },

  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  items: { backgroundColor: COLORS.background, borderRadius: 12, padding: 12, marginBottom: 12 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  itemImage: { width: 38, height: 54, borderRadius: 6 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textDark, marginBottom: 2 },
  itemMeta: { fontSize: 12, color: COLORS.textSecondary },
  itemLineTotal: { fontSize: 13, fontWeight: "700", color: COLORS.primaryLight },

  infoBox: { backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  itemCount: { fontSize: 13, color: COLORS.textSecondary },
  total: { fontSize: 20, fontWeight: "900", color: COLORS.primary },

  cancelBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: 12, paddingVertical: 10, borderRadius: 10,
    backgroundColor: COLORS.dangerGlow, borderWidth: 1, borderColor: COLORS.danger + "40",
  },
  cancelBtnText: { color: COLORS.danger, fontWeight: "700", fontSize: 14 },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyIconBg: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.primaryGlow,
    justifyContent: "center", alignItems: "center", marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textPrimary },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6 },
});
