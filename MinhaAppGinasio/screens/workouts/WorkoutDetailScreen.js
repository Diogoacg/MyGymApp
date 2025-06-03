import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabaseClient";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Button from "../../components/common/Button";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";

export default function WorkoutDetailScreen({ route, navigation }) {
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkoutDetails();
  }, [workoutId]);

  async function loadWorkoutDetails() {
    try {
      const { data, error } = await supabase
        .from("workouts")
        .select(
          `
          *,
          exercises (
            id,
            name,
            sets,
            reps,
            weight_kg,
            notes,
            created_at
          )
        `
        )
        .eq("id", workoutId)
        .single();

      if (error) throw error;
      setWorkout(data);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar os detalhes do treino.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function deleteWorkout() {
    Alert.alert("Confirmar", "Tem certeza que deseja apagar este treino?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("workouts")
            .delete()
            .eq("id", workoutId);

          if (error) {
            Alert.alert("Erro", "Não foi possível apagar o treino.");
          } else {
            navigation.goBack();
          }
        },
      },
    ]);
  }

  const renderExercise = (exercise, index) => (
    <View key={exercise.id} style={[globalStyles.card, styles.exerciseCard]}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("EditExercise", {
              exerciseId: exercise.id,
              workoutId: workoutId,
            })
          }
          style={styles.editButton}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.exerciseStats}>
        {exercise.sets && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Séries</Text>
            <Text style={styles.statValue}>{exercise.sets}</Text>
          </View>
        )}
        {exercise.reps && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Repetições</Text>
            <Text style={styles.statValue}>{exercise.reps}</Text>
          </View>
        )}
        {exercise.weight_kg && (
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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!workout) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Treino não encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[globalStyles.card, styles.workoutHeader]}>
          <View style={styles.workoutTitleRow}>
            <View style={styles.workoutTitleContainer}>
              <Text style={styles.workoutName}>{workout.name}</Text>
              <Text style={styles.workoutDate}>
                {new Date(workout.date).toLocaleDateString("pt-PT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={deleteWorkout}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={24} color={colors.error} />
            </TouchableOpacity>
          </View>

          {workout.notes && (
            <Text style={styles.workoutNotes}>{workout.notes}</Text>
          )}

          <View style={styles.workoutStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Exercícios</Text>
              <Text style={styles.statValue}>
                {workout.exercises?.length || 0}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Data</Text>
              <Text style={styles.statValue}>
                {new Date(workout.created_at).toLocaleDateString("pt-PT")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>Exercícios</Text>

          {workout.exercises && workout.exercises.length > 0 ? (
            workout.exercises.map((exercise, index) =>
              renderExercise(exercise, index)
            )
          ) : (
            <View style={styles.noExercisesContainer}>
              <Ionicons
                name="fitness-outline"
                size={48}
                color={colors.gray[400]}
              />
              <Text style={styles.noExercisesText}>
                Nenhum exercício registado
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <Button
          title="Editar Treino"
          variant="outline"
          onPress={() => {
            // TODO: Navigate to edit workout screen
            Alert.alert("Info", "Funcionalidade de edição em desenvolvimento");
          }}
          style={styles.editWorkoutButton}
        />
        <Button
          title="Duplicar Treino"
          onPress={() => {
            // TODO: Duplicate workout logic
            Alert.alert(
              "Info",
              "Funcionalidade de duplicação em desenvolvimento"
            );
          }}
          style={styles.duplicateButton}
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
    padding: 20,
  },
  workoutHeader: {
    marginBottom: 20,
  },
  workoutTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  workoutTitleContainer: {
    flex: 1,
  },
  workoutName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 5,
  },
  workoutDate: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  deleteButton: {
    padding: 5,
  },
  workoutNotes: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginBottom: 15,
    lineHeight: 20,
  },
  workoutStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  exercisesSection: {
    marginBottom: 100, // Space for bottom buttons
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 15,
  },
  exerciseCard: {
    marginBottom: 15,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  exerciseName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  editButton: {
    padding: 5,
  },
  exerciseStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  exerciseNotes: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  noExercisesContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noExercisesText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: 10,
  },
  bottomButtons: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  editWorkoutButton: {
    flex: 1,
    marginRight: 10,
  },
  duplicateButton: {
    flex: 1,
    marginLeft: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: typography.sizes.lg,
    color: colors.error,
  },
});
