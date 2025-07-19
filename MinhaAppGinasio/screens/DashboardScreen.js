import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabaseClient";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { globalStyles } from "../styles/globalStyles";
import useWaterIntake from "../hooks/useWaterIntake";
import useWorkouts from "../hooks/useWorkouts";
import useUserSettings from "../hooks/useUserSettings";
import useToast from "../hooks/useToast";
import Toast from "../components/common/Toast";
import Button from "../components/common/Button";

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Animações
  const [waterProgressAnimation] = useState(new Animated.Value(0));
  const [workoutProgressAnimation] = useState(new Animated.Value(0));
  const [fadeAnimation] = useState(new Animated.Value(0));

  // Hooks para dados
  const {
    todayIntake,
    dailyGoal,
    loading: waterLoading,
    addWaterIntake,
    fetchTodayIntake,
    fetchUserSettings,
    fetchWeeklyData,
  } = useWaterIntake();

  const {
    workouts,
    loading: workoutsLoading,
    loadWorkouts,
    userId,
  } = useWorkouts();
  const {
    settings,
    loading: settingsLoading,
    loadSettings,
  } = useUserSettings();
  const { toast, showSuccess, showError, hideToast } = useToast();

  console.log("🔄 Dashboard render - Current values:", {
    platform: Platform.OS,
    dailyGoal,
    weeklyWorkoutGoal: settings.weekly_workout_goal,
    todayIntake,
    weeklyWorkouts,
    settingsLoaded: !settingsLoading,
    workoutsCount: workouts.length,
    workoutsLoading,
    refreshing,
    userId,
    isInitialLoad,
  });

  // 🔥 **FUNÇÃO MELHORADA**: Calcular treinos da semana atual com logs detalhados
  const calculateWeeklyWorkouts = useCallback((workoutsList = []) => {
    console.log("📊 Starting weekly workout calculation...", {
      totalWorkouts: workoutsList.length,
      workoutsList: workoutsList.map((w) => ({
        id: w.id,
        name: w.name,
        date: w.date,
      })),
    });

    if (!Array.isArray(workoutsList)) {
      console.warn("📊 workoutsList is not an array:", typeof workoutsList);
      setWeeklyWorkouts(0);
      return 0;
    }

    if (workoutsList.length === 0) {
      console.log("📊 No workouts found, setting weekly count to 0");
      setWeeklyWorkouts(0);
      return 0;
    }

    const today = new Date();
    console.log("📊 Today:", today.toISOString());

    // Calcular início da semana (segunda-feira)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    startOfWeek.setDate(today.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Calcular fim da semana (domingo)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    console.log("📊 Week range:", {
      startOfWeek: startOfWeek.toISOString(),
      endOfWeek: endOfWeek.toISOString(),
    });

    const weeklyWorkoutsFiltered = workoutsList.filter((workout) => {
      if (!workout || !workout.date) {
        console.warn("📊 Workout missing date:", workout);
        return false;
      }

      // Tentar diferentes formatos de data
      let workoutDate;
      try {
        // Se já é um objeto Date
        if (workout.date instanceof Date) {
          workoutDate = new Date(workout.date);
        } else {
          // Se é string, tentar adicionar horário
          workoutDate = new Date(workout.date + "T00:00:00");
        }

        // Verificar se a data é válida
        if (isNaN(workoutDate.getTime())) {
          console.warn("📊 Invalid workout date:", workout.date);
          return false;
        }

        const isInWeek = workoutDate >= startOfWeek && workoutDate <= endOfWeek;
        console.log("📊 Checking workout:", {
          name: workout.name,
          date: workout.date,
          workoutDate: workoutDate.toISOString(),
          isInWeek,
        });

        return isInWeek;
      } catch (error) {
        console.error("📊 Error parsing workout date:", error, workout.date);
        return false;
      }
    });

    const count = weeklyWorkoutsFiltered.length;
    console.log("📊 ✅ Weekly workouts calculated:", {
      weeklyCount: count,
      filteredWorkouts: weeklyWorkoutsFiltered.map((w) => ({
        id: w.id,
        name: w.name,
        date: w.date,
      })),
    });

    setWeeklyWorkouts(count);
    return count;
  }, []);

  // 🚀 **REFRESH FORÇADO**: Sempre que entrar na página
  const forceRefreshData = useCallback(async () => {
    console.log("🚀 Force refresh triggered");
    setRefreshing(true);

    try {
      // Forçar reload de todos os dados em paralelo
      await Promise.all([
        getUser(),
        fetchTodayIntake(),
        fetchUserSettings(),
        fetchWeeklyData(),
        loadSettings(),
        loadWorkouts(), // Força recarregar workouts
      ]);

      console.log("✅ Force refresh completed");
    } catch (error) {
      console.error("❌ Error in force refresh:", error);
    } finally {
      setRefreshing(false);
      setIsInitialLoad(false);
    }
  }, [
    fetchTodayIntake,
    fetchUserSettings,
    fetchWeeklyData,
    loadSettings,
    loadWorkouts,
  ]);

  // 🎯 **FOCUS EFFECT**: Sempre refresh quando entrar na tela
  useFocusEffect(
    useCallback(() => {
      console.log("🎯 Dashboard gained focus - forcing refresh...");

      // Animar entrada
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // SEMPRE fazer refresh quando entrar na tela
      forceRefreshData();

      return () => {
        console.log("🎯 Dashboard lost focus");
        fadeAnimation.setValue(0);
      };
    }, [forceRefreshData, fadeAnimation])
  );

  // 🔄 **PULL TO REFRESH**: Função otimizada
  const onRefresh = useCallback(async () => {
    console.log("🔄 Pull-to-refresh triggered on:", Platform.OS);
    await forceRefreshData();
    showSuccess("Dados atualizados!");
  }, [forceRefreshData, showSuccess]);

  // 🔥 **EFFECT PRINCIPAL**: Recalcular treinos IMEDIATAMENTE quando workouts mudam
  useEffect(() => {
    console.log("🔄 Workouts effect triggered:", {
      workoutsLength: workouts.length,
      workoutsLoading,
      userId,
      hasWorkouts: Array.isArray(workouts),
      workouts: workouts.map((w) => ({ id: w.id, name: w.name, date: w.date })),
    });

    // Calcular SEMPRE que workouts mudar, independente de loading
    if (Array.isArray(workouts)) {
      const calculatedCount = calculateWeeklyWorkouts(workouts);
      console.log(
        "📊 ⚡ IMMEDIATE weekly workout calculation result:",
        calculatedCount
      );
    }
  }, [workouts, calculateWeeklyWorkouts]);

  // 🔄 **EFFECT ADICIONAL**: Garantir cálculo após loading completar
  useEffect(() => {
    if (!workoutsLoading && Array.isArray(workouts) && workouts.length > 0) {
      console.log("📊 Final calculation after loading completed");
      const finalCount = calculateWeeklyWorkouts(workouts);
      console.log("📊 Final weekly workout count:", finalCount);
    }
  }, [workoutsLoading, workouts, calculateWeeklyWorkouts]);

  // 🔄 **EFFECT PARA USERID**: Recarregar quando userId mudar
  useEffect(() => {
    if (userId && !isInitialLoad) {
      console.log("🆔 UserId changed, reloading workouts:", userId);
      loadWorkouts();
    }
  }, [userId, loadWorkouts, isInitialLoad]);

  // Usar valores dos settings diretamente (sem estado local)
  const currentWaterGoal = settings.water_goal_ml || 2000;
  const currentWorkoutGoal = settings.weekly_workout_goal || 3;

  // 🎬 **ANIMAÇÕES**: Atualizar com base nos valores reais
  useEffect(() => {
    const waterProgressPercentage = Math.min(
      (todayIntake / currentWaterGoal) * 100,
      100
    );
    const workoutProgressPercentage = Math.min(
      (weeklyWorkouts / currentWorkoutGoal) * 100,
      100
    );

    console.log("🎬 Updating progress animations:", {
      waterProgress: waterProgressPercentage,
      workoutProgress: workoutProgressPercentage,
      currentWaterGoal,
      currentWorkoutGoal,
      todayIntake,
      weeklyWorkouts,
      workoutsLength: workouts.length,
      timestamp: new Date().toTimeString(),
    });

    Animated.parallel([
      Animated.timing(waterProgressAnimation, {
        toValue: waterProgressPercentage / 100,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(workoutProgressAnimation, {
        toValue: workoutProgressPercentage / 100,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();
  }, [
    todayIntake,
    currentWaterGoal,
    weeklyWorkouts,
    currentWorkoutGoal,
    workouts.length,
  ]);

  async function getUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        console.error("Error getting user:", error);
        return;
      }
      setUser(user);
      console.log("👤 User loaded:", user?.email);
    } catch (error) {
      console.error("Error getting user:", error);
    }
  }

  const quickAddWater = async (amount) => {
    console.log("💧 Quick add water:", amount);
    try {
      const result = await addWaterIntake(amount);

      if (result.error) {
        showError(result.error.message || "Erro ao registar água");
      } else {
        showSuccess(`${amount}ml adicionados!`);
      }
    } catch (error) {
      showError("Erro inesperado ao registar água");
    }
  };

  const isLoading =
    waterLoading.today ||
    waterLoading.action ||
    waterLoading.settings ||
    workoutsLoading ||
    settingsLoading;

  // Calcular progresso com as metas atuais
  const progressPercentage = Math.min(
    (todayIntake / currentWaterGoal) * 100,
    100
  );
  const workoutProgressPercentage = Math.min(
    (weeklyWorkouts / currentWorkoutGoal) * 100,
    100
  );

  // Função para obter cor baseada no progresso da água
  const getWaterProgressColor = () => {
    if (progressPercentage < 30) return colors.error;
    if (progressPercentage < 70) return colors.warning;
    return colors.success;
  };

  // Função para obter cor baseada nos treinos
  const getWorkoutColor = () => {
    if (workoutProgressPercentage >= 100) return colors.success;
    if (workoutProgressPercentage >= 50) return colors.warning;
    return colors.error;
  };

  // Função para obter ícone baseado nos treinos
  const getWorkoutIcon = () => {
    if (workoutProgressPercentage >= 100) return "trophy";
    if (workoutProgressPercentage >= 50) return "fitness";
    return "fitness-outline";
  };

  // ...existing code...

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS !== "web" ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        style={Platform.OS === "web" ? styles.webScrollView : undefined}
        contentContainerStyle={
          Platform.OS === "web" ? styles.webContent : undefined
        }
      >
        {/* Header Simples */}
        <Animated.View
          style={[styles.modernHeader, { opacity: fadeAnimation }]}
        >
          <View style={styles.headerContent}>
            <View style={styles.userSection}>
              <Text style={styles.greeting}>
                Olá,{" "}
                {user?.user_metadata?.full_name?.split(" ")[0] ||
                  user?.email?.split("@")[0] ||
                  "Utilizador"}
                !
              </Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString("pt-PT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Cards Principais */}
        <Animated.View
          style={[styles.cardsContainer, { opacity: fadeAnimation }]}
        >
          <View style={styles.cardRow}>
            {/* Card Água */}
            <View style={[styles.card, styles.cardHalf]}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name="water"
                  size={24}
                  color={getWaterProgressColor()}
                  style={styles.cardIcon}
                />
                <Text style={styles.cardTitle}>Hidratação</Text>
              </View>

              {waterLoading.today && !refreshing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>Carregando...</Text>
                </View>
              ) : (
                <>
                  <Text
                    style={[
                      styles.mainValue,
                      { color: getWaterProgressColor() },
                    ]}
                  >
                    {todayIntake}ml
                  </Text>
                  <Text style={styles.goalText}>
                    Meta: {currentWaterGoal}ml
                  </Text>

                  <View style={styles.progressBar}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: waterProgressAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          }),
                          backgroundColor: getWaterProgressColor(),
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.progressPercent,
                      { color: getWaterProgressColor() },
                    ]}
                  >
                    {Math.round(progressPercentage)}%
                  </Text>

                  {progressPercentage >= 100 && (
                    <View style={styles.achievementBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color={colors.success}
                      />
                      <Text style={styles.achievementText}>Meta atingida!</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Card Treinos */}
            <View style={[styles.card, styles.cardHalf]}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name={getWorkoutIcon()}
                  size={24}
                  color={getWorkoutColor()}
                  style={styles.cardIcon}
                />
                <Text style={styles.cardTitle}>Treinos Semanais</Text>
              </View>

              {workoutsLoading && !refreshing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.secondary} />
                  <Text style={styles.loadingText}>Carregando...</Text>
                </View>
              ) : (
                <>
                  <Text
                    style={[styles.mainValue, { color: getWorkoutColor() }]}
                  >
                    {weeklyWorkouts}
                  </Text>
                  <Text style={styles.goalText}>
                    Meta: {currentWorkoutGoal} treinos
                  </Text>

                  <View style={styles.workoutDots}>
                    {[...Array(currentWorkoutGoal)].map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.dot,
                          index < weeklyWorkouts && styles.dotActive,
                          {
                            backgroundColor:
                              index < weeklyWorkouts
                                ? getWorkoutColor()
                                : colors.gray[300],
                          },
                        ]}
                      />
                    ))}
                  </View>

                  <Text
                    style={[
                      styles.progressPercent,
                      { color: getWorkoutColor() },
                    ]}
                  >
                    {Math.round(workoutProgressPercentage)}%
                  </Text>

                  {workoutProgressPercentage >= 100 && (
                    <View style={styles.achievementBadge}>
                      <Ionicons
                        name="trophy"
                        size={12}
                        color={colors.success}
                      />
                      <Text style={styles.achievementText}>
                        Objetivo cumprido!
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Botões de Água Rápida */}
        <Animated.View
          style={[styles.waterButtonsSection, { opacity: fadeAnimation }]}
        >
          <Text style={styles.sectionTitle}>Água Rápida</Text>
          <View style={styles.waterButtons}>
            {[250, 500, 750].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.waterButton,
                  (waterLoading.action || refreshing) &&
                    styles.waterButtonDisabled,
                ]}
                onPress={() => quickAddWater(amount)}
                disabled={waterLoading.action || refreshing}
                activeOpacity={0.8}
              >
                <Ionicons name="water" size={18} color={colors.white} />
                <Text style={styles.waterButtonText}>
                  {waterLoading.action ? "..." : `+${amount}ml`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Ações Rápidas */}
        <Animated.View
          style={[styles.actionsSection, { opacity: fadeAnimation }]}
        >
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() =>
              navigation.navigate("Workouts", { screen: "AddWorkout" })
            }
            activeOpacity={0.8}
            disabled={refreshing}
          >
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: colors.white + "20" },
              ]}
            >
              <Ionicons name="add-circle" size={20} color={colors.white} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, styles.primaryActionTitle]}>
                Novo Treino
              </Text>
              <Text
                style={[styles.actionSubtitle, styles.primaryActionSubtitle]}
              >
                Criar um novo treino
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Water")}
            activeOpacity={0.8}
            disabled={refreshing}
          >
            <View
              style={[styles.actionIcon, { backgroundColor: colors.success }]}
            >
              <Ionicons name="water" size={20} color={colors.white} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Registar Água</Text>
              <Text style={styles.actionSubtitle}>Acompanhar hidratação</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("Workouts", { screen: "WorkoutList" })
            }
            activeOpacity={0.8}
            disabled={refreshing}
          >
            <View
              style={[styles.actionIcon, { backgroundColor: colors.secondary }]}
            >
              <Ionicons name="list" size={20} color={colors.white} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Ver Treinos</Text>
              <Text style={styles.actionSubtitle}>Histórico completo</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // 🎯 **HEADER SIMPLES E MODERNO**
  modernHeader: {
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },

  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  // 👤 **PERFIL SIMPLES**
  userSection: {
    flex: 1,
  },

  greeting: {
    fontSize: typography?.sizes?.xl || 22,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.white,
    marginBottom: 4,
  },

  dateText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.white + "80",
    textTransform: "capitalize",
  },

  // ⚡ **BOTÕES DE AÇÃO SIMPLES**
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white + "20",
    justifyContent: "center",
    alignItems: "center",
  },

  // 📊 **STATS RESUMIDOS**
  quickStats: {
    flexDirection: "row",
    backgroundColor: colors.white + "15",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statNumber: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.white,
    marginBottom: 2,
  },

  statLabel: {
    fontSize: typography?.sizes?.xs || 11,
    color: colors.white + "70",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.white + "30",
    marginHorizontal: 8,
  },

  // 📱 **CARDS PRINCIPAIS SIMPLIFICADOS**
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 20,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray?.[100] || "#f3f4f6",
  },

  cardRow: {
    flexDirection: "row",
    gap: 15,
  },

  cardHalf: {
    flex: 1,
  },

  // 💧 **CARD DE ÁGUA**
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  cardIcon: {
    marginRight: 8,
  },

  cardTitle: {
    fontSize: typography?.sizes?.md || 16,
    fontWeight: typography?.weights?.semibold || "600",
    color: colors.text,
  },

  mainValue: {
    fontSize: 28,
    fontWeight: typography?.weights?.bold || "bold",
    marginBottom: 4,
  },

  goalText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },

  // 📊 **BARRA DE PROGRESSO SIMPLES**
  progressBar: {
    height: 6,
    backgroundColor: colors.gray?.[200] || "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },

  progressFill: {
    height: "100%",
    borderRadius: 3,
  },

  progressPercent: {
    fontSize: typography?.sizes?.sm || 14,
    fontWeight: typography?.weights?.medium || "500",
    textAlign: "center",
  },

  // 🏆 **BADGE DE CONQUISTA**
  achievementBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success + "10",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },

  achievementText: {
    fontSize: typography?.sizes?.xs || 11,
    color: colors.success,
    fontWeight: typography?.weights?.medium || "500",
    marginLeft: 4,
  },

  // 🏋️ **DOTS DE TREINO**
  workoutDots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
    gap: 6,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray?.[300] || "#d1d5db",
  },

  dotActive: {
    backgroundColor: colors.success,
    transform: [{ scale: 1.2 }],
  },

  // 💧 **BOTÕES DE ÁGUA RÁPIDA**
  waterButtonsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginBottom: 15,
  },

  waterButtons: {
    flexDirection: "row",
    gap: 10,
  },

  waterButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  waterButtonDisabled: {
    opacity: 0.6,
  },

  waterButtonText: {
    color: colors.white,
    fontSize: typography?.sizes?.sm || 14,
    fontWeight: typography?.weights?.semibold || "600",
    marginTop: 4,
  },

  // 🎯 **AÇÕES RÁPIDAS SIMPLIFICADAS**
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gray?.[200] || "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  primaryAction: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    fontSize: typography?.sizes?.md || 16,
    fontWeight: typography?.weights?.semibold || "600",
    color: colors.text,
    marginBottom: 2,
  },

  actionSubtitle: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
  },

  primaryActionTitle: {
    color: colors.white,
  },

  primaryActionSubtitle: {
    color: colors.white + "80",
  },

  // 🔄 **LOADING SIMPLES**
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },

  loadingText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },

  // 🌐 **WEB RESPONSIVO**
  webScrollView: {
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },

  webContent: {
    paddingHorizontal: Platform.OS === "web" ? 20 : 0,
  },
});
