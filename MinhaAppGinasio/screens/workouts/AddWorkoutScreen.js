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
import useWorkouts from "../../hooks/useWorkouts";
import useToast from "../../hooks/useToast";

export default function AddWorkoutScreen({ navigation }) {
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDate, setWorkoutDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [exercises, setExercises] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const { createWorkout, loading: workoutsHookLoading } = useWorkouts();
  const { toast, showSuccess, showError, showWarning, hideToast } = useToast();

  const clearError = (field) => {
    setFormErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[field];
      return newErrors;
    });
  };

  const clearExerciseNameError = (exerciseId) => {
    setFormErrors((prevErrors) => {
      const newExerciseErrors = { ...(prevErrors.exerciseNames || {}) };
      delete newExerciseErrors[exerciseId];
      return {
        ...prevErrors,
        exerciseNames: newExerciseErrors,
      };
    });
  };

  const addExercise = () => {
    if (isSaving) return;

    const newExercise = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      sets: "",
      reps: "",
      weight_kg: "",
      notes: "",
    };
    setExercises([...exercises, newExercise]);
    clearError("exercisesGlobal");

    // Toast de feedback
    showSuccess("Exercício adicionado! Preencha os dados.", 2000);
  };

  const updateExercise = (exerciseId, field, value) => {
    if (isSaving) return;
    setExercises(
      exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, [field]: value } : exercise
      )
    );
    if (field === "name") {
      clearExerciseNameError(exerciseId);
    }
  };

  const removeExercise = (exerciseId) => {
    if (isSaving) return;
    setExercises(exercises.filter((exercise) => exercise.id !== exerciseId));
    clearExerciseNameError(exerciseId);

    // Toast de feedback
    showWarning("Exercício removido.", 2000);
  };

  const validateForm = () => {
    const errors = {};

    if (!workoutName.trim()) {
      errors.workoutName = "O nome do treino é obrigatório.";
    }

    if (exercises.length === 0) {
      errors.exercisesGlobal = "Adicione pelo menos um exercício.";
    }

    const exerciseNameErrors = {};
    exercises.forEach((exercise, index) => {
      if (!exercise.name.trim()) {
        exerciseNameErrors[exercise.id] = `O nome do Exercício ${
          index + 1
        } é obrigatório.`;
      }
    });

    if (Object.keys(exerciseNameErrors).length > 0) {
      errors.exerciseNames = exerciseNameErrors;
    }

    setFormErrors(errors);

    // Mostrar toast de erro se houver problemas
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
      const workoutData = {
        name: workoutName.trim(),
        date: workoutDate,
        notes: workoutNotes.trim(),
      };

      const exercisesToSave = exercises.map((ex) => ({
        name: ex.name.trim(),
        sets: ex.sets ? parseInt(ex.sets, 10) : null,
        reps: ex.reps ? parseInt(ex.reps, 10) : null,
        weight_kg: ex.weight_kg
          ? parseFloat(ex.weight_kg.replace(",", "."))
          : null,
        notes: ex.notes.trim(),
      }));

      const result = await createWorkout(workoutData, exercisesToSave);

      if (result.error) {
        throw result.error;
      }

      // Toast de sucesso
      showSuccess("Treino guardado com sucesso! 🎉", 3000);

      // Navegar de volta após pequeno delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error("Error saving workout via hook:", error);

      // Toast de erro específico
      const errorMessage =
        error.message ||
        "Não foi possível guardar o treino. Verifique sua conexão e tente novamente.";
      showError(errorMessage, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoBack = () => {
    if (exercises.length > 0 || workoutName.trim()) {
      showWarning("Dados não salvos serão perdidos.", 3000);
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } else {
      navigation.goBack();
    }
  };

  const renderExercise = (exercise, index) => (
    <View key={exercise.id} style={[globalStyles.card, styles.exerciseCard]}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseTitle}>Exercício {index + 1}</Text>
        <TouchableOpacity
          onPress={() => removeExercise(exercise.id)}
          style={styles.removeButton}
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
        onChangeText={(value) => updateExercise(exercise.id, "name", value)}
        editable={!isSaving}
        error={formErrors.exerciseNames?.[exercise.id]}
      />

      <View style={styles.exerciseRow}>
        <Input
          label="Séries"
          placeholder="3"
          value={exercise.sets}
          onChangeText={(value) => updateExercise(exercise.id, "sets", value)}
          keyboardType="numeric"
          style={styles.smallInput}
          editable={!isSaving}
        />
        <Input
          label="Repetições"
          placeholder="12"
          value={exercise.reps}
          onChangeText={(value) => updateExercise(exercise.id, "reps", value)}
          keyboardType="numeric"
          style={styles.smallInput}
          editable={!isSaving}
        />
        <Input
          label="Peso (kg)"
          placeholder="50 ou 50.5"
          value={exercise.weight_kg}
          onChangeText={(value) =>
            updateExercise(exercise.id, "weight_kg", value)
          }
          keyboardType="decimal-pad"
          style={styles.smallInput}
          editable={!isSaving}
        />
      </View>

      <Input
        label="Notas (opcional)"
        placeholder="Observações sobre o exercício..."
        value={exercise.notes}
        onChangeText={(value) => updateExercise(exercise.id, "notes", value)}
        multiline
        numberOfLines={2}
        editable={!isSaving}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      {/* Toast Component */}
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
          <Text style={styles.savingText}>A guardar treino...</Text>
        </View>
      )}

      <ScrollView
        style={[styles.scrollContainer, isSaving && styles.disabledScroll]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
        scrollEnabled={!isSaving}
      >
        <View style={styles.content}>
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
              label="Data"
              placeholder="YYYY-MM-DD"
              value={workoutDate}
              onChangeText={setWorkoutDate}
              editable={!isSaving}
            />

            <Input
              label="Notas (opcional)"
              placeholder="Observações gerais sobre o treino..."
              value={workoutNotes}
              onChangeText={setWorkoutNotes}
              multiline
              numberOfLines={3}
              editable={!isSaving}
            />
          </View>

          <View style={styles.exercisesSection}>
            <View style={styles.exercisesHeader}>
              <Text style={styles.sectionTitle}>Exercícios</Text>
              <TouchableOpacity
                style={[
                  styles.addExerciseButton,
                  isSaving && styles.disabledButton,
                ]}
                onPress={addExercise}
                disabled={isSaving}
              >
                <Ionicons
                  name="add-circle"
                  size={28}
                  color={isSaving ? colors.gray[300] : colors.primary}
                />
                <Text
                  style={[
                    styles.addExerciseText,
                    isSaving && styles.disabledButtonText,
                  ]}
                >
                  Adicionar
                </Text>
              </TouchableOpacity>
            </View>

            {formErrors.exercisesGlobal && (
              <Text style={[styles.errorText, styles.globalErrorText]}>
                {formErrors.exercisesGlobal}
              </Text>
            )}

            {exercises.map((exercise, index) =>
              renderExercise(exercise, index)
            )}

            {exercises.length === 0 &&
              !isSaving &&
              !formErrors.exercisesGlobal && (
                <View style={styles.noExercisesContainer}>
                  <Ionicons
                    name="fitness-outline"
                    size={48}
                    color={colors.gray[400]}
                  />
                  <Text style={styles.noExercisesText}>
                    Nenhum exercício adicionado
                  </Text>
                  <Text style={styles.noExercisesSubtext}>
                    Toque em "Adicionar" para começar
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
          title="Guardar Treino"
          onPress={saveWorkout}
          isLoading={isSaving}
          style={styles.saveButton}
          disabled={isSaving || workoutsHookLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Estilos do container principal
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Overlay de loading
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

  // Estilos do scroll
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 120, // Espaço para os botões
  },
  disabledScroll: {
    opacity: 0.6,
  },

  // Conteúdo principal
  content: {
    padding: 20,
  },

  // Cards e seções
  workoutInfoCard: {
    marginBottom: 20,
  },
  exercisesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 16,
  },

  // Header dos exercícios
  exercisesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "10",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addExerciseText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginLeft: 6,
  },
  disabledButton: {
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[300],
  },
  disabledButtonText: {
    color: colors.gray[400],
  },

  // Cards de exercício
  exerciseCard: {
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  removeButton: {
    padding: 4,
  },

  // Row de inputs pequenos
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  smallInput: {
    flex: 1,
  },

  // Estado vazio
  noExercisesContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderStyle: "dashed",
  },
  noExercisesText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.gray[600],
    marginTop: 12,
    textAlign: "center",
  },
  noExercisesSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    marginTop: 4,
    textAlign: "center",
  },

  // Erros
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    marginTop: 4,
  },
  globalErrorText: {
    backgroundColor: colors.error + "10",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error + "30",
    marginBottom: 16,
  },

  // Botões inferiores
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
