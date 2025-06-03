import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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
  console.log("🔥 WorkoutDetailScreen RENDER START", {
    routeParams: route.params,
    workoutId: route.params?.workoutId,
  });

  const workoutIdFromParams = route.params?.workoutId;

  const [workout, setWorkout] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Estados para modais
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const { getWorkoutById, deleteWorkout, createWorkout, userId } =
    useWorkouts();
  const { toast, showSuccess, showError, hideToast } = useToast();

  console.log("🔍 Current state:", {
    workout: workout ? { id: workout.id, name: workout.name } : null,
    loadingDetails,
    isDeleting,
    isDuplicating,
    userId,
    workoutIdFromParams,
  });

  const safeGoBack = useCallback(() => {
    console.log("🔙 safeGoBack called");
    if (navigation.canGoBack()) {
      console.log("   - Going back");
      navigation.goBack();
    } else {
      console.log("   - Replacing with WorkoutList");
      navigation.replace("WorkoutList");
    }
  }, [navigation]);

  const loadWorkoutDetails = useCallback(async () => {
    console.log("📥 loadWorkoutDetails called", {
      workoutIdFromParams,
      userId,
      hasWorkout: !!workout,
    });

    if (!workoutIdFromParams) {
      console.log("❌ No workoutIdFromParams");
      showError("ID do treino inválido.");
      setLoadingDetails(false);
      safeGoBack();
      return;
    }

    if (!userId) {
      console.log("❌ No userId - cannot fetch");
      return;
    }

    console.log("📡 Fetching workout details...");
    setLoadingDetails(true);
    try {
      const result = await getWorkoutById(workoutIdFromParams);
      console.log("📡 getWorkoutById result:", result);

      if (result.error) {
        console.log("❌ Error fetching workout:", result.error);
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
        console.log("✅ Workout data received:", {
          id: result.data.id,
          name: result.data.name,
          exercisesCount: result.data.exercises?.length || 0,
        });
        setWorkout(result.data);
      } else {
        console.log("❌ No workout data received");
        showError("Detalhes do treino não encontrados.");
        safeGoBack();
      }
    } catch (error) {
      console.log("💥 Unexpected error:", error);
      showError("Erro inesperado ao carregar o treino.");
      safeGoBack();
    } finally {
      console.log("🏁 loadWorkoutDetails finished");
      setLoadingDetails(false);
    }
  }, [workoutIdFromParams, getWorkoutById, showError, safeGoBack, userId]);

  useEffect(() => {
    console.log("🔄 useEffect triggered", {
      userId,
      workoutIdFromParams,
      currentWorkoutId: workout?.id,
      loadingDetails,
    });

    if (!workoutIdFromParams) {
      console.log("   - No workoutIdFromParams");
      showError("ID do treino não fornecido.");
      setLoadingDetails(false);
      safeGoBack();
      return;
    }

    if (userId) {
      if (!workout || workout.id !== workoutIdFromParams) {
        console.log("   - Loading workoutDetails");
        loadWorkoutDetails();
      } else {
        console.log("   - Workout already loaded correctly");
        setLoadingDetails(false);
      }
    } else {
      console.log("   - Waiting for userId");
      if (!loadingDetails) {
        setLoadingDetails(true);
      }
    }
  }, [
    userId,
    workoutIdFromParams,
    loadWorkoutDetails,
    showError,
    safeGoBack,
    workout,
  ]);

  const handleDeleteWorkout = () => {
    console.log("🗑️ handleDeleteWorkout called");
    console.log("🗑️ Current workout state:", {
      hasWorkout: !!workout,
      workoutId: workout?.id,
      workoutName: workout?.name,
    });

    if (!workout) {
      console.log("❌ No workout available - exiting");
      return;
    }

    console.log("🗑️ Showing delete confirmation modal...");
    setShowDeleteModal(true);
  };

  const confirmDeleteWorkout = async () => {
    console.log("🗑️ Delete confirmed, processing...");
    console.log("🗑️ About to delete workout with ID:", workoutIdFromParams);

    setShowDeleteModal(false);
    setIsDeleting(true);

    try {
      const result = await deleteWorkout(workoutIdFromParams);
      console.log("🗑️ Delete result received:", result);

      if (result.error) {
        console.log("❌ Delete failed with error:", result.error);
        showError(
          typeof result.error === "string"
            ? result.error
            : result.error.message || "Não foi possível apagar o treino."
        );
      } else {
        console.log("✅ Delete successful");
        showSuccess("Treino apagado com sucesso!");
        setTimeout(() => {
          console.log("🔙 Navigating back after successful delete");
          safeGoBack();
        }, 1000);
      }
    } catch (error) {
      console.error("💥 Unexpected error during delete:", error);
      showError("Erro inesperado ao apagar o treino.");
    } finally {
      console.log("🏁 Setting isDeleting to false");
      setIsDeleting(false);
    }
  };

  const handleDuplicateWorkout = () => {
    console.log("📋 handleDuplicateWorkout called");
    if (!workout) return;

    console.log("📋 Showing duplicate confirmation modal...");
    setShowDuplicateModal(true);
  };

  const confirmDuplicateWorkout = async () => {
    console.log("📋 Duplicate confirmed, processing...");

    setShowDuplicateModal(false);
    setIsDuplicating(true);

    try {
      const newWorkoutData = {
        name: `${workout.name || "Treino"} (Cópia)`,
        date: new Date().toISOString().split("T")[0],
        notes: workout.notes || "",
      };

      const exercisesToDuplicate =
        workout.exercises?.map((exercise) => ({
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          weight_kg: exercise.weight_kg,
          notes: exercise.notes || "",
        })) || [];

      console.log("📋 Creating duplicate with:", {
        newWorkoutData,
        exercisesCount: exercisesToDuplicate.length,
      });

      const result = await createWorkout(newWorkoutData, exercisesToDuplicate);

      console.log("📋 Duplicate result:", result);

      if (result.error) {
        throw typeof result.error === "string"
          ? new Error(result.error)
          : result.error;
      }

      showSuccess("Treino duplicado com sucesso! 🎉");
      setTimeout(() => {
        if (result.data && result.data.id) {
          console.log("📋 Navigating to duplicated workout:", result.data.id);
          navigation.replace("WorkoutDetail", {
            workoutId: result.data.id,
          });
        } else {
          console.log("📋 No workout ID, going back");
          safeGoBack();
        }
      }, 1000);
    } catch (error) {
      console.log("💥 Duplicate error:", error);
      showError(error.message || "Não foi possível duplicar o treino.");
    } finally {
      setIsDuplicating(false);
    }
  };

  const renderExercise = (exercise, index) => {
    console.log("🏋️ Rendering exercise:", {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      index,
    });

    return (
      <View
        key={exercise.id || index}
        style={[globalStyles.card, styles.exerciseCard]}
      >
        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseNameText}>
            {exercise.name || "Exercício sem nome"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              console.log("✏️ Edit exercise pressed:", {
                exerciseId: exercise.id,
                workoutId: workoutIdFromParams,
              });
              navigation.navigate("EditExercise", {
                exerciseId: exercise.id,
                workoutId: workoutIdFromParams,
              });
            }}
            style={styles.editButton}
            disabled={isDeleting || isDuplicating}
          >
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

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
          {exercise.weight_kg !== null && exercise.weight_kg !== undefined && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Peso</Text>
              <Text style={styles.statValue}>{exercise.weight_kg}kg</Text>
            </View>
          )}
        </View>

        {exercise.notes && (
          <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
        )}
      </View>
    );
  };

  console.log("🎨 About to render UI, current state:", {
    loadingDetails,
    hasWorkout: !!workout,
    workoutName: workout?.name,
    exercisesCount: workout?.exercises?.length || 0,
    userId,
  });

  if (loadingDetails) {
    console.log("⏳ Rendering loading spinner");
    return (
      <View style={styles.container}>
        <LoadingSpinner text="A carregar detalhes do treino..." />
      </View>
    );
  }

  if (!workout) {
    console.log("❌ Rendering error screen - no workout");
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

  console.log("✅ Rendering main workout detail screen");
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

      {/* Duplicate Confirmation Modal */}
      <ConfirmModal
        visible={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onConfirm={confirmDuplicateWorkout}
        title="Duplicar Treino"
        message={`Deseja duplicar o treino "${workout.name || "este treino"}"?`}
        confirmText="Duplicar"
        cancelText="Cancelar"
        type="default"
        isLoading={isDuplicating}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={[globalStyles.card, styles.workoutInfoCard]}>
          <View style={styles.workoutTitleRow}>
            <View style={styles.workoutTitleContainer}>
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
            </View>
          </View>

          {workout.notes && (
            <Text style={styles.workoutNotesText}>{workout.notes}</Text>
          )}

          <View style={styles.workoutStats}>
            <View style={styles.statItem}>
              <Ionicons
                name="barbell-outline"
                size={20}
                color={colors.primary}
                style={styles.statIcon}
              />
              <Text style={styles.statLabel}>Exercícios</Text>
              <Text style={styles.statValue}>
                {workout.exercises?.length || 0}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.primary}
                style={styles.statIcon}
              />
              <Text style={styles.statLabel}>Criado em</Text>
              <Text style={styles.statValue}>
                {new Date(workout.created_at || Date.now()).toLocaleDateString(
                  "pt-PT"
                )}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Button
            title="Editar Treino"
            variant="ghost"
            onPress={() => {
              console.log("✏️ Edit workout pressed, navigating to EditWorkout");
              navigation.navigate("EditWorkout", { workoutId: workout.id });
            }}
            icon={
              <Ionicons
                name="pencil-outline"
                size={18}
                color={colors.primary}
              />
            }
            style={styles.actionButton}
            textStyle={styles.actionButtonText}
            disabled={isDeleting || isDuplicating}
          />
          <Button
            title="Duplicar"
            variant="ghost"
            onPress={handleDuplicateWorkout}
            icon={
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
            }
            style={styles.actionButton}
            textStyle={styles.actionButtonText}
            isLoading={isDuplicating}
            disabled={isDeleting || isDuplicating}
          />
        </View>

        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>Exercícios Realizados</Text>

          {workout.exercises && workout.exercises.length > 0 ? (
            workout.exercises.map((exercise, index) => {
              return renderExercise(exercise, index);
            })
          ) : (
            <View style={[globalStyles.card, styles.noExercisesContainer]}>
              <Ionicons
                name="sad-outline"
                size={48}
                color={colors.gray?.[400]}
              />
              <Text style={styles.noExercisesText}>
                Nenhum exercício registado para este treino.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <Button
          title="Apagar Treino"
          onPress={() => {
            console.log("🖱️ Delete button pressed");
            handleDeleteWorkout();
          }}
          icon={
            <Ionicons name="trash-outline" size={20} color={colors.white} />
          }
          style={styles.mainDeleteButton}
          isLoading={isDeleting}
          disabled={isDeleting || isDuplicating}
        />
      </View>
    </View>
  );
}

// ...existing styles...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  workoutInfoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  workoutTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  workoutTitleContainer: {
    flex: 1,
  },
  workoutNameText: {
    fontSize: typography?.sizes?.xxl || 24,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginBottom: 3,
  },
  workoutDateText: {
    fontSize: typography?.sizes?.md || 16,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  workoutNotesText: {
    fontSize: typography?.sizes?.md || 16,
    color: colors.textSecondary,
    marginBottom: 15,
    lineHeight: typography?.lineHeights?.md || 22,
  },
  workoutStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 15,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray?.[200],
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderRadius: globalStyles.card?.borderRadius || 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButton: {
    paddingHorizontal: 10,
  },
  actionButtonText: {
    color: colors.primary,
    fontWeight: typography?.weights?.semibold || "600",
  },
  exercisesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginBottom: 15,
    marginTop: 10,
  },
  exerciseCard: {
    marginBottom: 15,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  exerciseNameText: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.semibold || "600",
    color: colors.text,
    flex: 1,
  },
  editButton: {
    padding: 8,
  },
  exerciseStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 5,
  },
  statIcon: {
    marginBottom: 3,
  },
  statLabel: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: typography?.sizes?.md || 16,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
  },
  exerciseNotes: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray?.[200],
  },
  noExercisesContainer: {
    alignItems: "center",
    paddingVertical: 30,
    borderRadius: globalStyles.card?.borderRadius || 8,
  },
  noExercisesText: {
    fontSize: typography?.sizes?.md || 16,
    color: colors.textSecondary,
    marginTop: 10,
    textAlign: "center",
  },
  bottomButtons: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray?.[200],
  },
  mainDeleteButton: {
    flex: 1,
    backgroundColor: colors.error,
  },
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
    marginBottom: 10,
  },
});
