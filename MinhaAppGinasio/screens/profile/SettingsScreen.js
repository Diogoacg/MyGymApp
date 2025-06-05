import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Share,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Toast from "../../components/common/Toast";
import { ConfirmModal } from "../../components/common/Modal";
import useUserSettings from "../../hooks/useUserSettings";
import useToast from "../../hooks/useToast";

export default function SettingsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showWaterGoalModal, setShowWaterGoalModal] = useState(false);
  const [showWorkoutGoalModal, setShowWorkoutGoalModal] = useState(false); // Novo modal
  const [waterGoalInput, setWaterGoalInput] = useState("");
  const [workoutGoalInput, setWorkoutGoalInput] = useState(""); // Novo input

  const {
    settings,
    loading,
    error,
    loadSettings,
    updateSetting,
    resetToDefaults,
    exportSettings,
  } = useUserSettings();

  const { toast, showSuccess, showError, hideToast } = useToast();

  console.log("⚙️ SettingsScreen render:", {
    loading,
    hasError: !!error,
    settings,
  });

  const onRefresh = async () => {
    console.log("🔄 Manual refresh triggered");
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  const handleUpdateSetting = async (key, value) => {
    console.log("📝 handleUpdateSetting:", { key, value });

    const result = await updateSetting(key, value);

    if (result.error) {
      console.log("❌ Error updating setting:", result.error);
      showError("Não foi possível guardar as definições.");
    } else {
      console.log("✅ Setting updated successfully");
      showSuccess("Definição atualizada!");
    }
  };

  const handleResetSettings = async () => {
    console.log("🔄 handleResetSettings");
    setShowResetModal(false);

    const result = await resetToDefaults();

    if (result.error) {
      console.log("❌ Error resetting settings:", result.error);
      showError("Não foi possível repor as definições.");
    } else {
      console.log("✅ Settings reset successfully");
      showSuccess("Definições repostas com sucesso!");
    }
  };

  const handleUpdateWaterGoal = async () => {
    console.log("💧 handleUpdateWaterGoal:", waterGoalInput);
    const goal = parseInt(waterGoalInput);

    if (isNaN(goal) || goal < 500 || goal > 5000) {
      showError("Meta de água deve estar entre 500ml e 5000ml.");
      return;
    }

    setShowWaterGoalModal(false);
    const result = await updateSetting("water_goal_ml", goal);

    if (result.error) {
      showError("Não foi possível atualizar a meta de água.");
    } else {
      showSuccess("Meta de água atualizada!");
    }
  };

  // Nova função para atualizar meta semanal de treinos
  const handleUpdateWorkoutGoal = async () => {
    console.log("🏋️ handleUpdateWorkoutGoal:", workoutGoalInput);
    const goal = parseInt(workoutGoalInput);

    if (isNaN(goal) || goal < 1 || goal > 7) {
      showError("Meta de treinos deve estar entre 1 e 7 treinos por semana.");
      return;
    }

    setShowWorkoutGoalModal(false);
    const result = await updateSetting("weekly_workout_goal", goal);

    if (result.error) {
      showError("Não foi possível atualizar a meta de treinos.");
    } else {
      showSuccess("Meta de treinos atualizada!");
    }
  };

  const handleExportData = async () => {
    console.log("📤 handleExportData");

    try {
      const exportData = exportSettings();
      const shareContent = {
        title: "Definições da App Ginásio",
        message: `Definições exportadas:\n\n${JSON.stringify(
          exportData,
          null,
          2
        )}`,
      };

      await Share.share(shareContent);
      showSuccess("Definições exportadas!");
    } catch (error) {
      console.error("💥 Error exporting data:", error);
      showError("Erro ao exportar definições.");
    }
  };

  const handleClearCache = async () => {
    console.log("🗑️ handleClearCache");

    try {
      await AsyncStorage.removeItem("app_cache");
      await AsyncStorage.removeItem("workout_cache");
      await AsyncStorage.removeItem("water_cache");
      showSuccess("Cache limpo com sucesso!");
    } catch (error) {
      console.error("💥 Error clearing cache:", error);
      showError("Não foi possível limpar o cache.");
    }
  };

  const settingsItems = [
    {
      title: "Notificações Gerais",
      subtitle: "Receber notificações push",
      key: "notifications_enabled",
      type: "switch",
      icon: "notifications-outline",
    },
    {
      title: "Lembretes de Água",
      subtitle: "Notificações para beber água",
      key: "water_reminders_enabled",
      type: "switch",
      icon: "water-outline",
    },
    {
      title: "Lembretes de Treino",
      subtitle: "Notificações para treinar",
      key: "workout_reminders_enabled",
      type: "switch",
      icon: "fitness-outline",
    },
    {
      title: "Modo Escuro",
      subtitle: "Tema escuro da aplicação",
      key: "dark_mode_enabled",
      type: "switch",
      icon: "moon-outline",
    },
  ];

  const actionItems = [
    {
      title: "Meta de Água Diária",
      subtitle: `Atual: ${settings.water_goal_ml || 2000}ml`,
      icon: "water-outline",
      onPress: () => {
        setWaterGoalInput(String(settings.water_goal_ml || 2000));
        setShowWaterGoalModal(true);
      },
    },
    {
      title: "Meta de Treinos Semanal", // Novo item
      subtitle: `Atual: ${
        settings.weekly_workout_goal || 3
      } treinos por semana`,
      icon: "fitness-outline",
      onPress: () => {
        setWorkoutGoalInput(String(settings.weekly_workout_goal || 3));
        setShowWorkoutGoalModal(true);
      },
    },
    {
      title: "Exportar Definições",
      subtitle: "Partilhar as suas configurações",
      icon: "share-outline",
      onPress: handleExportData,
    },
    {
      title: "Limpar Cache",
      subtitle: "Remover dados temporários",
      icon: "trash-outline",
      onPress: handleClearCache,
    },
    {
      title: "Repor Definições",
      subtitle: "Voltar aos valores padrão",
      icon: "refresh-outline",
      onPress: () => setShowResetModal(true),
    },
    {
      title: "Sobre a App",
      subtitle: "Versão e informações",
      icon: "information-circle-outline",
      onPress: () => {
        showSuccess(
          "Minha App Ginásio v1.0.0\nDesenvolvido com React Native e Supabase"
        );
      },
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
        value={settings[item.key] || false}
        onValueChange={(value) => handleUpdateSetting(item.key, value)}
        trackColor={{ false: colors.gray?.[300], true: colors.primary }}
        thumbColor={settings[item.key] ? colors.white : colors.gray?.[100]}
        disabled={loading}
      />
    </View>
  );

  const renderActionItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={[globalStyles.card, styles.actionItem]}
      onPress={item.onPress}
      disabled={loading}
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
      <Ionicons name="chevron-forward" size={20} color={colors.gray?.[400]} />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    console.log("⏳ Showing loading spinner");
    return <LoadingSpinner text="A carregar definições..." />;
  }

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
        position="top"
      />

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetSettings}
        title="Repor Definições"
        message="Tem certeza que deseja repor todas as definições para os valores padrão? Esta ação não pode ser desfeita."
        confirmText="Repor"
        cancelText="Cancelar"
        type="warning"
      />

      {/* Water Goal Modal */}
      <ConfirmModal
        visible={showWaterGoalModal}
        onClose={() => setShowWaterGoalModal(false)}
        onConfirm={handleUpdateWaterGoal}
        title="Meta de Água Diária"
        confirmText="Guardar"
        cancelText="Cancelar"
        type="default"
      >
        <View style={styles.goalModalContent}>
          <Text style={styles.modalText}>
            Defina a sua meta diária de consumo de água (entre 500ml e 5000ml):
          </Text>
          <TextInput
            style={styles.goalInput}
            value={waterGoalInput}
            onChangeText={setWaterGoalInput}
            placeholder="Ex: 2000"
            keyboardType="numeric"
            maxLength={4}
            autoFocus={true}
          />
          <Text style={styles.modalSubtext}>ml por dia</Text>
        </View>
      </ConfirmModal>

      {/* Workout Goal Modal - Novo Modal */}
      <ConfirmModal
        visible={showWorkoutGoalModal}
        onClose={() => setShowWorkoutGoalModal(false)}
        onConfirm={handleUpdateWorkoutGoal}
        title="Meta de Treinos Semanal"
        confirmText="Guardar"
        cancelText="Cancelar"
        type="default"
      >
        <View style={styles.goalModalContent}>
          <Text style={styles.modalText}>
            Quantos treinos por semana deseja fazer? (entre 1 e 7):
          </Text>
          <TextInput
            style={styles.goalInput}
            value={workoutGoalInput}
            onChangeText={setWorkoutGoalInput}
            placeholder="Ex: 3"
            keyboardType="numeric"
            maxLength={1}
            autoFocus={true}
          />
          <Text style={styles.modalSubtext}>treinos por semana</Text>

          {/* Dicas visuais */}
          <View style={styles.workoutGoalTips}>
            <Text style={styles.tipText}>💡 Dicas:</Text>
            <Text style={styles.tipItem}>• 2-3 treinos: Iniciante</Text>
            <Text style={styles.tipItem}>• 3-4 treinos: Intermédio</Text>
            <Text style={styles.tipItem}>• 5-6 treinos: Avançado</Text>
          </View>
        </View>
      </ConfirmModal>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferências</Text>
          {settingsItems.map(renderSettingItem)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          {actionItems.map(renderActionItem)}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            As suas definições são sincronizadas na cloud e aplicadas em todos
            os dispositivos.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.bold || "bold",
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
    fontSize: typography?.sizes?.md || 16,
    fontWeight: typography?.weights?.medium || "500",
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
  },
  footer: {
    padding: 20,
    paddingTop: 0,
  },
  footerText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
  goalModalContent: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalText: {
    fontSize: typography?.sizes?.md || 16,
    color: colors.text,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  goalInput: {
    borderWidth: 1,
    borderColor: colors.gray?.[300] || "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: typography?.sizes?.lg || 18,
    textAlign: "center",
    minWidth: 120,
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  modalSubtext: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
  },
  // Novos estilos para as dicas de treino
  workoutGoalTips: {
    marginTop: 20,
    padding: 15,
    backgroundColor: colors.primary + "10",
    borderRadius: 8,
    width: "100%",
  },
  tipText: {
    fontSize: typography?.sizes?.sm || 14,
    fontWeight: typography?.weights?.semibold || "600",
    color: colors.primary,
    marginBottom: 8,
  },
  tipItem: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    marginBottom: 4,
    paddingLeft: 8,
  },
});
