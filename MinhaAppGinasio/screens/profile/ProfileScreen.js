import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/common/Button";
import { ConfirmModal } from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import useModal from "../../hooks/useModal";
import useToast from "../../hooks/useToast";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signOutLoading, setSignOutLoading] = useState(false);

  // Hooks para modal e toast
  const { showConfirm, visible, config, hideModal } = useModal();
  const { toast, showSuccess, showError, hideToast } = useToast();

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
      showError("Erro ao carregar perfil. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = () => {
    showConfirm({
      title: "Sair da Conta",
      message:
        "Tem certeza que deseja sair da aplicação? Você precisará fazer login novamente para acessar seus dados.",
      confirmText: "Sair",
      cancelText: "Cancelar",
      type: "warning",
      onConfirm: async () => {
        setSignOutLoading(true);
        try {
          await signOut();
          showSuccess("Logout realizado com sucesso!");
        } catch (error) {
          console.error("Error signing out:", error);
          showError("Erro ao fazer logout. Tente novamente.");
        } finally {
          setSignOutLoading(false);
        }
      },
    });
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
      disabled={signOutLoading}
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
    <>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
        position="top"
      />

      <ConfirmModal
        visible={visible && config.content?.type === "confirm"}
        onClose={hideModal}
        title={config.title}
        message={config.content?.message}
        confirmText={config.content?.confirmText}
        cancelText={config.content?.cancelText}
        type={config.type}
        onConfirm={config.content?.onConfirm}
        isLoading={signOutLoading}
      />

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
            style={[
              styles.signOutButton,
              signOutLoading && styles.disabledButton,
            ]}
            disabled={signOutLoading}
            isLoading={signOutLoading}
          />
        </View>
      </ScrollView>
    </>
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
  disabledButton: {
    opacity: 0.6,
  },
});
