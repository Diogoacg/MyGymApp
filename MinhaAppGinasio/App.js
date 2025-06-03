import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import AppNavigator from "./navigation/AppNavigator";
import AuthNavigator from "./navigation/AuthNavigator";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "./styles/colors";

// Componente para decidir qual navegador renderizar
const AppContent = () => {
  const { user, loading } = useContext(AuthContext);

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary || "#007AFF"} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <View style={styles.appContainer}>
        {user ? <AppNavigator /> : <AuthNavigator />}
      </View>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: colors.background || "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background || "#f5f5f5",
  },
});
