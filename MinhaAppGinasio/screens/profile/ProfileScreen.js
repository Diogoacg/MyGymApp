import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/common/Button";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setProfile(
        data || { id: user.id, full_name: user.email, email: user.email }
      );
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = () => {
    Alert.alert("Sair", "Tem certeza que deseja sair da aplicação?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  const menuItems = [
    {
      title: "Configurações",
      subtitle: "Preferências e notificações",
      icon: "settings-outline",
      onPress: () => navigation.navigate("Settings"),
    },
    {
      title: "Lembrete de Creatina",
      subtitle: "Configurar lembretes de suplemento",
      icon: "alarm-outline",
      onPress: () => navigation.navigate("CreatineReminder"),
    },
    {
      title: "Outros Lembretes",
      subtitle: "Lembretes personalizados",
      icon: "notifications-outline",
      onPress: () => navigation.navigate("OtherReminders"),
    },
  ];

  const renderMenuItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={[globalStyles.card, styles.menuItem]}
      onPress={item.onPress}
    >
      <View style={styles.menuContent}>
        <View style={styles.menuIcon}>
          <Ionicons name={item.icon} size={24} color={colors.primary} />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{item.title}</Text>
          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header do Perfil */}
      <View style={[globalStyles.card, styles.profileHeader]}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={colors.primary} />
          </View>
        </View>
        <Text style={styles.profileName}>
          {profile?.full_name || user?.email || "Usuário"}
        </Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>{menuItems.map(renderMenuItem)}</View>

      {/* Botão de Sair */}
      <View style={styles.signOutSection}>
        <Button
          title="Sair da Conta"
          onPress={handleSignOut}
          variant="outline"
          style={styles.signOutButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    alignItems: "center",
    padding: 30,
    margin: 20,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray[100],
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: colors.primary,
  },
  profileName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  menuSection: {
    padding: 20,
    paddingTop: 0,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  menuContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  signOutSection: {
    padding: 20,
    paddingBottom: 40,
  },
  signOutButton: {
    borderColor: colors.error,
  },
});
