import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textDark,
    fontFamily: "JetBrainsMono-Medium",
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  bookCard: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  bookImageContainer: {
    width: 110,
  },
  bookImage: {
    width: 110,
    height: "100%",
    minHeight: 170,
  },
  bookDetails: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 2,
  },
  priceTag: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 4,
  },
  caption: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  stockRow: {
    marginBottom: 2,
  },
  inStockText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#155724",
  },
  outOfStockText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#721C24",
  },
  date: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBackground,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  cartButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  cartButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  cartButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  footerLoader: {
    marginVertical: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // Legacy field kept for compatibility
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  bookHeader: {
    marginBottom: 8,
  },
});

export default styles;
