import { StyleSheet } from "react-native";
import COLORS from "../../constants/colors";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.textSecondary,
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    padding: 10,
    marginBottom: 10,
  },
  image: {
    width: 70,
    height: 96,
    borderRadius: 8,
    marginRight: 10,
  },
  info: {
    flex: 1,
    justifyContent: "space-between",
  },
  bookTitle: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  caption: {
    color: COLORS.textDark,
    fontSize: 13,
  },
  creator: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 12,
  },
  removeText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    color: COLORS.textSecondary,
    marginTop: 10,
  },
});

export default styles;
