import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";
export default function LoadingSpinner({
  size = "large",
  color = colors.primary,
}) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
