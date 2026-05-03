import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderId: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: "#FFF3CD",
  },
  statusShipped: {
    backgroundColor: "#CCE5FF",
  },
  statusDelivered: {
    backgroundColor: "#D4EDDA",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statusTextPending: {
    color: "#856404",
  },
  statusTextShipped: {
    color: "#004085",
  },
  statusTextDelivered: {
    color: "#155724",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingVertical: 4,
  },
  itemImage: {
    width: 40,
    height: 55,
    borderRadius: 4,
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textDark,
  },
  itemMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  itemCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // Admin specific
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  userName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  statusButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  statusButtonTextActive: {
    color: COLORS.white,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});

export default styles;
