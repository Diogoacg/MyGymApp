import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Toast from "../../components/common/Toast";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";
import useToast from "../../hooks/useToast";

export default function EditExerciseScreen({ route, navigation }) {
  const { exerciseId, workoutId } = route.params;
  const [exercise, setExercise] = useState({
    name: "",
    sets: "",
    reps: "",
    weight_kg: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { toast, showSuccess, showError, showWarning, hideToast } = useToast();

  useEffect(() => {
    loadExercise();
  }, [exerciseId]);

  async function loadExercise() {
    try {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("id", exerciseId)
        .single();

      if (error) throw error;

      setExercise({
        name: data.name || "",
        sets: data.sets?.toString() || "",
        reps: data.reps?.toString() || "",
        weight_kg: data.weight_kg?.toString() || "",
        notes: data.notes || "",
      });
    } catch (error) {
      showError("Não foi possível carregar o exercício.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  const updateField = (field, value) => {
    setExercise((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!exercise.name.trim()) {
      showError("Por favor, insira um nome para o exercício.");
      return false;
    }
    return true;
  };

  const saveExercise = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const updateData = {
        name: exercise.name.trim(),
        sets: exercise.sets ? parseInt(exercise.sets) : null,
        reps: exercise.reps ? parseInt(exercise.reps) : null,
        weight_kg: exercise.weight_kg
          ? parseFloat(exercise.weight_kg.replace(",", "."))
          : null,
        notes: exercise.notes.trim(),
      };

      const { error } = await supabase
        .from("exercises")
        .update(updateData)
        .eq("id", exerciseId);

      if (error) throw error;

      showSuccess("Exercício atualizado com sucesso! 🎉");
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      showError("Não foi possível atualizar o exercício.");
      console.error("Error updating exercise:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteExercise = async () => {
    Alert.alert(
      "Confirmar",
      `Tem certeza que deseja apagar o exercício "${exercise.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase
                .from("exercises")
                .delete()
                .eq("id", exerciseId);

              if (error) throw error;

              showSuccess("Exercício apagado com sucesso!");
              setTimeout(() => navigation.goBack(), 1500);
            } catch (error) {
              showError("Não foi possível apagar o exercício.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleGoBack = () => {
    // Verificar se há mudanças não salvas
    const hasChanges =
      exercise.name !== "" ||
      exercise.sets !== "" ||
      exercise.reps !== "" ||
      exercise.weight_kg !== "" ||
      exercise.notes !== "";

    if (hasChanges) {
      showWarning("Alterações não salvas serão perdidas.", 2000);
      setTimeout(() => navigation.goBack(), 1000);
    } else {
      navigation.goBack();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
        position="top"
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={[globalStyles.card, styles.exerciseCard]}>
            <Text style={styles.title}>Editar Exercício</Text>

            <Input
              label="Nome do Exercício"
              placeholder="Ex: Supino Reto"
              value={exercise.name}
              onChangeText={(value) => updateField("name", value)}
              editable={!saving && !deleting}
            />

            <View style={styles.exerciseRow}>
              <Input
                label="Séries"
                placeholder="3"
                value={exercise.sets}
                onChangeText={(value) => updateField("sets", value)}
                keyboardType="numeric"
                style={styles.smallInput}
                editable={!saving && !deleting}
              />
              <Input
                label="Repetições"
                placeholder="12"
                value={exercise.reps}
                onChangeText={(value) => updateField("reps", value)}
                keyboardType="numeric"
                style={styles.smallInput}
                editable={!saving && !deleting}
              />
              <Input
                label="Peso (kg)"
                placeholder="50 ou 50.5"
                value={exercise.weight_kg}
                onChangeText={(value) => updateField("weight_kg", value)}
                keyboardType="decimal-pad"
                style={styles.smallInput}
                editable={!saving && !deleting}
              />
            </View>

            <Input
              label="Notas (opcional)"
              placeholder="Observações sobre o exercício..."
              value={exercise.notes}
              onChangeText={(value) => updateField("notes", value)}
              multiline
              numberOfLines={3}
              editable={!saving && !deleting}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <Button
          title="Apagar"
          variant="outline"
          onPress={deleteExercise}
          style={[styles.button, styles.deleteButton]}
          disabled={saving || deleting}
          isLoading={deleting}
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Space for bottom buttons
  },
  content: {
    padding: 20,
  },
  exerciseCard: {
    marginBottom: 20,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 20,
    textAlign: "center",
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  smallInput: {
    flex: 1,
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
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  deleteButton: {
    borderColor: colors.error,
  },
});
