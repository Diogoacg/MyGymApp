import React, { useState, useEffect } from "react";
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
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Toast from "../../components/common/Toast";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { ConfirmModal } from "../../components/common/Modal";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";
import useToast from "../../hooks/useToast";

export default function EditExerciseScreen({ route, navigation }) {
  const { exerciseId, workoutId } = route.params;

  const [exercise, setExercise] = useState({
    name: "",
    exercise_type: "strength",
    notes: "",
  });
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const { toast, showSuccess, showError, showWarning, hideToast } = useToast();

  useEffect(() => {
    loadExercise();
  }, [exerciseId]);

  async function loadExercise() {
    try {
      // Carregar exercício com suas séries
      const { data: exerciseData, error: exerciseError } = await supabase
        .from("exercises")
        .select(
          `
          *,
          exercise_sets (
            id,
            set_number,
            reps,
            weight_kg,
            notes
          )
        `
        )
        .eq("id", exerciseId)
        .single();

      if (exerciseError) throw exerciseError;

      setExercise({
        name: exerciseData.name || "",
        exercise_type: exerciseData.exercise_type || "strength",
        notes: exerciseData.notes || "",
      });

      // Ordenar séries por número e configurar estados
      const sortedSets = (exerciseData.exercise_sets || [])
        .sort((a, b) => a.set_number - b.set_number)
        .map((set) => ({
          id: set.id,
          setNumber: set.set_number,
          reps: set.reps?.toString() || "",
          weight_kg: set.weight_kg?.toString() || "",
          notes: set.notes || "",
          isExisting: true, // Marca que é uma série existente no banco
        }));

      // Se não há séries, criar uma padrão
      if (sortedSets.length === 0) {
        setSets([
          {
            id: `new-set-${Date.now()}-1`,
            setNumber: 1,
            reps: "",
            weight_kg: "",
            notes: "",
            isExisting: false,
          },
        ]);
      } else {
        setSets(sortedSets);
      }
    } catch (error) {
      console.error("Error loading exercise:", error);
      showError("Não foi possível carregar o exercício.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  const clearError = (field) => {
    setFormErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[field];
      return newErrors;
    });
  };

  const updateExercise = (field, value) => {
    setExercise((prev) => ({ ...prev, [field]: value }));
    if (field === "name") {
      clearError("exerciseName");
    }
  };

  const addSet = () => {
    if (saving || deleting) return;

    const newSetNumber = sets.length + 1;
    const newSet = {
      id: `new-set-${Date.now()}-${newSetNumber}`,
      setNumber: newSetNumber,
      reps: "",
      weight_kg: "",
      notes: "",
      isExisting: false, // Marca como nova série
    };
    setSets([...sets, newSet]);
    showSuccess("Série adicionada!", 1500);
  };

  const removeSet = (setId) => {
    if (saving || deleting || sets.length <= 1) return;

    const updatedSets = sets
      .filter((set) => set.id !== setId)
      .map((set, index) => ({
        ...set,
        setNumber: index + 1,
        isExisting: false, // Marca como modificada para forçar recriação
      }));

    setSets(updatedSets);
    showWarning("Série removida.", 1500);
  };
  const updateSet = (setId, field, value) => {
    if (saving || deleting) return;

    setSets(
      sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set))
    );
  };

  const validateForm = () => {
    const errors = {};

    if (!exercise.name.trim()) {
      errors.exerciseName = "O nome do exercício é obrigatório.";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      showError("Por favor, corrija os erros indicados no formulário.", 4000);
    }

    return Object.keys(errors).length === 0;
  };

  const saveExercise = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // 1. Atualizar exercício
      const exerciseUpdateData = {
        name: exercise.name.trim(),
        total_sets: sets.length,
        exercise_type: exercise.exercise_type,
        notes: exercise.notes.trim(),
      };

      const { error: exerciseError } = await supabase
        .from("exercises")
        .update(exerciseUpdateData)
        .eq("id", exerciseId);

      if (exerciseError) throw exerciseError;

      // 2. Primeiro, remover TODAS as séries existentes do exercício
      const { error: deleteAllError } = await supabase
        .from("exercise_sets")
        .delete()
        .eq("exercise_id", exerciseId);

      if (deleteAllError) throw deleteAllError;

      // 3. Inserir todas as séries como novas (mais simples e confiável)
      if (sets.length > 0) {
        const setsToInsert = sets
          .filter((set) => set.reps || set.weight_kg) // Só inserir séries com dados
          .map((set, index) => ({
            exercise_id: exerciseId,
            set_number: index + 1, // Renumerar sequencialmente
            reps: set.reps ? parseInt(set.reps, 10) : null,
            weight_kg: set.weight_kg
              ? parseFloat(set.weight_kg.replace(",", "."))
              : null,
            notes: set.notes?.trim() || null,
          }));

        if (setsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("exercise_sets")
            .insert(setsToInsert);

          if (insertError) throw insertError;
        }
      }

      showSuccess("Exercício atualizado com sucesso! 🎉", 3000);

      // Chamar callback se fornecido
      if (route.params?.onExerciseUpdated) {
        console.log("🔄 Calling onExerciseUpdated callback");
        route.params.onExerciseUpdated();
      }

      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      console.error("Error updating exercise:", error);
      showError("Não foi possível atualizar o exercício.", 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    setDeleting(true);

    try {
      // O CASCADE vai apagar automaticamente as exercise_sets
      const { error } = await supabase
        .from("exercises")
        .delete()
        .eq("id", exerciseId);

      if (error) throw error;

      showSuccess("Exercício apagado com sucesso!", 3000);

      // Chamar callback se fornecido (para recarregar após apagar)
      if (route.params?.onExerciseUpdated) {
        console.log("🔄 Calling onExerciseUpdated callback after delete");
        route.params.onExerciseUpdated();
      }

      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      console.error("Error deleting exercise:", error);
      showError("Não foi possível apagar o exercício.", 5000);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleGoBack = () => {
    const hasChanges =
      exercise.name !== "" ||
      exercise.notes !== "" ||
      sets.some((set) => set.reps || set.weight_kg || set.notes);

    if (hasChanges) {
      showWarning("Alterações não salvas serão perdidas.", 3000);
      setTimeout(() => navigation.goBack(), 1000);
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
        editable={!saving && !deleting}
      />

      <Input
        placeholder="Peso (kg)"
        value={set.weight_kg}
        onChangeText={(value) => updateSet(set.id, "weight_kg", value)}
        keyboardType="decimal-pad"
        style={styles.setInput}
        editable={!saving && !deleting}
      />

      {sets.length > 1 && (
        <TouchableOpacity
          onPress={() => removeSet(set.id)}
          style={styles.removeSetButton}
          disabled={saving || deleting}
        >
          <Ionicons
            name="remove-circle"
            size={20}
            color={saving || deleting ? colors.gray[300] : colors.error}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner text="A carregar exercício..." />
      </View>
    );
  }

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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja apagar o exercício "${exercise.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Apagar"
        cancelText="Cancelar"
        type="error"
        confirmButtonStyle={{ backgroundColor: colors.error }}
        isLoading={deleting}
      />

      {(saving || deleting) && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.savingText}>
            {saving ? "A guardar exercício..." : "A apagar exercício..."}
          </Text>
        </View>
      )}

      <ScrollView
        style={[
          styles.scrollContainer,
          (saving || deleting) && styles.disabledScroll,
        ]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!saving && !deleting}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={[globalStyles.card, styles.headerCard]}>
            <View style={styles.headerContent}>
              <Ionicons name="create" size={32} color={colors.primary} />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Editar Exercício</Text>
                <Text style={styles.headerSubtitle}>
                  Atualize as informações e séries
                </Text>
              </View>
            </View>
          </View>

          {/* Exercise Info */}
          <View style={[globalStyles.card, styles.exerciseCard]}>
            <Text style={styles.sectionTitle}>Informações do Exercício</Text>

            <Input
              label="Nome do Exercício"
              placeholder="Ex: Supino Reto"
              value={exercise.name}
              onChangeText={(value) => updateExercise("name", value)}
              editable={!saving && !deleting}
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
                      exercise.exercise_type === type.value &&
                        styles.typeButtonActive,
                      (saving || deleting) && styles.typeButtonDisabled,
                    ]}
                    onPress={() =>
                      !saving &&
                      !deleting &&
                      updateExercise("exercise_type", type.value)
                    }
                    disabled={saving || deleting}
                  >
                    <Ionicons
                      name={type.icon}
                      size={16}
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
              onChangeText={(value) => updateExercise("notes", value)}
              multiline
              numberOfLines={2}
              editable={!saving && !deleting}
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
                  (saving || deleting) && styles.addSetButtonDisabled,
                ]}
                disabled={saving || deleting}
              >
                <Ionicons
                  name="add-circle"
                  size={20}
                  color={saving || deleting ? colors.gray[300] : colors.primary}
                />
                <Text
                  style={[
                    styles.addSetText,
                    (saving || deleting) && styles.disabledText,
                  ]}
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
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <Button
          title="Apagar"
          variant="outline"
          onPress={handleDeleteRequest}
          style={[styles.button, styles.deleteButton]}
          disabled={saving || deleting}
          icon={
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          }
        />
        <Button
          title="Cancelar"
          variant="secondary"
          onPress={handleGoBack}
          style={styles.button}
          disabled={saving || deleting}
        />
        <Button
          title="Guardar"
          onPress={saveExercise}
          isLoading={saving}
          style={styles.button}
          disabled={saving || deleting}
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
  scrollContent: {
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
  exerciseCard: {
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
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  deleteButton: {
    borderColor: colors.error,
  },
});
