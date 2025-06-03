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
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";

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
      Alert.alert("Erro", "Não foi possível carregar o exercício.");
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
      Alert.alert("Erro", "Por favor, insira um nome para o exercício.");
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
        weight_kg: exercise.weight_kg ? parseFloat(exercise.weight_kg) : null,
        notes: exercise.notes.trim(),
      };

      const { error } = await supabase
        .from("exercises")
        .update(updateData)
        .eq("id", exerciseId);

      if (error) throw error;

      Alert.alert("Sucesso", "Exercício atualizado com sucesso!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar o exercício.");
      console.error("Error updating exercise:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteExercise = async () => {
    Alert.alert("Confirmar", "Tem certeza que deseja apagar este exercício?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("exercises")
              .delete()
              .eq("id", exerciseId);

            if (error) throw error;
            navigation.goBack();
          } catch (error) {
            Alert.alert("Erro", "Não foi possível apagar o exercício.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={[globalStyles.card, styles.exerciseCard]}>
            <Text style={styles.title}>Editar Exercício</Text>

            <Input
              label="Nome do Exercício"
              placeholder="Ex: Supino Reto"
              value={exercise.name}
              onChangeText={(value) => updateField("name", value)}
            />

            <View style={styles.exerciseRow}>
              <Input
                label="Séries"
                placeholder="3"
                value={exercise.sets}
                onChangeText={(value) => updateField("sets", value)}
                keyboardType="numeric"
                style={styles.smallInput}
              />
              <Input
                label="Repetições"
                placeholder="12"
                value={exercise.reps}
                onChangeText={(value) => updateField("reps", value)}
                keyboardType="numeric"
                style={styles.smallInput}
              />
              <Input
                label="Peso (kg)"
                placeholder="50"
                value={exercise.weight_kg}
                onChangeText={(value) => updateField("weight_kg", value)}
                keyboardType="decimal-pad"
                style={styles.smallInput}
              />
            </View>

            <Input
              label="Notas (opcional)"
              placeholder="Observações sobre o exercício..."
              value={exercise.notes}
              onChangeText={(value) => updateField("notes", value)}
              multiline
              numberOfLines={3}
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
        />
        <Button
          title="Cancelar"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.button}
        />
        <Button
          title="Guardar"
          onPress={saveExercise}
          loading={saving}
          style={styles.button}
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
  content: {
    padding: 20,
    paddingBottom: 100, // Space for bottom buttons
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
  },
  smallInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  bottomButtons: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  deleteButton: {
    borderColor: colors.error,
  },
});
