import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Button from "../../components/common/Button";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Toast from "../../components/common/Toast";
import { ConfirmModal } from "../../components/common/Modal";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";
import useWorkouts from "../../hooks/useWorkouts";
import useToast from "../../hooks/useToast";

export default function WorkoutListScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { workouts, loading, loadWorkouts, deleteWorkout } = useWorkouts();
  const { toast, showSuccess, showError, hideToast } = useToast();

  useFocusEffect(
    useCallback(() => {
      console.log("📱 WorkoutListScreen focused, loading workouts...");
      loadWorkouts();
    }, [loadWorkouts])
  );

  const handleDeleteWorkout = (workout) => {
    console.log("🗑️ Delete workout requested:", {
      id: workout.id,
      name: workout.name,
    });
    setWorkoutToDelete(workout);
    setShowDeleteModal(true);
  };

  const confirmDeleteWorkout = async () => {
    if (!workoutToDelete) return;

    console.log("🗑️ Confirming delete for workout:", workoutToDelete.id);
    setShowDeleteModal(false);
    setIsDeleting(true);

    try {
      const result = await deleteWorkout(workoutToDelete.id);
      console.log("🗑️ Delete result:", result);

      if (result.error) {
        console.log("❌ Delete failed:", result.error);
        showError(
          typeof result.error === "string"
            ? result.error
            : result.error.message || "Não foi possível apagar o treino."
        );
      } else {
        console.log("✅ Delete successful");
        showSuccess("Treino apagado com sucesso!");
      }
    } catch (error) {
      console.error("💥 Unexpected error during delete:", error);
      showError("Erro inesperado ao apagar o treino.");
    } finally {
      setIsDeleting(false);
      setWorkoutToDelete(null);
    }
  };

  const cancelDeleteWorkout = () => {
    console.log("🚫 Delete cancelled");
    setShowDeleteModal(false);
    setWorkoutToDelete(null);
  };

  const onRefresh = useCallback(async () => {
    console.log("🔄 Manual refresh triggered");
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  }, [loadWorkouts]);

  const formatExerciseInfo = (exercise) => {
    console.log("🔍 Formatting exercise info:", exercise);

    // APENAS detailed_sets - se não tiver, erro
    if (
      exercise.detailed_sets &&
      Array.isArray(exercise.detailed_sets) &&
      exercise.detailed_sets.length > 0
    ) {
      console.log(
        "✅ detailed_sets format detected with",
        exercise.detailed_sets.length,
        "sets"
      );

      const sets = exercise.detailed_sets;
      const totalSets = sets.length;

      // Obter todas as reps e pesos
      const allReps = sets.map((set) => set.reps || 0).filter((r) => r > 0);
      const allWeights = sets
        .map((set) => set.weight_kg || 0)
        .filter((w) => w > 0);

      console.log("📊 Sets analysis:", { allReps, allWeights });

      if (allReps.length === 0 && allWeights.length === 0) {
        return `${totalSets} séries (sem dados)`;
      }

      // Verificar se todas as reps são iguais
      const uniqueReps = [...new Set(allReps)];
      const uniqueWeights = [...new Set(allWeights)];

      if (uniqueReps.length === 1 && uniqueWeights.length === 1) {
        // Todas as séries são idênticas
        return `${totalSets}×${uniqueReps[0]} (${uniqueWeights[0]}kg)`;
      } else if (uniqueWeights.length === 1) {
        // Mesmo peso, reps diferentes
        if (allReps.length > 0) {
          const minReps = Math.min(...allReps);
          const maxReps = Math.max(...allReps);
          if (minReps === maxReps) {
            return `${totalSets}×${minReps} (${uniqueWeights[0]}kg)`;
          } else {
            return `${totalSets}×${minReps}-${maxReps} (${uniqueWeights[0]}kg)`;
          }
        } else {
          return `${totalSets} séries (${uniqueWeights[0]}kg)`;
        }
      } else if (uniqueReps.length === 1) {
        // Mesmas reps, pesos diferentes
        if (allWeights.length > 0) {
          const minWeight = Math.min(...allWeights);
          const maxWeight = Math.max(...allWeights);
          if (minWeight === maxWeight) {
            return `${totalSets}×${uniqueReps[0]} (${minWeight}kg)`;
          } else {
            return `${totalSets}×${uniqueReps[0]} (${minWeight}-${maxWeight}kg)`;
          }
        } else {
          return `${totalSets}×${uniqueReps[0]}`;
        }
      } else {
        // Tudo variado
        if (allReps.length > 0 && allWeights.length > 0) {
          const minReps = Math.min(...allReps);
          const maxReps = Math.max(...allReps);
          const maxWeight = Math.max(...allWeights);

          if (minReps === maxReps) {
            return `${totalSets}×${minReps} (até ${maxWeight}kg)`;
          } else {
            return `${totalSets} séries (${minReps}-${maxReps} reps, até ${maxWeight}kg)`;
          }
        } else if (allWeights.length > 0) {
          const maxWeight = Math.max(...allWeights);
          return `${totalSets} séries (até ${maxWeight}kg)`;
        } else if (allReps.length > 0) {
          const minReps = Math.min(...allReps);
          const maxReps = Math.max(...allReps);
          return `${totalSets} séries (${minReps}-${maxReps} reps)`;
        } else {
          return `${totalSets} séries`;
        }
      }
    }

    // Se não tem detailed_sets, mostrar erro
    else {
      console.log("❌ No detailed_sets found for exercise:", exercise.name);
      return "❌ Formato inválido";
    }
  };

  // Função melhorada para detectar séries com falha
  const hasFailureSets = (exercise) => {
    // Só funciona com detailed_sets
    if (
      !exercise.detailed_sets ||
      !Array.isArray(exercise.detailed_sets) ||
      exercise.detailed_sets.length < 2
    ) {
      return false;
    }

    const sets = exercise.detailed_sets;

    // Verificar se há queda significativa de reps com aumento/manutenção de peso
    for (let i = 1; i < sets.length; i++) {
      const currentSet = sets[i];
      const previousSet = sets[i - 1];

      // Se peso aumentou ou manteve mas reps diminuíram significativamente
      if (
        currentSet.weight_kg >= previousSet.weight_kg &&
        currentSet.reps < previousSet.reps * 0.8
      ) {
        console.log(
          "🔥 Failure detected:",
          previousSet.reps,
          "→",
          currentSet.reps,
          "with weight",
          previousSet.weight_kg,
          "→",
          currentSet.weight_kg
        );
        return true;
      }
    }

    // Verificar se a última série tem menos reps que a média das anteriores
    if (sets.length >= 3) {
      const firstSets = sets.slice(0, -1);
      const avgReps =
        firstSets.reduce((sum, set) => sum + (set.reps || 0), 0) /
        firstSets.length;
      const lastSet = sets[sets.length - 1];

      if (lastSet.reps < avgReps * 0.7) {
        console.log(
          "🔥 Last set failure detected:",
          lastSet.reps,
          "vs avg",
          avgReps
        );
        return true;
      }
    }

    return false;
  };

  const renderWorkoutItem = ({ item, index }) => {
    const workoutDate = new Date(item.date + "T00:00:00");
    const isToday = new Date().toDateString() === workoutDate.toDateString();

    console.log(
      "🏋️ Rendering workout:",
      item.name,
      "with",
      item.exercises?.length,
      "exercises"
    );

    return (
      <TouchableOpacity
        style={[
          globalStyles.card,
          styles.workoutCard,
          isToday && styles.todayCard,
        ]}
        onPress={() => {
          console.log("👆 Workout card pressed:", {
            id: item.id,
            name: item.name,
          });
          navigation.navigate("WorkoutDetail", { workoutId: item.id });
        }}
        activeOpacity={0.7}
      >
        {/* Header do Card */}
        <View style={styles.cardHeader}>
          <View style={styles.workoutBadge}>
            <Ionicons name="barbell" size={16} color={colors.primary} />
            {isToday && <Text style={styles.todayBadgeText}>HOJE</Text>}
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteWorkout(item);
            }}
            disabled={isDeleting}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={isDeleting ? colors.gray?.[400] : colors.error}
            />
          </TouchableOpacity>
        </View>

        {/* Informações principais */}
        <View style={styles.workoutMainInfo}>
          <Text style={styles.workoutName}>
            {item.name || "Treino sem nome"}
          </Text>
          <Text style={styles.workoutDate}>
            {workoutDate.toLocaleDateString("pt-PT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>

        {/* Preview dos exercícios com informação real */}
        {item.exercises && item.exercises.length > 0 && (
          <View style={styles.exercisePreview}>
            <Text style={styles.previewTitle}>Exercícios realizados:</Text>
            <View style={styles.exerciseList}>
              {item.exercises.slice(0, 3).map((exercise, exerciseIndex) => {
                const hasFailure = hasFailureSets(exercise);
                const exerciseInfo = formatExerciseInfo(exercise);

                console.log(
                  "🔍 Exercise",
                  exerciseIndex + 1,
                  ":",
                  exercise.name,
                  "→",
                  exerciseInfo,
                  hasFailure ? "(with failure)" : ""
                );

                return (
                  <View key={exerciseIndex} style={styles.exercisePreviewItem}>
                    <View
                      style={[
                        styles.exerciseDot,
                        hasFailure && { backgroundColor: "#dc2626" },
                      ]}
                    />
                    <Text style={styles.exercisePreviewText} numberOfLines={1}>
                      {exercise.name}
                    </Text>
                    <View style={styles.exerciseInfoContainer}>
                      <Text style={styles.exercisePreviewStats}>
                        {exerciseInfo}
                      </Text>
                      {hasFailure && (
                        <View style={styles.failureIndicatorSmall}>
                          <Ionicons name="flame" size={10} color="#dc2626" />
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
              {item.exercises.length > 3 && (
                <Text style={styles.moreExercises}>
                  +{item.exercises.length - 3} exercício
                  {item.exercises.length - 3 > 1 ? "s" : ""} mais...
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Notas do treino */}
        {item.notes && (
          <View style={styles.notesContainer}>
            <Ionicons
              name="document-text"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.workoutNotes} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        )}

        {/* Indicador de progresso visual */}
        <View style={styles.progressIndicator}>
          <View
            style={[
              styles.progressBar,
              {
                backgroundColor: isToday ? colors.primary : colors.gray?.[300],
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  console.log("📋 WorkoutListScreen render:", {
    loading,
    workoutsCount: workouts.length,
    refreshing,
    isDeleting,
    hasWorkoutToDelete: !!workoutToDelete,
  });

  if (loading) {
    console.log("⏳ Showing loading spinner");
    return <LoadingSpinner text="A carregar treinos..." />;
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
        onClose={cancelDeleteWorkout}
        onConfirm={confirmDeleteWorkout}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja apagar o treino "${
          workoutToDelete?.name || "este treino"
        }"? Esta ação não pode ser desfeita.`}
        confirmText="Apagar"
        cancelText="Cancelar"
        type="error"
        confirmButtonStyle={{ backgroundColor: colors.error }}
        isLoading={isDeleting}
      />

      {/* Header */}
      <View style={[globalStyles.card, styles.headerCard]}>
        <View style={styles.headerContent}>
          <Ionicons name="fitness" size={32} color={colors.primary} />
          <Text style={styles.headerTitle}>Meus Treinos</Text>
        </View>

        {workouts.length > 0 && (
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>
              {workouts.length} treino{workouts.length !== 1 ? "s" : ""}{" "}
              registado{workouts.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        <Button
          title="Novo Treino"
          onPress={() => {
            console.log("➕ New workout button pressed");
            navigation.navigate("AddWorkout");
          }}
          style={styles.addButton}
          icon={<Ionicons name="add" size={18} color={colors.white} />}
        />
      </View>

      {workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name="fitness-outline"
              size={80}
              color={colors.gray?.[400]}
            />
          </View>
          <Text style={styles.emptyTitle}>Nenhum treino registado</Text>
          <Text style={styles.emptySubtitle}>
            Comece a registar os seus treinos para acompanhar o progresso no
            ginásio
          </Text>
          <Button
            title="Criar Primeiro Treino"
            onPress={() => {
              console.log("🏁 First workout button pressed");
              navigation.navigate("AddWorkout");
            }}
            style={styles.firstWorkoutButton}
            icon={<Ionicons name="add-circle" size={20} color={colors.white} />}
          />
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkoutItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  headerCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
    paddingVertical: 25,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: typography?.sizes?.xl || 20,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginLeft: 12,
  },
  headerStats: {
    backgroundColor: colors.gray?.[100] || "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  headerStatsText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    fontWeight: typography?.weights?.medium || "500",
  },
  addButton: {
    minWidth: 200,
  },

  // Lista
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  separator: {
    height: 15,
  },

  // Cards dos treinos
  workoutCard: {
    position: "relative",
    overflow: "hidden",
  },
  todayCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primary + "05",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  workoutBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  todayBadgeText: {
    fontSize: typography?.sizes?.xs || 11,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.primary,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.error + "10",
  },

  // Informações principais
  workoutMainInfo: {
    marginBottom: 15,
  },
  workoutName: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginBottom: 5,
  },
  workoutDate: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },

  // Preview dos exercícios
  exercisePreview: {
    marginBottom: 15,
  },
  previewTitle: {
    fontSize: typography?.sizes?.sm || 14,
    fontWeight: typography?.weights?.medium || "500",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  exerciseList: {
    gap: 6,
  },
  exercisePreviewItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exerciseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  exercisePreviewText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.text,
    flex: 1,
  },
  exerciseInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  exercisePreviewStats: {
    fontSize: typography?.sizes?.xs || 12,
    color: colors.textSecondary,
    fontWeight: typography?.weights?.medium || "500",
  },
  failureIndicatorSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  moreExercises: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.primary,
    fontWeight: typography?.weights?.medium || "500",
    marginTop: 4,
    marginLeft: 13,
  },

  // Notas
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.gray?.[50] || "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  workoutNotes: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    fontStyle: "italic",
    flex: 1,
    lineHeight: 18,
  },

  // Indicador de progresso
  progressIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.gray?.[200],
  },
  progressBar: {
    height: "100%",
    width: "30%",
    borderRadius: 1.5,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gray?.[100] || "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },
  emptyTitle: {
    fontSize: typography?.sizes?.xl || 20,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: typography?.sizes?.md || 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 35,
    lineHeight: 24,
  },
  firstWorkoutButton: {
    minWidth: 220,
    paddingVertical: 15,
  },
});
