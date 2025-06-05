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

export default function AddExerciseScreen({ route, navigation }) {
  const { workoutId, workoutName } = route.params;

  const [exerciseName, setExerciseName] = useState("");
  const [exerciseType, setExerciseType] = useState("strength");
  const [exerciseNotes, setExerciseNotes] = useState("");
  const [sets, setSets] = useState([
    {
      id: `set-${Date.now()}-1`,
      setNumber: 1,
      reps: "",
      weight_kg: "",
      notes: "",
    },
  ]);
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

  const addSet = () => {
    if (isSaving) return;

    const newSetNumber = sets.length + 1;
    const newSet = {
      id: `set-${Date.now()}-${newSetNumber}`,
      setNumber: newSetNumber,
      reps: "",
      weight_kg: "",
      notes: "",
    };
    setSets([...sets, newSet]);
    showSuccess("Série adicionada!", 1500);
  };

  const removeSet = (setId) => {
    if (isSaving || sets.length <= 1) return;

    const updatedSets = sets
      .filter((set) => set.id !== setId)
      .map((set, index) => ({ ...set, setNumber: index + 1 }));

    setSets(updatedSets);
    showWarning("Série removida.", 1500);
  };

  const updateSet = (setId, field, value) => {
    if (isSaving) return;

    setSets(
      sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set))
    );
  };

  const validateForm = () => {
    const errors = {};

    if (!exerciseName.trim()) {
      errors.exerciseName = "O nome do exercício é obrigatório.";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      showError("Por favor, corrija os erros indicados no formulário.", 4000);
    }

    return Object.keys(errors).length === 0;
  };

  const saveExercise = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // 1. Inserir o exercício
      const exerciseToInsert = {
        workout_id: workoutId,
        name: exerciseName.trim(),
        total_sets: sets.length,
        exercise_type: exerciseType,
        notes: exerciseNotes.trim(),
      };

      console.log("📤 Inserting exercise:", exerciseToInsert);

      const { data: createdExercise, error: exerciseError } = await supabase
        .from("exercises")
        .insert([exerciseToInsert])
        .select()
        .single();

      if (exerciseError) {
        console.log("❌ Error creating exercise:", exerciseError);
        throw exerciseError;
      }

      console.log("✅ Exercise created:", {
        id: createdExercise.id,
        name: createdExercise.name,
      });

      // 2. Inserir as séries
      const setsToInsert = sets.map((set) => ({
        exercise_id: createdExercise.id,
        set_number: set.setNumber,
        reps: set.reps ? parseInt(set.reps, 10) : null,
        weight_kg: set.weight_kg
          ? parseFloat(set.weight_kg.replace(",", "."))
          : null,
        notes: set.notes.trim(),
      }));

      console.log("📤 Inserting exercise sets:", {
        exerciseId: createdExercise.id,
        setsCount: setsToInsert.length,
      });

      const { error: setsError } = await supabase
        .from("exercise_sets")
        .insert(setsToInsert);

      if (setsError) {
        console.log("❌ Error creating exercise sets:", setsError);
        throw setsError;
      }

      console.log("✅ Exercise and sets created successfully");
      showSuccess("Exercício adicionado com sucesso! 🎉", 3000);

      // Chamar callback se fornecido
      if (route.params?.onExerciseAdded) {
        console.log("🔄 Calling onExerciseAdded callback");
        route.params.onExerciseAdded();
      }

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error("Error saving exercise:", error);

      const errorMessage =
        error.message ||
        "Não foi possível guardar o exercício. Verifique sua conexão e tente novamente.";
      showError(errorMessage, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoBack = () => {
    if (exerciseName.trim() || sets.some((set) => set.reps || set.weight_kg)) {
      showWarning("Dados não salvos serão perdidos.", 3000);
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } else {
      navigation.goBack();
    }
  };

  const renderSet = (set, setIndex) => (
    <View key={set.id} style={styles.setRow}>
      <Text style={styles.setNumber}>{set.setNumber}</Text>

      <Input
        placeholder="Reps"
        value={set.reps}
        onChangeText={(value) => updateSet(set.id, "reps", value)}
        keyboardType="numeric"
        style={styles.setInput}
        editable={!isSaving}
      />

      <Input
        placeholder="Peso (kg)"
        value={set.weight_kg}
        onChangeText={(value) => updateSet(set.id, "weight_kg", value)}
        keyboardType="decimal-pad"
        style={styles.setInput}
        editable={!isSaving}
      />

      {sets.length > 1 && (
        <TouchableOpacity
          onPress={() => removeSet(set.id)}
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
          <Text style={styles.savingText}>A guardar exercício...</Text>
        </View>
      )}

      <ScrollView
        style={[styles.scrollContainer, isSaving && styles.disabledScroll]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
        scrollEnabled={!isSaving}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={[globalStyles.card, styles.headerCard]}>
            <View style={styles.headerContent}>
              <Ionicons name="add-circle" size={32} color={colors.primary} />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Adicionar Exercício</Text>
                <Text style={styles.headerSubtitle}>
                  ao treino {workoutName}
                </Text>
              </View>
            </View>
          </View>

          {/* Exercise Info */}
          <View style={[globalStyles.card, styles.exerciseInfoCard]}>
            <Text style={styles.sectionTitle}>Informações do Exercício</Text>

            <Input
              label="Nome do Exercício"
              placeholder="Ex: Supino Reto"
              value={exerciseName}
              onChangeText={(text) => {
                setExerciseName(text);
                clearError("exerciseName");
              }}
              editable={!isSaving}
              error={formErrors.exerciseName}
            />

            <View style={styles.typeContainer}>
              <Text style={styles.typeLabel}>Tipo de Exercício</Text>
              <View style={styles.typeButtons}>
                {[
                  { value: "strength", label: "Força", icon: "barbell" },
                  { value: "cardio", label: "Cardio", icon: "heart" },
                  {
                    value: "flexibility",
                    label: "Flexibilidade",
                    icon: "body",
                  },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      exerciseType === type.value && styles.typeButtonActive,
                      isSaving && styles.typeButtonDisabled,
                    ]}
                    onPress={() => !isSaving && setExerciseType(type.value)}
                    disabled={isSaving}
                  >
                    <Ionicons
                      name={type.icon}
                      size={16}
                      color={
                        exerciseType === type.value
                          ? colors.white
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        exerciseType === type.value &&
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
              value={exerciseNotes}
              onChangeText={setExerciseNotes}
              multiline
              numberOfLines={2}
              editable={!isSaving}
            />
          </View>

          {/* Sets Section */}
          <View style={[globalStyles.card, styles.setsCard]}>
            <View style={styles.setsHeader}>
              <Text style={styles.sectionTitle}>Séries</Text>
              <TouchableOpacity
                onPress={addSet}
                style={[
                  styles.addSetButton,
                  isSaving && styles.addSetButtonDisabled,
                ]}
                disabled={isSaving}
              >
                <Ionicons
                  name="add-circle"
                  size={20}
                  color={isSaving ? colors.gray[300] : colors.primary}
                />
                <Text
                  style={[styles.addSetText, isSaving && styles.disabledText]}
                >
                  Adicionar Série
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.setsHeaderRow}>
              <Text style={styles.setHeaderText}>Série</Text>
              <Text style={styles.setHeaderText}>Reps</Text>
              <Text style={styles.setHeaderText}>Peso</Text>
              <Text style={styles.setHeaderText}> </Text>
            </View>

            {sets.map((set, setIndex) => renderSet(set, setIndex))}

            {sets.length === 0 && (
              <View style={styles.noSetsContainer}>
                <Text style={styles.noSetsText}>
                  Nenhuma série adicionada ainda
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
          title="Guardar Exercício"
          onPress={saveExercise}
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

  // Header
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

  // Exercise Info
  exerciseInfoCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 16,
  },

  // Type Selection
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
    gap: 10,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
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
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  typeButtonTextActive: {
    color: colors.white,
    fontWeight: typography.weights.medium,
  },

  // Sets
  setsCard: {
    marginBottom: 20,
  },
  setsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "10",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addSetButtonDisabled: {
    backgroundColor: colors.gray[100],
  },
  addSetText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    marginLeft: 4,
  },
  disabledText: {
    color: colors.gray[400],
  },
  setsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    marginBottom: 5,
  },
  setHeaderText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    flex: 1,
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  setNumber: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    minWidth: 30,
    textAlign: "center",
    backgroundColor: colors.primary + "10",
    paddingVertical: 8,
    borderRadius: 6,
  },
  setInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeSetButton: {
    padding: 4,
  },
  noSetsContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noSetsText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: "center",
  },

  // Bottom Buttons
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
