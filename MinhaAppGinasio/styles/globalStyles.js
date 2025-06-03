import { StyleSheet } from "react-native";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padding: {
    padding: 20,
  },
  paddingHorizontal: {
    paddingHorizontal: 20,
  },
  marginBottom: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  text: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  textSecondary: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
});
