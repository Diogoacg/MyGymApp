import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Toast from "../components/common/Toast";
import { ConfirmModal } from "../components/common/Modal";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { globalStyles } from "../styles/globalStyles";
import useWaterIntake from "../hooks/useWaterIntake";
import useUserSettings from "../hooks/useUserSettings";
import useToast from "../hooks/useToast";

export default function WaterTrackingScreen() {
  const {
    userId,
    todayIntake,
    weeklyData,
    dailyGoal,
    loading,
    error,
    fetchTodayIntake,
    fetchWeeklyData,
    fetchUserSettings,
    addWaterIntake,
    deleteWaterLog,
    getTodayLogs,
    getLocalDateString,
  } = useWaterIntake();

  const { settings } = useUserSettings();
  const { toast, showSuccess, showError, hideToast } = useToast();

  const [customAmount, setCustomAmount] = useState("");
  const [todayLogs, setTodayLogs] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Animação para o progresso
  const progressAnimation = useState(new Animated.Value(0))[0];

  // Usar meta diretamente dos settings
  const currentWaterGoal = settings.water_goal_ml || 2000;

  console.log("💧 WaterTrackingScreen render:", {
    todayIntake,
    dailyGoal,
    currentWaterGoal,
    settingsWaterGoal: settings.water_goal_ml,
    todayDate: getLocalDateString ? getLocalDateString() : "not available",
    weeklyDataCount: weeklyData.length,
    todayLogsCount: todayLogs.length,
  });

  // useFocusEffect para recarregar quando voltar à tela
  useFocusEffect(
    React.useCallback(() => {
      console.log("🎯 WaterTracking gained focus - reloading data...");
      if (userId) {
        loadAllWaterData();
      }
    }, [userId])
  );

  // Função para carregar/recarregar todos os dados
  const loadAllWaterData = async () => {
    if (userId) {
      await Promise.all([
        fetchTodayIntake(),
        fetchWeeklyData(),
        fetchUserSettings(),
        loadTodayLogs(),
      ]);
    }
  };

  // Função para carregar logs de hoje usando o hook
  const loadTodayLogs = async () => {
    if (getTodayLogs) {
      const logs = await getTodayLogs();
      setTodayLogs(logs);
      console.log("📋 Today logs loaded:", {
        count: logs.length,
        date: getLocalDateString ? getLocalDateString() : "unknown",
      });
    }
  };

  // Recarregar logs quando todayIntake mudar
  useEffect(() => {
    if (userId) {
      loadTodayLogs();
    }
  }, [userId, todayIntake]);

  // Animação do progresso (usar meta atual dos settings)
  useEffect(() => {
    const progressPercentage = Math.min(
      (todayIntake / currentWaterGoal) * 100,
      100
    );

    console.log("🎬 Water screen - updating progress animation:", {
      todayIntake,
      currentWaterGoal,
      progressPercentage,
    });

    Animated.timing(progressAnimation, {
      toValue: progressPercentage / 100,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [todayIntake, currentWaterGoal]);

  async function handleLogWater(amount) {
    if (!userId) {
      showError("Utilizador não autenticado.");
      return;
    }

    console.log("💧 Logging water for today:", {
      amount,
      currentDate: getLocalDateString ? getLocalDateString() : "unknown",
    });

    const result = await addWaterIntake(amount);
    if (result.error) {
      showError(
        result.error.message || "Não foi possível registar o consumo de água."
      );
    } else {
      showSuccess(`${amount}ml de água registados!`);
      // Os logs serão recarregados automaticamente devido ao useEffect
    }
  }

  async function handleAddCustomAmount() {
    const amount = parseInt(customAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Por favor, insira uma quantidade válida.");
      return;
    }
    if (amount > 2000) {
      showError("Quantidade muito elevada. Máximo: 2000ml por registo.");
      return;
    }
    await handleLogWater(amount);
    setCustomAmount("");
  }

  const handleDeleteRequest = (log) => {
    setLogToDelete(log);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!logToDelete || !userId) return;

    setIsDeleting(true);
    setShowDeleteModal(false);

    try {
      const result = await deleteWaterLog(logToDelete.id);
      if (result.error) {
        showError(result.error.message || "Não foi possível apagar o registo.");
      } else {
        showSuccess("Registo apagado com sucesso!");
        // Os logs serão recarregados automaticamente devido ao useEffect
      }
    } catch (error) {
      showError("Erro inesperado ao apagar registo.");
    } finally {
      setIsDeleting(false);
      setLogToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setLogToDelete(null);
  };

  useEffect(() => {
    if (error) {
      showError(
        error.message || "Ocorreu um erro ao processar os dados de água."
      );
    }
  }, [error]);

  // Calcular progresso com a meta atual dos settings
  const progressPercentage = Math.min(
    (todayIntake / currentWaterGoal) * 100,
    100
  );

  // Determinar o estado de refresh geral
  const isRefreshing =
    loading.today || loading.weekly || loading.action || loading.settings;

  // Função para obter cor baseada no progresso
  const getProgressColor = () => {
    if (progressPercentage < 30) return colors.error;
    if (progressPercentage < 70) return colors.warning;
    return colors.success;
  };

  // Função para obter ícone baseado no progresso
  const getProgressIcon = () => {
    if (progressPercentage >= 100) return "checkmark-circle";
    if (progressPercentage >= 70) return "water";
    return "water-outline";
  };

  // Função para formatar horário de um log
  const formatLogTime = (loggedAt) => {
    return new Date(loggedAt).toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!userId && (loading.today || loading.settings)) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          A carregar dados do utilizador...
        </Text>
      </View>
    );
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja apagar o registo de ${
          logToDelete?.amount_ml
        }ml registado às ${
          logToDelete ? formatLogTime(logToDelete.logged_at) : ""
        }?`}
        confirmText="Apagar"
        cancelText="Cancelar"
        type="error"
        confirmButtonStyle={{ backgroundColor: colors.error }}
        isLoading={isDeleting}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadAllWaterData}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header com Progress */}
        <View style={[globalStyles.card, styles.progressCard]}>
          <View style={styles.progressHeader}>
            <Ionicons
              name={getProgressIcon()}
              size={32}
              color={getProgressColor()}
            />
            <Text style={styles.title}>Consumo de Água</Text>
          </View>

          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {getLocalDateString
                ? new Date(getLocalDateString()).toLocaleDateString("pt-PT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : "Data não disponível"}
            </Text>
          </View>

          {(loading.today || loading.settings) && !isRefreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Carregando...</Text>
            </View>
          ) : (
            <>
              <Text
                style={[styles.intakeAmount, { color: getProgressColor() }]}
              >
                {todayIntake}ml
              </Text>
              <Text style={styles.goalText}>Meta: {currentWaterGoal}ml</Text>

              <View style={styles.progressContainer}>
                <View style={styles.progressBarBackground}>
                  <Animated.View
                    style={[
                      styles.progressBar,
                      {
                        width: progressAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                        backgroundColor: getProgressColor(),
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.progressText, { color: getProgressColor() }]}
                >
                  {Math.round(progressPercentage)}%
                </Text>
              </View>

              {progressPercentage >= 100 && (
                <View style={styles.congratsContainer}>
                  <Ionicons name="trophy" size={20} color={colors.success} />
                  <Text style={styles.congratsText}>Meta atingida! 🎉</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Quick Actions */}
        <View style={[globalStyles.card, styles.quickActions]}>
          <Text style={styles.sectionTitle}>Adicionar Água</Text>

          <View style={styles.quickButtons}>
            {[250, 500, 750].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.quickButton,
                  loading.action && styles.quickButtonDisabled,
                ]}
                onPress={() => handleLogWater(amount)}
                disabled={loading.action}
                activeOpacity={0.7}
              >
                <View style={styles.quickButtonContent}>
                  <Ionicons name="water" size={24} color={colors.white} />
                  <Text style={styles.quickButtonText}>{amount}ml</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customAmountContainer}>
            <Input
              placeholder="Quantidade personalizada (ml)"
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="numeric"
              style={styles.customInput}
              editable={!loading.action}
              maxLength={4}
            />
            <Button
              title="Adicionar"
              onPress={handleAddCustomAmount}
              style={styles.addButton}
              isLoading={loading.action}
              disabled={loading.action || !customAmount.trim()}
              size="medium"
            />
          </View>
        </View>

        {/* Weekly Chart Otimizado */}
        {loading.weekly && weeklyData.length === 0 ? (
          <View style={[globalStyles.card, styles.loadingCard]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>A carregar dados semanais...</Text>
          </View>
        ) : (
          weeklyData.length > 0 && (
            <View style={[globalStyles.card, styles.weeklyChart]}>
              <Text style={styles.sectionTitle}>Esta Semana</Text>

              {/* Gráfico responsivo */}
              <View style={styles.chartContainer}>
                {weeklyData.map((day, index) => {
                  const dayProgress = (day.total / currentWaterGoal) * 100;
                  const barHeight = Math.max(dayProgress, 5); // Altura mínima para visibilidade

                  // Formatação do valor para display compacto
                  const displayAmount =
                    day.total >= 1000
                      ? `${(day.total / 1000).toFixed(1)}L`
                      : `${day.total}ml`;

                  // Nome do dia abreviado para mobile
                  const shortDayName = day.dayName.substring(0, 3);

                  return (
                    <View key={index} style={styles.dayColumn}>
                      {/* Valor com formatação inteligente */}
                      <Text
                        style={styles.dayAmount}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {displayAmount}
                      </Text>

                      {/* Barra de progresso */}
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${Math.min(barHeight, 100)}%`,
                              backgroundColor: day.isToday
                                ? colors.primary
                                : dayProgress >= 100
                                ? colors.success
                                : colors.gray[400],
                            },
                          ]}
                        />
                      </View>

                      {/* Label do dia */}
                      <Text
                        style={[
                          styles.dayLabel,
                          day.isToday && styles.todayLabel,
                        ]}
                        numberOfLines={1}
                      >
                        {shortDayName}
                      </Text>

                      {/* Ícone de conclusão (apenas se meta atingida) */}
                      {dayProgress >= 100 && (
                        <Ionicons
                          name="checkmark-circle"
                          size={12} // Tamanho reduzido
                          color={colors.success}
                          style={styles.dayComplete}
                        />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Legenda opcional para telas pequenas */}
              <View style={styles.chartLegend}>
                <Text style={styles.legendText}>
                  Meta diária:{" "}
                  {currentWaterGoal >= 1000
                    ? `${(currentWaterGoal / 1000).toFixed(1)}L`
                    : `${currentWaterGoal}ml`}
                </Text>
              </View>
            </View>
          )
        )}

        {/* Today's Logs */}
        {todayLogs.length > 0 && (
          <View style={[globalStyles.card, styles.logsContainer]}>
            <View style={styles.logsHeader}>
              <Text style={styles.sectionTitle}>Registos de Hoje</Text>
              <Text style={styles.logsCount}>{todayLogs.length} registos</Text>
            </View>

            {todayLogs.map((log, index) => (
              <View
                key={log.id}
                style={[
                  styles.logItem,
                  index === todayLogs.length - 1 && styles.lastLogItem,
                ]}
              >
                <View style={styles.logContent}>
                  <View style={styles.logIcon}>
                    <Ionicons name="water" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={styles.logAmount}>{log.amount_ml}ml</Text>
                    <Text style={styles.logTime}>
                      {formatLogTime(log.logged_at)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteRequest(log)}
                  style={styles.deleteButton}
                  disabled={loading.action || isDeleting}
                  activeOpacity={0.7}
                >
                  {loading.action || isDeleting ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={colors.error}
                    />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {todayLogs.length === 0 && !loading.today && (
          <View style={[globalStyles.card, styles.emptyState]}>
            <Ionicons name="water-outline" size={48} color={colors.gray[400]} />
            <Text style={styles.emptyStateTitle}>Nenhum registo hoje</Text>
            <Text style={styles.emptyStateText}>
              Comece a registar o seu consumo de água para acompanhar o
              progresso diário
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
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
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: typography?.sizes?.md || 16,
    color: colors.textSecondary,
  },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  progressCard: {
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 30,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: typography?.sizes?.xl || 20,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginLeft: 10,
  },
  dateContainer: {
    marginBottom: 15,
  },
  dateText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    textAlign: "center",
    textTransform: "capitalize",
  },
  intakeAmount: {
    fontSize: 48,
    fontWeight: typography?.weights?.bold || "bold",
    marginVertical: 10,
  },
  goalText: {
    fontSize: typography?.sizes?.md || 16,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: colors.gray?.[200] || "#e5e7eb",
    borderRadius: 6,
    marginRight: 15,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 6,
  },
  progressText: {
    fontSize: typography?.sizes?.md || 16,
    fontWeight: typography?.weights?.bold || "bold",
    minWidth: 50,
    textAlign: "right",
  },
  congratsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success + "20",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  congratsText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.success,
    fontWeight: typography?.weights?.medium || "500",
    marginLeft: 5,
  },
  quickActions: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginBottom: 20,
  },
  quickButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    gap: 15,
  },
  quickButton: {
    backgroundColor: colors.primary,
    flex: 1,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 90,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickButtonDisabled: {
    opacity: 0.6,
  },
  quickButtonContent: {
    alignItems: "center",
  },
  quickButtonText: {
    color: colors.white,
    fontSize: typography?.sizes?.md || 16,
    fontWeight: typography?.weights?.semibold || "600",
    marginTop: 8,
  },
  customAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  customInput: {
    flex: 1,
    marginBottom: 0,
  },
  addButton: {
    minWidth: 100,
    marginBottom: 0,
  },
  weeklyChart: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 160,
    paddingTop: 20,
  },
  dayColumn: {
    alignItems: "center",
    flex: 1,
  },
  dayAmount: {
    fontSize: typography?.sizes?.xs || 12,
    color: colors.text,
    fontWeight: typography?.weights?.medium || "500",
    marginBottom: 5,
  },
  barContainer: {
    height: 100,
    width: 20,
    backgroundColor: colors.gray?.[200] || "#e5e7eb",
    borderRadius: 10,
    justifyContent: "flex-end",
    overflow: "hidden",
    marginBottom: 8,
  },
  bar: {
    width: "100%",
    borderRadius: 10,
    minHeight: 4,
  },
  // 📊 **GRÁFICO SEMANAL OTIMIZADO PARA MOBILE**
  weeklyChart: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15, // Padding interno para melhor espaçamento
  },

  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between", // Mudou de space-around para space-between
    alignItems: "flex-end",
    height: 140, // Altura reduzida para mobile
    paddingTop: 15,
    paddingHorizontal: 5, // Padding horizontal para as colunas
  },

  dayColumn: {
    alignItems: "center",
    flex: 1,
    minWidth: 40, // Largura mínima garantida
    maxWidth: 50, // Largura máxima para não ficar muito largo
  },

  // 📱 **VALORES OTIMIZADOS PARA MOBILE**
  dayAmount: {
    fontSize: 10, // Tamanho menor para caber melhor
    color: colors.text,
    fontWeight: typography?.weights?.medium || "500",
    marginBottom: 4,
    textAlign: "center",
    // Quebra de linha se necessário
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
  },

  barContainer: {
    height: 80, // Altura reduzida de 100 para 80
    width: 16, // Largura reduzida de 20 para 16
    backgroundColor: colors.gray?.[200] || "#e5e7eb",
    borderRadius: 8, // Raio menor
    justifyContent: "flex-end",
    overflow: "hidden",
    marginBottom: 6,
    marginHorizontal: 2, // Espaçamento horizontal entre barras
  },

  bar: {
    width: "100%",
    borderRadius: 8,
    minHeight: 3, // Altura mínima reduzida
  },

  // 🏷️ **LABELS DOS DIAS OTIMIZADOS**
  dayLabel: {
    fontSize: 9, // Tamanho bem pequeno para caber
    color: colors.textSecondary,
    fontWeight: typography?.weights?.medium || "500",
    textAlign: "center",
    marginTop: 2,
    // Garantir que não quebra
    numberOfLines: 1,
  },

  todayLabel: {
    color: colors.primary,
    fontWeight: typography?.weights?.bold || "bold",
    fontSize: 10, // Ligeiramente maior para destaque
  },

  dayComplete: {
    marginTop: 1,
    alignSelf: "center",
  },

  // 📊 **VERSÃO ALTERNATIVA PARA TELAS MUITO PEQUENAS**
  compactChart: {
    height: 120,
    paddingTop: 10,
  },

  compactDayColumn: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 1,
  },

  compactBarContainer: {
    height: 60,
    width: 12,
    borderRadius: 6,
    marginBottom: 4,
  },

  compactDayAmount: {
    fontSize: 8,
    marginBottom: 2,
  },

  compactDayLabel: {
    fontSize: 8,
  },

  logsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  logsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logsCount: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    backgroundColor: colors.gray?.[100] || "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray?.[200] || "#e5e7eb",
  },
  lastLogItem: {
    borderBottomWidth: 0,
  },
  logContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  logInfo: {
    flex: 1,
  },
  logAmount: {
    fontSize: typography?.sizes?.md || 16,
    fontWeight: typography?.weights?.semibold || "600",
    color: colors.text,
    marginBottom: 2,
  },
  logTime: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.error + "10",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.semibold || "600",
    color: colors.text,
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: typography?.sizes?.md || 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  chartLegend: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.gray?.[200] || "#e5e7eb",
    alignItems: "center",
  },

  legendText: {
    fontSize: typography?.sizes?.xs || 11,
    color: colors.textSecondary,
    fontWeight: typography?.weights?.medium || "500",
  },
});
