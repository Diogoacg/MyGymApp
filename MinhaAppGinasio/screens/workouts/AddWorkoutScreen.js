import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Toast from "../../components/common/Toast";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";
import { supabase } from "../../lib/supabaseClient";
import useToast from "../../hooks/useToast";

export default function AddWorkoutScreen({ navigation }) {
  const [workoutName, setWorkoutName] = useState("");
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [exercises, setExercises] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const { toast, showSuccess, showError, showWarning, hideToast } = useToast();

  const clearError = (field) => {
    setFormErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[field];
      return newErrors;
    });
  };

  const addExercise = () => {
    if (isSaving) return;

    const newExercise = {
      id: `exercise-${Date.now()}`,
      name: "",
      exercise_type: "strength",
      notes: "",
      sets: [
        {
          id: `set-${Date.now()}-1`,
          setNumber: 1,
          reps: "",
          weight_kg: "",
          notes: "",
        },
      ],
    };

    setExercises([...exercises, newExercise]);
    showSuccess("Exercício adicionado!", 1500);
  };

  const removeExercise = (exerciseId) => {
    if (isSaving) return;
    setExercises(exercises.filter((exercise) => exercise.id !== exerciseId));
    showWarning("Exercício removido.", 1500);
  };

  const updateExercise = (exerciseId, field, value) => {
    if (isSaving) return;
    setExercises(
      exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, [field]: value } : exercise
      )
    );
  };

  const addSetToExercise = (exerciseId) => {
    if (isSaving) return;
    setExercises(
      exercises.map((exercise) => {
        if (exercise.id === exerciseId) {
          const newSetNumber = exercise.sets.length + 1;
          const newSet = {
            id: `set-${Date.now()}-${newSetNumber}`,
            setNumber: newSetNumber,
            reps: "",
            weight_kg: "",
            notes: "",
          };
          return { ...exercise, sets: [...exercise.sets, newSet] };
        }
        return exercise;
      })
    );
  };

  const removeSetFromExercise = (exerciseId, setId) => {
    if (isSaving) return;
    setExercises(
      exercises.map((exercise) => {
        if (exercise.id === exerciseId && exercise.sets.length > 1) {
          const updatedSets = exercise.sets
            .filter((set) => set.id !== setId)
            .map((set, index) => ({ ...set, setNumber: index + 1 }));
          return { ...exercise, sets: updatedSets };
        }
        return exercise;
      })
    );
  };

  const updateExerciseSet = (exerciseId, setId, field, value) => {
    if (isSaving) return;
    setExercises(
      exercises.map((exercise) => {
        if (exercise.id === exerciseId) {
          return {
            ...exercise,
            sets: exercise.sets.map((set) =>
              set.id === setId ? { ...set, [field]: value } : set
            ),
          };
        }
        return exercise;
      })
    );
  };

  const validateForm = () => {
    const errors = {};

    if (!workoutName.trim()) {
      errors.workoutName = "O nome do treino é obrigatório.";
    }

    exercises.forEach((exercise, index) => {
      if (!exercise.name.trim()) {
        errors[`exercise_${exercise.id}`] = `Nome do exercício ${
          index + 1
        } é obrigatório.`;
      }
    });

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      showError("Por favor, corrija os erros indicados no formulário.", 4000);
    }

    return Object.keys(errors).length === 0;
  };

  const saveWorkout = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Obter o usuário atual
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Usuário não autenticado");
      }

      // 1. Criar o treino - incluindo user_id obrigatório para RLS
      const workoutToInsert = {
        user_id: user.id, // Campo obrigatório para RLS
        name: workoutName.trim(),
        notes: workoutNotes.trim() || null,
        date: new Date().toISOString().split("T")[0], // Data atual no formato YYYY-MM-DD
      };

      console.log("📤 Inserting workout:", workoutToInsert);

      const { data: createdWorkout, error: workoutError } = await supabase
        .from("workouts")
        .insert([workoutToInsert])
        .select()
        .single();

      if (workoutError) {
        console.log("❌ Error creating workout:", workoutError);
        throw workoutError;
      }

      console.log("✅ Workout created:", {
        id: createdWorkout.id,
        name: createdWorkout.name,
      });

      // 2. Criar os exercícios e suas séries
      for (const exercise of exercises) {
        if (!exercise.name.trim()) continue;

        // Inserir exercício
        const exerciseToInsert = {
          workout_id: createdWorkout.id,
          name: exercise.name.trim(),
          total_sets: exercise.sets.length,
          exercise_type: exercise.exercise_type,
          notes: exercise.notes.trim() || null,
          exercise_order: exercises.indexOf(exercise),
        };

        const { data: createdExercise, error: exerciseError } = await supabase
          .from("exercises")
          .insert([exerciseToInsert])
          .select()
          .single();

        if (exerciseError) {
          console.log("❌ Error creating exercise:", exerciseError);
          throw exerciseError;
        }

        // Inserir séries do exercício
        const setsToInsert = exercise.sets.map((set) => ({
          exercise_id: createdExercise.id,
          set_number: set.setNumber,
          reps: set.reps ? parseInt(set.reps, 10) : null,
          weight_kg: set.weight_kg
            ? parseFloat(set.weight_kg.replace(",", "."))
            : null,
          notes: set.notes.trim() || null,
        }));

        const { error: setsError } = await supabase
          .from("exercise_sets")
          .insert(setsToInsert);

        if (setsError) {
          console.log("❌ Error creating exercise sets:", setsError);
          throw setsError;
        }
      }

      console.log("✅ Workout and exercises created successfully");
      showSuccess("Treino criado com sucesso! 🎉", 3000);

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error("Error saving workout:", error);

      let errorMessage =
        "Não foi possível criar o treino. Verifique sua conexão e tente novamente.";

      if (error.message === "Usuário não autenticado") {
        errorMessage = "Você precisa estar logado para criar treinos.";
      } else if (error.code === "42501") {
        errorMessage = "Permissão negada. Verifique se você está logado.";
      }

      showError(errorMessage, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoBack = () => {
    if (workoutName.trim() || exercises.length > 0) {
      showWarning("Dados não salvos serão perdidos.", 3000);
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } else {
      navigation.goBack();
    }
  };

  const renderExerciseSet = (exercise, set, setIndex) => (
    <View key={set.id} style={styles.setRow}>
      <Text style={styles.setNumber}>{set.setNumber}</Text>

      <Input
        placeholder="Reps"
        value={set.reps}
        onChangeText={(value) =>
          updateExerciseSet(exercise.id, set.id, "reps", value)
        }
        keyboardType="numeric"
        style={styles.setInput}
        editable={!isSaving}
      />

      <Input
        placeholder="Peso (kg)"
        value={set.weight_kg}
        onChangeText={(value) =>
          updateExerciseSet(exercise.id, set.id, "weight_kg", value)
        }
        keyboardType="decimal-pad"
        style={styles.setInput}
        editable={!isSaving}
      />

      {exercise.sets.length > 1 && (
        <TouchableOpacity
          onPress={() => removeSetFromExercise(exercise.id, set.id)}
          style={styles.removeSetButton}
          disabled={isSaving}
        >
          <Ionicons
            name="remove-circle"
            size={20}
            color={isSaving ? colors.gray[300] : colors.error}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderExercise = (exercise, exerciseIndex) => (
    <View key={exercise.id} style={[globalStyles.card, styles.exerciseCard]}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseTitle}>Exercício {exerciseIndex + 1}</Text>
        <TouchableOpacity
          onPress={() => removeExercise(exercise.id)}
          style={styles.removeExerciseButton}
          disabled={isSaving}
        >
          <Ionicons
            name="close-circle"
            size={24}
            color={isSaving ? colors.gray[300] : colors.error}
          />
        </TouchableOpacity>
      </View>

      <Input
        label="Nome do Exercício"
        placeholder="Ex: Supino Reto"
        value={exercise.name}
        onChangeText={(text) => {
          updateExercise(exercise.id, "name", text);
          clearError(`exercise_${exercise.id}`);
        }}
        editable={!isSaving}
        error={formErrors[`exercise_${exercise.id}`]}
      />

      <View style={styles.typeContainer}>
        <Text style={styles.typeLabel}>Tipo de Exercício</Text>
        <View style={styles.typeButtons}>
          {[
            { value: "strength", label: "Força", icon: "barbell" },
            { value: "cardio", label: "Cardio", icon: "heart" },
            { value: "flexibility", label: "Flexibilidade", icon: "body" },
          ].map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeButton,
                exercise.exercise_type === type.value &&
                  styles.typeButtonActive,
                isSaving && styles.typeButtonDisabled,
              ]}
              onPress={() =>
                !isSaving &&
                updateExercise(exercise.id, "exercise_type", type.value)
              }
              disabled={isSaving}
            >
              <Ionicons
                name={type.icon}
                size={14}
                color={
                  exercise.exercise_type === type.value
                    ? colors.white
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.typeButtonText,
                  exercise.exercise_type === type.value &&
                    styles.typeButtonTextActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Input
        label="Notas (opcional)"
        placeholder="Observações sobre o exercício..."
        value={exercise.notes}
        onChangeText={(text) => updateExercise(exercise.id, "notes", text)}
        multiline
        numberOfLines={2}
        editable={!isSaving}
      />

      <View style={styles.setsSection}>
        <View style={styles.setsHeader}>
          <Text style={styles.setsTitle}>Séries</Text>
          <TouchableOpacity
            onPress={() => addSetToExercise(exercise.id)}
            style={[
              styles.addSetButton,
              isSaving && styles.addSetButtonDisabled,
            ]}
            disabled={isSaving}
          >
            <Ionicons
              name="add-circle"
              size={18}
              color={isSaving ? colors.gray[300] : colors.primary}
            />
            <Text style={[styles.addSetText, isSaving && styles.disabledText]}>
              Adicionar Série
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.setsHeaderRow}>
          <Text style={styles.setHeaderText}>Série</Text>
          <Text style={styles.setHeaderText}>Reps</Text>
          <Text style={styles.setHeaderText}>Peso</Text>
          <View style={{ flex: 1 }} />
        </View>

        {exercise.sets.map((set, setIndex) =>
          renderExerciseSet(exercise, set, setIndex)
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
        position="top"
      />

      {isSaving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.savingText}>A criar treino...</Text>
        </View>
      )}

      <ScrollView
        style={[styles.scrollContainer, isSaving && styles.disabledScroll]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
        scrollEnabled={!isSaving}
      >
        <View style={styles.content}>
          <View style={[globalStyles.card, styles.headerCard]}>
            <View style={styles.headerContent}>
              <Ionicons name="add-circle" size={32} color={colors.primary} />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Criar Novo Treino</Text>
                <Text style={styles.headerSubtitle}>
                  Adicione exercícios e defina suas séries
                </Text>
              </View>
            </View>
          </View>

          <View style={[globalStyles.card, styles.workoutInfoCard]}>
            <Text style={styles.sectionTitle}>Informações do Treino</Text>

            <Input
              label="Nome do Treino"
              placeholder="Ex: Treino de Peito e Tríceps"
              value={workoutName}
              onChangeText={(text) => {
                setWorkoutName(text);
                clearError("workoutName");
              }}
              editable={!isSaving}
              error={formErrors.workoutName}
            />

            <Input
              label="Notas (opcional)"
              placeholder="Observações sobre o treino..."
              value={workoutNotes}
              onChangeText={setWorkoutNotes}
              multiline
              numberOfLines={3}
              editable={!isSaving}
            />
          </View>

          <View style={styles.exercisesSection}>
            <View style={styles.exercisesHeader}>
              <Text style={styles.sectionTitle}>
                Exercícios ({exercises.length})
              </Text>
              <TouchableOpacity
                onPress={addExercise}
                style={[
                  styles.addExerciseButton,
                  isSaving && styles.addExerciseButtonDisabled,
                ]}
                disabled={isSaving}
              >
                <Ionicons
                  name="add-circle"
                  size={20}
                  color={isSaving ? colors.gray[300] : colors.primary}
                />
                <Text
                  style={[
                    styles.addExerciseText,
                    isSaving && styles.disabledText,
                  ]}
                >
                  Adicionar Exercício
                </Text>
              </TouchableOpacity>
            </View>

            {exercises.map((exercise, exerciseIndex) =>
              renderExercise(exercise, exerciseIndex)
            )}

            {exercises.length === 0 && (
              <View style={[globalStyles.card, styles.noExercisesCard]}>
                <Ionicons
                  name="barbell-outline"
                  size={48}
                  color={colors.gray[400]}
                />
                <Text style={styles.noExercisesTitle}>
                  Nenhum exercício adicionado
                </Text>
                <Text style={styles.noExercisesText}>
                  Clique em Adicionar Exercício para começar a criar seu treino
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <Button
          title="Cancelar"
          variant="outline"
          onPress={handleGoBack}
          style={styles.cancelButton}
          disabled={isSaving}
        />
        <Button
          title="Criar Treino"
          onPress={saveWorkout}
          isLoading={isSaving}
          style={styles.saveButton}
          disabled={isSaving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  savingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  savingText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    marginTop: 16,
    fontWeight: typography.weights.medium,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 120,
  },
  disabledScroll: {
    opacity: 0.6,
  },
  content: {
    padding: 20,
  },
  headerCard: {
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  workoutInfoCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 16,
  },
  exercisesSection: {
    marginBottom: 20,
  },
  exercisesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "10",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addExerciseButtonDisabled: {
    backgroundColor: colors.gray[100],
  },
  addExerciseText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginLeft: 6,
  },
  disabledText: {
    color: colors.gray[400],
  },
  exerciseCard: {
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  exerciseTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  removeExerciseButton: {
    padding: 4,
  },
  typeContainer: {
    marginVertical: 15,
  },
  typeLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: 10,
  },
  typeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonDisabled: {
    opacity: 0.6,
  },
  typeButtonText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  typeButtonTextActive: {
    color: colors.white,
    fontWeight: typography.weights.medium,
  },
  setsSection: {
    marginTop: 15,
  },
  setsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  setsTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "10",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  addSetButtonDisabled: {
    backgroundColor: colors.gray[100],
  },
  addSetText: {
    color: colors.primary,
    fontSize: typography.sizes.xs,
    marginLeft: 3,
  },
  setsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    marginBottom: 5,
  },
  setHeaderText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    flex: 1,
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  setNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    minWidth: 25,
    textAlign: "center",
    backgroundColor: colors.primary + "10",
    paddingVertical: 6,
    borderRadius: 4,
  },
  setInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeSetButton: {
    padding: 2,
  },
  noExercisesCard: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noExercisesTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noExercisesText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  bottomButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    borderColor: colors.gray[400],
  },
  saveButton: {
    flex: 2,
    marginLeft: 10,
  },
});
