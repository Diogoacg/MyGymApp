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

  return (
    <View style={styles.container}>
      {/* Toast para feedback */}
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
              colors={[colors.primary, colors.secondary]}
              progressBackgroundColor={colors.white}
              title="Puxe para atualizar"
              titleColor={colors.textSecondary}
              progressViewOffset={0}
              enabled={true}
            />
          ) : undefined
        }
        style={Platform.OS === "web" ? styles.webScrollView : undefined}
        contentContainerStyle={
          Platform.OS === "web" ? styles.webContent : undefined
        }
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header com indicação de dados carregados */}
        <Animated.View style={[styles.header, { opacity: fadeAnimation }]}>
          <View style={styles.headerContent}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>
                Olá,{" "}
                {user?.user_metadata?.full_name?.split(" ")[0] ||
                  user?.email?.split("@")[0] ||
                  "Utilizador"}
                ! 👋
              </Text>
              <Text style={styles.date}>
                {new Date().toLocaleDateString("pt-PT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
              {/* 🐛 Indicador melhorado para debug */}
              {__DEV__ && (
                <View style={styles.debugContainer}>
                  <Text style={styles.platformIndicator}>
                    {Platform.OS} | Treinos: {weeklyWorkouts}/{workouts.length}{" "}
                    | Loading: {workoutsLoading ? "Y" : "N"} | User:{" "}
                    {userId ? "Y" : "N"}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerIcon}>
              <Ionicons name="person-circle" size={48} color={colors.primary} />
            </View>
          </View>

          {/* Indicador de atualização */}
          {(refreshing || workoutsLoading || isInitialLoad) && (
            <View style={styles.refreshIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.refreshText}>
                {isInitialLoad
                  ? "Carregando dados iniciais..."
                  : workoutsLoading
                  ? "Carregando treinos..."
                  : "Atualizando dados..."}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Stats Cards */}
        <Animated.View
          style={[styles.statsContainer, { opacity: fadeAnimation }]}
        >
          {/* Water Card */}
          <View style={[globalStyles.card, styles.statCard, styles.waterCard]}>
            <View style={styles.cardHeader}>
              <Ionicons
                name="water"
                size={28}
                color={getWaterProgressColor()}
              />
              <Text style={styles.cardTitle}>Hidratação</Text>
            </View>

            {(waterLoading.today || waterLoading.settings) && !refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando...</Text>
              </View>
            ) : (
              <>
                <Text
                  style={[
                    styles.statNumber,
                    { color: getWaterProgressColor() },
                  ]}
                >
                  {todayIntake}ml
                </Text>
                <Text style={styles.statLabel}>Meta: {currentWaterGoal}ml</Text>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBackground}>
                    <Animated.View
                      style={[
                        styles.progressBar,
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
                      styles.progressText,
                      { color: getWaterProgressColor() },
                    ]}
                  >
                    {Math.round(progressPercentage)}%
                  </Text>
                </View>

                {progressPercentage >= 100 && (
                  <View style={styles.achievementBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.success}
                    />
                    <Text style={styles.achievementText}>Meta atingida!</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Workout Card com melhor indicação de loading */}
          <View
            style={[globalStyles.card, styles.statCard, styles.workoutCard]}
          >
            <View style={styles.cardHeader}>
              <Ionicons
                name={getWorkoutIcon()}
                size={28}
                color={getWorkoutColor()}
              />
              <Text style={styles.cardTitle}>Treinos</Text>
              {/* Indicador de loading para treinos */}
              {(workoutsLoading || isInitialLoad) && (
                <ActivityIndicator
                  size="small"
                  color={colors.secondary}
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>

            {(workoutsLoading || isInitialLoad) && !refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.secondary} />
                <Text style={styles.loadingText}>
                  {isInitialLoad ? "Carregando..." : "Carregando treinos..."}
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.statNumber, { color: getWorkoutColor() }]}>
                  {weeklyWorkouts}
                </Text>
                <Text style={styles.statLabel}>Esta semana</Text>

                <View style={styles.workoutProgress}>
                  <View style={styles.workoutDots}>
                    {[...Array(currentWorkoutGoal)].map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.workoutDot,
                          index < weeklyWorkouts && styles.workoutDotActive,
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
                      styles.workoutGoalText,
                      { color: getWorkoutColor() },
                    ]}
                  >
                    {weeklyWorkouts >= currentWorkoutGoal
                      ? "Meta atingida! 🎉"
                      : `Meta: ${currentWorkoutGoal} treinos`}
                  </Text>

                  {/* Barra de progresso para treinos */}
                  <View style={[styles.progressContainer, { marginTop: 8 }]}>
                    <View style={styles.progressBarBackground}>
                      <Animated.View
                        style={[
                          styles.progressBar,
                          {
                            width: workoutProgressAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0%", "100%"],
                            }),
                            backgroundColor: getWorkoutColor(),
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.progressText,
                        { color: getWorkoutColor() },
                      ]}
                    >
                      {Math.round(workoutProgressPercentage)}%
                    </Text>
                  </View>
                </View>

                {workoutProgressPercentage >= 100 && (
                  <View style={styles.achievementBadge}>
                    <Ionicons name="trophy" size={16} color={colors.success} />
                    <Text style={styles.achievementText}>
                      Objetivo cumprido! 🏆
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </Animated.View>

        {/* Quick Water Actions */}
        <Animated.View
          style={[
            globalStyles.card,
            styles.quickWaterCard,
            { opacity: fadeAnimation },
          ]}
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
                activeOpacity={0.7}
              >
                <View style={styles.waterButtonContent}>
                  <Ionicons name="water" size={20} color={colors.white} />
                  <Text style={styles.waterButtonText}>
                    {waterLoading.action ? "..." : `+${amount}ml`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          style={[
            globalStyles.card,
            styles.quickActionsCard,
            { opacity: fadeAnimation },
          ]}
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
            <View style={styles.actionIcon}>
              <Ionicons name="add-circle" size={24} color={colors.white} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Novo Treino</Text>
              <Text style={styles.actionSubtitle}>Criar um novo treino</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.successAction]}
            onPress={() => navigation.navigate("Water")}
            activeOpacity={0.8}
            disabled={refreshing}
          >
            <View
              style={[styles.actionIcon, { backgroundColor: colors.success }]}
            >
              <Ionicons name="water" size={24} color={colors.white} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.success }]}>
                Registar Água
              </Text>
              <Text
                style={[
                  styles.actionSubtitle,
                  { color: colors.success + "80" },
                ]}
              >
                Acompanhar hidratação
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.success} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={() =>
              navigation.navigate("Workouts", { screen: "WorkoutList" })
            }
            activeOpacity={0.8}
            disabled={refreshing}
          >
            <View
              style={[styles.actionIcon, { backgroundColor: colors.secondary }]}
            >
              <Ionicons name="list" size={24} color={colors.white} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.secondary }]}>
                Ver Treinos
              </Text>
              <Text
                style={[
                  styles.actionSubtitle,
                  { color: colors.secondary + "80" },
                ]}
              >
                Histórico completo
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.secondary}
            />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ...existing styles...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // 🌐 **ESTILOS ESPECÍFICOS PARA WEB**
  webRefreshContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray?.[200] || "#e5e7eb",
  },
  webRefreshButton: {
    alignSelf: "center",
    minWidth: 150,
  },
  webScrollView: {
    maxWidth: 600, // Limitar largura em telas grandes
    alignSelf: "center",
    width: "100%",
  },
  webContent: {
    paddingHorizontal: Platform.OS === "web" ? 20 : 0,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 25,
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: typography?.sizes?.xxl || 24,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginBottom: 5,
  },
  date: {
    fontSize: typography?.sizes?.md || 16,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  // 🐛 **INDICADOR DE PLATAFORMA PARA DEBUG**
  platformIndicator: {
    fontSize: typography?.sizes?.xs || 12,
    color: colors.primary,
    marginTop: 5,
    fontWeight: "bold",
    backgroundColor: colors.primary + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  headerIcon: {
    marginLeft: 15,
  },
  refreshIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray?.[200] || "#e5e7eb",
  },
  refreshText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    marginLeft: 8,
    fontStyle: "italic",
  },
  statsContainer: {
    flexDirection: Platform.OS === "web" ? "column" : "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 15,
  },
  statCard: {
    flex: Platform.OS === "web" ? undefined : 1,
    paddingVertical: 25,
    paddingHorizontal: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: typography?.sizes?.md || 16,
    fontWeight: typography?.weights?.semibold || "600",
    color: colors.text,
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  loadingText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: typography?.weights?.bold || "bold",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    marginBottom: 15,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: colors.gray?.[200] || "#e5e7eb",
    borderRadius: 4,
    marginRight: 10,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: typography?.sizes?.sm || 14,
    fontWeight: typography?.weights?.semibold || "600",
    minWidth: 35,
  },
  achievementBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  achievementText: {
    fontSize: typography?.sizes?.xs || 12,
    color: colors.success,
    fontWeight: typography?.weights?.medium || "500",
    marginLeft: 4,
  },
  workoutProgress: {
    alignItems: "center",
  },
  workoutDots: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 6,
  },
  debugContainer: {
    marginTop: 5,
  },
  workoutDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gray?.[300] || "#d1d5db",
  },
  workoutDotActive: {
    transform: [{ scale: 1.2 }],
  },
  workoutGoalText: {
    fontSize: typography?.sizes?.xs || 12,
    fontWeight: typography?.weights?.medium || "500",
    marginBottom: 8,
  },
  quickWaterCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginBottom: 20,
  },
  waterButtons: {
    flexDirection: "row",
    gap: 12,
  },
  waterButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  waterButtonDisabled: {
    opacity: 0.6,
  },
  waterButtonContent: {
    alignItems: "center",
  },
  waterButtonText: {
    color: colors.white,
    fontSize: typography?.sizes?.sm || 14,
    fontWeight: typography?.weights?.semibold || "600",
    marginTop: 5,
  },
  quickActionsCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray?.[200] || "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  successAction: {
    backgroundColor: colors.success + "10",
    borderColor: colors.success + "30",
  },
  secondaryAction: {
    backgroundColor: colors.secondary + "10",
    borderColor: colors.secondary + "30",
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography?.sizes?.md || 16,
    fontWeight: typography?.weights?.semibold || "600",
    color: colors.white,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.white + "80",
  },
});
