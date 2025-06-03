import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
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
        // O loadWorkouts já é chamado automaticamente no hook useWorkouts
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

  const renderWorkoutItem = ({ item }) => (
    <TouchableOpacity
      style={[globalStyles.card, styles.workoutCard]}
      onPress={() => {
        console.log("👆 Workout card pressed:", {
          id: item.id,
          name: item.name,
        });
        navigation.navigate("WorkoutDetail", { workoutId: item.id });
      }}
    >
      <View style={styles.workoutHeader}>
        <View style={styles.workoutInfo}>
          <Text style={styles.workoutName}>
            {item.name || "Treino sem nome"}
          </Text>
          <Text style={styles.workoutDate}>
            {new Date(item.date + "T00:00:00").toLocaleDateString("pt-PT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
          <Text style={styles.exerciseCount}>
            {item.exercises?.length || 0} exercícios
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteWorkout(item)}
          disabled={isDeleting}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={isDeleting ? colors.gray?.[400] : colors.error}
          />
        </TouchableOpacity>
      </View>

      {item.exercises && item.exercises.length > 0 && (
        <View style={styles.exercisePreview}>
          {item.exercises.slice(0, 3).map((exercise, index) => (
            <Text key={index} style={styles.exercisePreviewText}>
              • {exercise.name} - {exercise.sets}x{exercise.reps} (
              {exercise.weight_kg}kg)
            </Text>
          ))}
          {item.exercises.length > 3 && (
            <Text style={styles.moreExercises}>
              +{item.exercises.length - 3} mais...
            </Text>
          )}
        </View>
      )}

      {item.notes && (
        <Text style={styles.workoutNotes} numberOfLines={2}>
          {item.notes}
        </Text>
      )}
    </TouchableOpacity>
  );

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

      <View style={styles.header}>
        <Button
          title="Novo Treino"
          onPress={() => {
            console.log("➕ New workout button pressed");
            navigation.navigate("AddWorkout");
          }}
          style={styles.addButton}
        />
      </View>

      {workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="fitness-outline"
            size={64}
            color={colors.gray?.[400]}
          />
          <Text style={styles.emptyTitle}>Nenhum treino registado</Text>
          <Text style={styles.emptySubtitle}>
            Comece a registar os seus treinos para acompanhar o progresso
          </Text>
          <Button
            title="Criar Primeiro Treino"
            onPress={() => {
              console.log("🏁 First workout button pressed");
              navigation.navigate("AddWorkout");
            }}
            style={styles.firstWorkoutButton}
          />
        </View>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkoutItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
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
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  addButton: {
    marginBottom: 10,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  workoutCard: {
    marginBottom: 15,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    textTransform: "capitalize",
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.primary,
    fontWeight: typography?.weights?.medium || "500",
  },
  deleteButton: {
    padding: 5,
  },
  exercisePreview: {
    marginBottom: 10,
  },
  exercisePreviewText: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  moreExercises: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.primary,
    fontWeight: typography?.weights?.medium || "500",
    marginTop: 4,
  },
  workoutNotes: {
    fontSize: typography?.sizes?.sm || 14,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: typography?.sizes?.xl || 20,
    fontWeight: typography?.weights?.bold || "bold",
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: typography?.sizes?.md || 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  firstWorkoutButton: {
    minWidth: 200,
  },
});
