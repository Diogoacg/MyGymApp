import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";

export default function SettingsScreen() {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    waterReminders: true,
    workoutReminders: true,
    dataBackup: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const savedSettings = await AsyncStorage.getItem("app_settings");
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  async function updateSetting(key, value) {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await AsyncStorage.setItem("app_settings", JSON.stringify(newSettings));
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Erro", "Não foi possível guardar as definições.");
    }
  }

  const settingsItems = [
    {
      title: "Notificações",
      subtitle: "Receber notificações push",
      key: "notifications",
      type: "switch",
      icon: "notifications-outline",
    },
    {
      title: "Lembretes de Água",
      subtitle: "Notificações para beber água",
      key: "waterReminders",
      type: "switch",
      icon: "water-outline",
    },
    {
      title: "Lembretes de Treino",
      subtitle: "Notificações para treinar",
      key: "workoutReminders",
      type: "switch",
      icon: "fitness-outline",
    },
    {
      title: "Backup de Dados",
      subtitle: "Sincronizar dados na cloud",
      key: "dataBackup",
      type: "switch",
      icon: "cloud-outline",
    },
  ];

  const actionItems = [
    {
      title: "Exportar Dados",
      subtitle: "Fazer download dos seus dados",
      icon: "download-outline",
      onPress: () => Alert.alert("Info", "Funcionalidade em desenvolvimento"),
    },
    {
      title: "Limpar Cache",
      subtitle: "Remover dados temporários",
      icon: "trash-outline",
      onPress: () => {
        Alert.alert("Confirmar", "Tem certeza que deseja limpar o cache?", [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Limpar",
            onPress: async () => {
              try {
                // Clear specific cache items, not all AsyncStorage
                await AsyncStorage.removeItem("app_cache");
                Alert.alert("Sucesso", "Cache limpo com sucesso!");
              } catch (error) {
                Alert.alert("Erro", "Não foi possível limpar o cache.");
              }
            },
          },
        ]);
      },
    },
    {
      title: "Sobre a App",
      subtitle: "Versão e informações",
      icon: "information-circle-outline",
      onPress: () =>
        Alert.alert(
          "Minha App Ginásio",
          "Versão 1.0.0\n\nDesenvolvido com React Native e Supabase"
        ),
    },
  ];

  const renderSettingItem = (item) => (
    <View key={item.key} style={[globalStyles.card, styles.settingItem]}>
      <View style={styles.settingContent}>
        <View style={styles.settingIcon}>
          <Ionicons name={item.icon} size={24} color={colors.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <Switch
        value={settings[item.key]}
        onValueChange={(value) => updateSetting(item.key, value)}
        trackColor={{ false: colors.gray[300], true: colors.primary }}
        thumbColor={settings[item.key] ? colors.white : colors.gray[100]}
      />
    </View>
  );

  const renderActionItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={[globalStyles.card, styles.actionItem]}
      onPress={item.onPress}
    >
      <View style={styles.settingContent}>
        <View style={styles.settingIcon}>
          <Ionicons name={item.icon} size={24} color={colors.textSecondary} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferências</Text>
        {settingsItems.map(renderSettingItem)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações</Text>
        {actionItems.map(renderActionItem)}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          As suas definições são guardadas localmente no dispositivo.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  actionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  settingContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    marginRight: 15,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  footer: {
    padding: 20,
    paddingTop: 0,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
});
