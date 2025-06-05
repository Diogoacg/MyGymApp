import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Button from "../../components/common/Button";
import Toast from "../../components/common/Toast";
import { ConfirmModal } from "../../components/common/Modal";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";
import useWorkouts from "../../hooks/useWorkouts";
import useToast from "../../hooks/useToast";

export default function WorkoutDetailScreen({ route, navigation }) {
  const workoutIdFromParams = route.params?.workoutId;

  const [workout, setWorkout] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { getWorkoutById, deleteWorkout, userId } = useWorkouts();
  const { toast, showSuccess, showError, hideToast } = useToast();

  const safeGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace("WorkoutList");
    }
  }, [navigation]);

  // Função para carregar dados do treino
  const loadWorkoutData = useCallback(async () => {
    if (!workoutIdFromParams || !userId) {
      if (!workoutIdFromParams) {
        showError("ID do treino não fornecido.");
        safeGoBack();
      }
      return;
    }

    if (!refreshing) setLoadingDetails(true);

    try {
      console.log("🔄 Loading workout data...");

      const result = await getWorkoutById(workoutIdFromParams);

      if (result.error) {
        console.error("❌ Error loading workout:", result.error);
        showError(
          typeof result.error === "string"
            ? result.error
            : result.error.message ||
                "Não foi possível carregar os detalhes do treino."
        );
        safeGoBack();
        return;
      }

      if (result.data) {
        console.log("✅ Workout loaded successfully:", result.data.name);
        setWorkout(result.data);
      } else {
        console.error("❌ No workout data received");
        showError("Detalhes do treino não encontrados.");
        safeGoBack();
      }
    } catch (error) {
      console.error("❌ Unexpected error loading workout:", error);
      showError("Erro inesperado ao carregar o treino.");
      safeGoBack();
    } finally {
      setLoadingDetails(false);
      setRefreshing(false);
    }
  }, [
    workoutIdFromParams,
    userId,
    getWorkoutById,
    showError,
    safeGoBack,
    refreshing,
  ]);

  // Carregamento inicial
  useEffect(() => {
    loadWorkoutData();
  }, [workoutIdFromParams, userId]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWorkoutData();
  }, [loadWorkoutData]);

  // Algoritmo melhorado para análise de intensidade de treino
  const analyzeExerciseIntensity = (sets) => {
    if (!sets || sets.length === 0) return [];

    // 1. Normalizar e limpar dados
    const validSets = sets
      .filter((set) => set.weight_kg > 0 && set.reps > 0)
      .map((set, index) => ({
        ...set,
        index,
        volume: set.weight_kg * set.reps,
        intensity1RM: calculateEstimated1RM(set.weight_kg, set.reps),
      }));

    if (validSets.length === 0) {
      return sets.map(() => ({
        intensity: "unknown",
        score: 0,
        analysis: "Dados insuficientes",
      }));
    }

    // 2. Calcular métricas de referência
    const maxWeight = Math.max(...validSets.map((s) => s.weight_kg));
    const max1RM = Math.max(...validSets.map((s) => s.intensity1RM));
    const totalVolume = validSets.reduce((sum, s) => sum + s.volume, 0);
    const avgVolume = totalVolume / validSets.length;

    // 3. Analisar cada série
    return sets.map((set, index) => {
      if (!set.weight_kg || !set.reps || set.weight_kg <= 0 || set.reps <= 0) {
        return {
          intensity: "unknown",
          score: 0,
          analysis: "Dados incompletos",
          factors: {},
        };
      }

      const validSet = validSets.find((vs) => vs.index === index);
      if (!validSet) {
        return {
          intensity: "unknown",
          score: 0,
          analysis: "Erro no processamento",
          factors: {},
        };
      }

      // Fatores de análise
      const factors = analyzeSetFactors(validSet, validSets, {
        maxWeight,
        max1RM,
        avgVolume,
        setPosition: index,
        totalSets: sets.length,
      });

      // Calcular score final (0-100)
      const finalScore = calculateFinalIntensityScore(factors);

      // Classificar intensidade
      const intensity = classifyIntensity(finalScore);

      // Gerar análise textual
      const analysis = generateIntensityAnalysis(factors, intensity);

      return {
        intensity,
        score: finalScore,
        analysis,
        factors,
        estimated1RM: validSet.intensity1RM,
      };
    });
  };

  // Função para estimar 1RM usando fórmula de Epley (mais precisa)
  const calculateEstimated1RM = (weight, reps) => {
    if (reps === 1) return weight;
    if (reps > 15) return weight * 1.3; // Limite para altas repetições
    return weight * (1 + reps / 30);
  };

  // Análise detalhada dos fatores de intensidade
  const analyzeSetFactors = (currentSet, allSets, context) => {
    const { maxWeight, max1RM, avgVolume, setPosition, totalSets } = context;

    // 1. FATOR PESO RELATIVO (0-30 pontos)
    const weightPercentage = currentSet.weight_kg / maxWeight;
    const weightFactor = Math.min(30, weightPercentage * 30);

    // 2. FATOR 1RM ESTIMADO (0-25 pontos)
    const rmPercentage = currentSet.intensity1RM / max1RM;
    const rmFactor = Math.min(25, rmPercentage * 25);

    // 3. FATOR VOLUME RELATIVO (0-20 pontos)
    const volumeRatio = currentSet.volume / avgVolume;
    const volumeFactor = Math.min(20, (volumeRatio - 0.5) * 20);

    // 4. FATOR PROGRESSÃO/REGRESSÃO (0-25 pontos)
    const progressionFactor = analyzeProgression(
      currentSet,
      allSets,
      setPosition
    );

    // 5. FATOR POSIÇÃO NA SÉRIE (0-10 pontos)
    // Séries finais tendem a ser mais difíceis devido à fadiga
    const positionRatio = setPosition / Math.max(totalSets - 1, 1);
    const positionFactor = positionRatio * 10;

    // 6. FATOR ZONE DE TREINO (bonus/penalidade)
    const trainingZone = determineTrainingZone(currentSet.reps);
    const zoneFactor = getZoneIntensityBonus(trainingZone);

    return {
      weight: Math.max(0, weightFactor),
      oneRM: Math.max(0, rmFactor),
      volume: Math.max(0, volumeFactor),
      progression: progressionFactor,
      position: positionFactor,
      zone: zoneFactor,
      trainingZone,
      details: {
        weightPercentage: (weightPercentage * 100).toFixed(1),
        rmPercentage: (rmPercentage * 100).toFixed(1),
        volumeRatio: volumeRatio.toFixed(2),
        position: setPosition + 1,
        totalSets,
      },
    };
  };

  // Análise de progressão entre séries
  const analyzeProgression = (currentSet, allSets, position) => {
    if (position === 0) return 12; // Primeira série = esforço médio

    const previousSets = allSets.slice(0, position);
    const lastSet = previousSets[previousSets.length - 1];

    if (!lastSet) return 12;

    const weightChange = currentSet.weight_kg - lastSet.weight_kg;
    const repChange = currentSet.reps - lastSet.reps;
    const volumeChange = currentSet.volume - lastSet.volume;

    let progressionScore = 12; // Base neutra

    // Análise de padrões específicos
    if (weightChange > 0 && repChange < 0) {
      // Aumentou peso mas diminuiu reps = alta intensidade
      const weightIncrease = weightChange / lastSet.weight_kg;
      const repDecrease = Math.abs(repChange) / lastSet.reps;
      progressionScore += Math.min(13, (weightIncrease + repDecrease) * 20);
    } else if (weightChange === 0 && repChange < -1) {
      // Mesmo peso mas muito menos reps = fadiga/falha
      const repDecrease = Math.abs(repChange) / lastSet.reps;
      progressionScore += Math.min(10, repDecrease * 15);
    } else if (weightChange < 0) {
      // Diminuiu peso = possível drop set ou fadiga
      progressionScore += 8;
    } else if (weightChange === 0 && repChange >= 0) {
      // Manteve ou melhorou = bom controle
      progressionScore += 3;
    }

    // Considerar tendência geral das últimas séries
    if (previousSets.length >= 2) {
      const trend = analyzeTrend(previousSets, currentSet);
      progressionScore += trend;
    }

    return Math.max(0, Math.min(25, progressionScore));
  };

  // Análise de tendência nas últimas séries
  const analyzeTrend = (previousSets, currentSet) => {
    const last3Sets = [...previousSets.slice(-2), currentSet];

    let fatigueIndicators = 0;

    for (let i = 1; i < last3Sets.length; i++) {
      const current = last3Sets[i];
      const previous = last3Sets[i - 1];

      if (
        current.weight_kg >= previous.weight_kg &&
        current.reps < previous.reps
      ) {
        fatigueIndicators++;
      }
      if (current.volume < previous.volume * 0.9) {
        fatigueIndicators++;
      }
    }

    return fatigueIndicators * 2; // Mais indicadores de fadiga = maior intensidade
  };

  // Determinar zona de treino baseada nas repetições
  const determineTrainingZone = (reps) => {
    if (reps >= 1 && reps <= 3) return "strength"; // Força máxima
    if (reps >= 4 && reps <= 6) return "power"; // Força-potência
    if (reps >= 7 && reps <= 12) return "hypertrophy"; // Hipertrofia
    if (reps >= 13 && reps <= 20) return "endurance"; // Resistência muscular
    return "cardio"; // Resistência cardiovascular
  };

  // Bonus por zona de treino
  const getZoneIntensityBonus = (zone) => {
    const bonuses = {
      strength: 8, // Força máxima = naturalmente mais intenso
      power: 6, // Força-potência = intenso
      hypertrophy: 4, // Hipertrofia = moderado
      endurance: 2, // Resistência = menor intensidade relativa
      cardio: 1, // Cardio = baixa intensidade de força
    };
    return bonuses[zone] || 0;
  };

  // Calcular score final de intensidade (0-100)
  const calculateFinalIntensityScore = (factors) => {
    const rawScore =
      factors.weight +
      factors.oneRM +
      factors.volume +
      factors.progression +
      factors.position +
      factors.zone;

    // Normalizar para 0-100 (máximo teórico seria ~113)
    return Math.min(100, Math.max(0, (rawScore / 113) * 100));
  };

  // Classificação de intensidade mais precisa
  const classifyIntensity = (score) => {
    if (score >= 75) return "very_high"; // Falha muscular/máximo esforço
    if (score >= 60) return "high"; // Esforço alto
    if (score >= 40) return "medium"; // Esforço moderado
    if (score >= 25) return "low"; // Esforço baixo
    return "very_low"; // Aquecimento/recuperação
  };

  // Gerar análise textual detalhada
  const generateIntensityAnalysis = (factors, intensity) => {
    const analyses = [];

    // Análise principal baseada na intensidade
    const mainAnalysis = {
      very_high: "Falha muscular ou próximo do máximo esforço",
      high: "Esforço alto, séries desafiadoras",
      medium: "Esforço moderado, boa progressão",
      low: "Esforço baixo, aquecimento ou volume",
      very_low: "Muito leve, mobilização articular",
    };

    analyses.push(mainAnalysis[intensity]);

    // Análises específicas dos fatores
    if (factors.progression > 20) {
      analyses.push("Excelente progressão de carga");
    } else if (factors.progression > 15) {
      analyses.push("Boa progressão");
    } else if (factors.progression < 8) {
      analyses.push("Possível fadiga entre séries");
    }

    if (factors.details.weightPercentage > 90) {
      analyses.push("Peso próximo do máximo do treino");
    }

    if (factors.trainingZone === "strength" && factors.oneRM > 20) {
      analyses.push("Zona de força máxima");
    } else if (factors.trainingZone === "hypertrophy") {
      analyses.push("Zona de hipertrofia");
    }

    return analyses.join(" • ");
  };

  // Cores e ícones atualizados para o novo sistema
  const getIntensityDisplay = (intensity) => {
    const displays = {
      very_high: {
        color: "#dc2626", // Vermelho intenso
        background: "#fef2f2",
        icon: "flame",
        label: "FALHA",
        glow: "#dc262630",
      },
      high: {
        color: "#ea580c", // Laranja forte
        background: "#fff7ed",
        icon: "flash",
        label: "ALTO",
        glow: "#ea580c30",
      },
      medium: {
        color: "#d97706", // Âmbar
        background: "#fffbeb",
        icon: "trending-up",
        label: "MÉDIO",
        glow: "#d9770620",
      },
      low: {
        color: "#059669", // Verde
        background: "#f0fdf4",
        icon: "leaf",
        label: "BAIXO",
        glow: "#05966920",
      },
      very_low: {
        color: "#0891b2", // Azul
        background: "#f0f9ff",
        icon: "water",
        label: "MÍNIMO",
        glow: "#0891b220",
      },
    };

    return displays[intensity] || displays["medium"];
  };

  const getIntensityColors = (intensity) => {
    const displays = {
      very_high: {
        background: "#fef2f2",
        border: "#dc2626",
        text: "#991b1b",
        icon: "#dc2626",
        glow: "#dc262630",
      },
      high: {
        background: "#fff7ed",
        border: "#ea580c",
        text: "#9a3412",
        icon: "#ea580c",
        glow: "#ea580c30",
      },
      medium: {
        background: "#fffbeb",
        border: "#d97706",
        text: "#92400e",
        icon: "#d97706",
        glow: "#d9770620",
      },
      low: {
        background: "#f0fdf4",
        border: "#059669",
        text: "#047857",
        icon: "#059669",
        glow: "#05966920",
      },
      very_low: {
        background: "#f0f9ff",
        border: "#0891b2",
        text: "#0e7490",
        icon: "#0891b2",
        glow: "#0891b220",
      },
      unknown: {
        background: "#f9fafb",
        border: "#6b7280",
        text: "#4b5563",
        icon: "#6b7280",
        glow: "#6b728020",
      },
    };

    return displays[intensity] || displays.unknown;
  };

  const getIntensityIcon = (intensity) => {
    const icons = {
      very_high: "flame",
      high: "flash",
      medium: "trending-up",
      low: "leaf",
      very_low: "water",
      unknown: "help-circle",
    };

    return icons[intensity] || icons.unknown;
  };

  const getIntensityLabel = (intensity) => {
    const labels = {
      very_high: "FALHA",
      high: "ALTO",
      medium: "MÉDIO",
      low: "BAIXO",
      very_low: "MÍNIMO",
      unknown: "?",
    };

    return labels[intensity] || labels.unknown;
  };

  // Função principal que substitui a atual
  const calculateSetIntensity = (sets) => {
    const analysis = analyzeExerciseIntensity(sets);
    return analysis.map((result) => result.intensity);
  };

  const handleDeleteWorkout = () => {
    if (!workout) return;
    setShowDeleteModal(true);
  };

  const confirmDeleteWorkout = async () => {
    setShowDeleteModal(false);
    setIsDeleting(true);

    try {
      const result = await deleteWorkout(workoutIdFromParams);

      if (result.error) {
        showError(
          typeof result.error === "string"
            ? result.error
            : result.error.message || "Não foi possível apagar o treino."
        );
      } else {
        showSuccess("Treino apagado com sucesso!");
        setTimeout(() => {
          safeGoBack();
        }, 1000);
      }
    } catch (error) {
      console.error("Error deleting workout:", error);
      showError("Erro inesperado ao apagar o treino.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddExercise = () => {
    if (!workout) {
      showError("Treino não carregado.");
      return;
    }

    navigation.navigate("AddExercise", {
      workoutId: workout.id,
      workoutName: workout.name,
      onExerciseAdded: () => {
        console.log("🔄 Exercise added callback - reloading workout");
        loadWorkoutData();
      },
    });
  };

  // Renderização melhorada dos sets
  const renderExercise = (exercise, index) => {
    const intensities = exercise.sets
      ? calculateSetIntensity(exercise.sets)
      : [];
    const totalVolume =
      exercise.sets?.reduce(
        (sum, set) => sum + (set.weight_kg || 0) * (set.reps || 0),
        0
      ) || 0;
    const maxWeight =
      exercise.sets?.length > 0
        ? Math.max(...exercise.sets.map((s) => s.weight_kg || 0))
        : 0;

    // Contar sets por intensidade
    const intensityCounts = {
      very_high: intensities.filter((i) => i === "very_high").length,
      high: intensities.filter((i) => i === "high").length,
      medium: intensities.filter((i) => i === "medium").length,
      low: intensities.filter((i) => i === "low").length,
      very_low: intensities.filter((i) => i === "very_low").length,
    };

    // Calcular total de séries de alta intensidade (very_high + high)
    const highIntensitySets = intensityCounts.very_high + intensityCounts.high;

    return (
      <View
        key={exercise.id || index}
        style={[globalStyles.card, styles.exerciseCard]}
      >
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseTitleContainer}>
            <Text style={styles.exerciseNameText}>
              {exercise.name || "Exercício sem nome"}
            </Text>
            <View style={styles.exerciseMetrics}>
              <View style={styles.metricItem}>
                <Ionicons name="barbell" size={14} color={colors.primary} />
                <Text style={styles.metricText}>
                  {exercise.sets?.length || 0} séries
                </Text>
              </View>
              {totalVolume > 0 && (
                <View style={styles.metricItem}>
                  <Ionicons name="trophy" size={14} color={colors.primary} />
                  <Text style={styles.metricText}>
                    {totalVolume.toFixed(0)}kg total
                  </Text>
                </View>
              )}
              {highIntensitySets > 0 && (
                <View style={styles.metricItem}>
                  <Ionicons name="flame" size={14} color="#dc2626" />
                  <Text
                    style={[
                      styles.metricText,
                      { color: "#dc2626", fontWeight: "bold" },
                    ]}
                  >
                    {highIntensitySets} até falha
                  </Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("EditExercise", {
                exerciseId: exercise.id,
                workoutId: workoutIdFromParams,
                onExerciseUpdated: () => {
                  console.log(
                    "🔄 Exercise updated callback - reloading workout"
                  );
                  loadWorkoutData();
                },
              });
            }}
            style={styles.editButton}
            disabled={isDeleting}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Renderizar séries com algoritmo aprimorado */}
        {exercise.sets && exercise.sets.length > 0 ? (
          <View style={styles.setsContainer}>
            <Text style={styles.setsTitle}>Progressão das séries:</Text>
            <View style={styles.setsGrid}>
              {exercise.sets.map((set, setIndex) => {
                const intensity = intensities[setIndex] || "unknown";
                const intensityColors = getIntensityColors(intensity);
                const intensityIcon = getIntensityIcon(intensity);
                const intensityLabel = getIntensityLabel(intensity);

                return (
                  <View
                    key={set.id || setIndex}
                    style={[
                      styles.setItem,
                      {
                        backgroundColor: intensityColors.background,
                        borderLeftColor: intensityColors.border,
                        shadowColor: intensityColors.glow,
                        shadowOpacity:
                          intensity === "very_high" || intensity === "high"
                            ? 0.3
                            : 0.1,
                        shadowRadius:
                          intensity === "very_high" || intensity === "high"
                            ? 8
                            : 4,
                        elevation:
                          intensity === "very_high" || intensity === "high"
                            ? 6
                            : 2,
                      },
                    ]}
                  >
                    <View style={styles.setHeader}>
                      <View style={styles.setNumberContainer}>
                        <View
                          style={[
                            styles.intensityDot,
                            { backgroundColor: intensityColors.border },
                          ]}
                        />
                        <Text
                          style={[
                            styles.setNumber,
                            { color: intensityColors.text },
                          ]}
                        >
                          Série {set.set_number || setIndex + 1}
                        </Text>
                        <Ionicons
                          name={intensityIcon}
                          size={16}
                          color={intensityColors.icon}
                          style={styles.intensityIcon}
                        />
                      </View>
                      <View
                        style={[
                          styles.intensityBadge,
                          { backgroundColor: intensityColors.border },
                        ]}
                      >
                        <Text style={styles.intensityText}>
                          {intensityLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.setDetails}>
                      {set.reps && (
                        <View style={styles.setDetailItem}>
                          <Ionicons
                            name="repeat"
                            size={16}
                            color={intensityColors.text}
                          />
                          <Text
                            style={[
                              styles.setDetail,
                              { color: intensityColors.text },
                            ]}
                          >
                            {set.reps} reps
                          </Text>
                        </View>
                      )}
                      {set.weight_kg && (
                        <View style={styles.setDetailItem}>
                          <Ionicons
                            name="barbell"
                            size={16}
                            color={intensityColors.text}
                          />
                          <Text
                            style={[
                              styles.setDetail,
                              { color: intensityColors.text },
                            ]}
                          >
                            {set.weight_kg}kg
                          </Text>
                        </View>
                      )}
                    </View>

                    {set.notes && (
                      <Text
                        style={[
                          styles.setNotes,
                          { color: intensityColors.text },
                        ]}
                      >
                        💭 {set.notes}
                      </Text>
                    )}

                    {/* Indicador visual extra para alta intensidade */}
                    {(intensity === "very_high" || intensity === "high") && (
                      <View style={styles.failureIndicator}>
                        <Ionicons
                          name="trending-up"
                          size={12}
                          color={intensityColors.border}
                        />
                        <Text
                          style={[
                            styles.failureText,
                            { color: intensityColors.border },
                          ]}
                        >
                          {intensity === "very_high"
                            ? "Falha muscular"
                            : "Esforço máximo"}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Resumo do exercício com análise de intensidade */}
            <View style={styles.exerciseSummary}>
              <View style={styles.summaryItem}>
                <Ionicons name="trophy" size={16} color={colors.primary} />
                <Text style={styles.summaryText}>
                  Volume: {totalVolume.toFixed(0)}kg
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="trending-up" size={16} color={colors.primary} />
                <Text style={styles.summaryText}>Peso máx: {maxWeight}kg</Text>
              </View>
              <View style={styles.summaryItem}>
                <Ionicons name="bar-chart" size={16} color={colors.primary} />
                <Text style={styles.summaryText}>
                  {exercise.sets.length} séries
                </Text>
              </View>
              {highIntensitySets > 0 && (
                <View style={styles.summaryItem}>
                  <Ionicons name="flame" size={16} color="#dc2626" />
                  <Text style={[styles.summaryText, { color: "#dc2626" }]}>
                    {highIntensitySets} falha{highIntensitySets > 1 ? "s" : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          // Fallback para exercícios antigos sem séries detalhadas
          <View style={styles.exerciseStats}>
            {exercise.sets !== null && exercise.sets !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Séries</Text>
                <Text style={styles.statValue}>{exercise.sets}</Text>
              </View>
            )}
            {exercise.reps !== null && exercise.reps !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Reps</Text>
                <Text style={styles.statValue}>{exercise.reps}</Text>
              </View>
            )}
            {exercise.weight_kg !== null &&
              exercise.weight_kg !== undefined && (
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Peso</Text>
                  <Text style={styles.statValue}>{exercise.weight_kg}kg</Text>
                </View>
              )}
          </View>
        )}

        {exercise.notes && (
          <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
        )}
      </View>
    );
  };

  if (loadingDetails && !refreshing) {
    return (
      <View style={styles.container}>
        <LoadingSpinner text="A carregar detalhes do treino..." />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorText}>
          Não foi possível apresentar os detalhes do treino.
        </Text>
        <Button
          title="Voltar à Lista"
          onPress={safeGoBack}
          style={{ marginTop: 20 }}
        />
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
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteWorkout}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja apagar o treino "${
          workout.name || "este treino"
        }"? Esta ação não pode ser desfeita.`}
        confirmText="Apagar"
        cancelText="Cancelar"
        type="error"
        confirmButtonStyle={{ backgroundColor: colors.error }}
        isLoading={isDeleting}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header do Treino */}
        <View style={[globalStyles.card, styles.workoutInfoCard]}>
          <View style={styles.workoutHeader}>
            <Ionicons name="barbell" size={32} color={colors.primary} />
            <Text style={styles.title}>Detalhes do Treino</Text>
          </View>

          <Text style={styles.workoutNameText}>
            {workout.name || "Treino sem nome"}
          </Text>
          <Text style={styles.workoutDateText}>
            {new Date(
              (workout.date || Date.now()) + "T00:00:00"
            ).toLocaleDateString("pt-PT", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>

          {workout.notes && (
            <View style={styles.notesContainer}>
              <Ionicons
                name="document-text"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.workoutNotesText}>{workout.notes}</Text>
            </View>
          )}

          <View style={styles.workoutStats}>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons
                  name="barbell-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.statLabel}>Exercícios</Text>
              <Text style={styles.statValue}>
                {workout.exercises?.length || 0}
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.statLabel}>Criado em</Text>
              <Text style={styles.statValue}>
                {new Date(workout.created_at || Date.now()).toLocaleDateString(
                  "pt-PT"
                )}
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.statLabel}>Séries total</Text>
              <Text style={styles.statValue}>
                {workout.exercises?.reduce(
                  (total, ex) => total + (ex.sets?.length || 0),
                  0
                ) || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Ação para adicionar exercício */}
        <View style={[globalStyles.card, styles.quickActions]}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          <Button
            title="Adicionar Exercício"
            variant="outline"
            onPress={handleAddExercise}
            icon={
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={colors.primary}
              />
            }
            style={styles.addExerciseButton}
            textStyle={styles.addExerciseButtonText}
            disabled={isDeleting}
          />
        </View>

        {/* Lista de Exercícios */}
        <View style={styles.exercisesSection}>
          <View style={styles.exercisesHeader}>
            <Text style={styles.sectionTitle}>Exercícios Realizados</Text>
            {workout.exercises && workout.exercises.length > 0 && (
              <Text style={styles.exerciseCount}>
                {workout.exercises.length} exercício
                {workout.exercises.length !== 1 ? "s" : ""}
              </Text>
            )}
          </View>

          {workout.exercises && workout.exercises.length > 0 ? (
            workout.exercises.map((exercise, index) => {
              return renderExercise(exercise, index);
            })
          ) : (
            <View style={[globalStyles.card, styles.emptyState]}>
              <Ionicons
                name="barbell-outline"
                size={48}
                color={colors.gray?.[400]}
              />
              <Text style={styles.emptyStateTitle}>
                Nenhum exercício registado
              </Text>
              <Text style={styles.emptyStateText}>
                Comece a adicionar exercícios para acompanhar o seu progresso no
                treino
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          title="Apagar Treino"
          onPress={handleDeleteWorkout}
          icon={
            <Ionicons name="trash-outline" size={20} color={colors.white} />
          }
          style={styles.deleteButton}
          isLoading={isDeleting}
          disabled={isDeleting}
        />
      </View>
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

  // Header do Treino
  workoutInfoCard: {
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 30,
  },
  workoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: typography?.sizes?.xl || 20,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginLeft: 10,
  },
  workoutNameText: {
    fontSize: typography?.sizes?.xxl || 24,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  workoutDateText: {
    fontSize: typography?.sizes?.md || 16,
    color: colors.textSecondary,
    textTransform: "capitalize",
    textAlign: "center",
    marginBottom: 15,
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.gray?.[50] || "#f8f9fa",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 20,
    alignSelf: "stretch",
  },
  workoutNotesText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    lineHeight: typography?.lineHeights?.md || 20,
    marginLeft: 8,
    flex: 1,
  },
  workoutStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.gray?.[200],
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: "center",
  },
  statValue: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    textAlign: "center",
  },

  // Ações Rápidas
  quickActions: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginBottom: 15,
  },
  addExerciseButton: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  addExerciseButtonText: {
    color: colors.primary,
    fontWeight: typography?.weights?.semibold || "600",
  },

  // Seção de exercícios
  exercisesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  exercisesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  exerciseCount: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    backgroundColor: colors.gray?.[100] || "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // Cards de exercícios
  exerciseCard: {
    marginBottom: 20,
    backgroundColor: colors.white,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  exerciseTitleContainer: {
    flex: 1,
    marginRight: 15,
  },
  exerciseNameText: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.semibold || "600",
    color: colors.text,
    marginBottom: 8,
  },
  exerciseMetrics: {
    flexDirection: "row",
    gap: 15,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
  },
  editButton: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.primary + "15",
  },

  // Sets modernos com cores
  setsContainer: {
    marginBottom: 15,
  },
  setsTitle: {
    fontSize: typography?.sizes?.sm || 14,
    fontWeight: typography?.weights?.medium || "500",
    color: colors.textSecondary,
    marginBottom: 15,
  },
  setsGrid: {
    gap: 12,
  },
  // Novo: indicador de falha
  failureIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(220, 38, 38, 0.2)",
    gap: 4,
  },
  failureText: {
    fontSize: typography?.sizes?.xs || 11,
    fontWeight: typography?.weights?.bold || "bold",
    fontStyle: "italic",
  },

  // Melhorar sombras dos sets
  setItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 2,
  },

  setHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  setNumberContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  intensityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  setNumber: {
    fontSize: typography?.sizes?.sm || 14,
    fontWeight: typography?.weights?.bold || "bold",
    marginRight: 8,
  },
  intensityIcon: {
    marginLeft: 4,
  },
  intensityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  intensityText: {
    fontSize: typography?.sizes?.xs || 11,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.white,
  },
  setDetails: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    marginBottom: 5,
  },
  setDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  setDetail: {
    fontSize: typography?.sizes?.sm || 14,
    fontWeight: typography?.weights?.medium || "500",
  },
  setNotes: {
    fontSize: typography?.sizes?.xs || 12,
    fontStyle: "italic",
    marginTop: 8,
    opacity: 0.8,
  },

  // Resumo do exercício
  exerciseSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.gray?.[200],
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  summaryText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    fontWeight: typography?.weights?.medium || "500",
  },

  // Exercícios antigos (fallback)
  exerciseStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.gray?.[50] || "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },

  // Notas do exercício
  exerciseNotes: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.gray?.[200],
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.semibold || "600",
    color: colors.text,
    marginTop: 15,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: typography?.sizes?.md || 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },

  // Bottom actions
  bottomActions: {
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray?.[200],
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: typography?.sizes?.lg || 18,
    color: colors.error,
    textAlign: "center",
    marginBottom: 20,
    marginTop: 15,
  },
});
