import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/common/Button";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";

export default function WorkoutListScreen({ navigation }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [])
  );

  async function loadWorkouts() {
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
            weight_kg
          )
        `
        )
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar os treinos.");
      console.error("Error loading workouts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteWorkout(workoutId) {
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
            loadWorkouts();
          }
        },
      },
    ]);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  }, []);

  const renderWorkoutItem = ({ item }) => (
    <TouchableOpacity
      style={[globalStyles.card, styles.workoutCard]}
      onPress={() =>
        navigation.navigate("WorkoutDetail", { workoutId: item.id })
      }
    >
      <View style={styles.workoutHeader}>
        <View style={styles.workoutInfo}>
          <Text style={styles.workoutName}>
            {item.name || "Treino sem nome"}
          </Text>
          <Text style={styles.workoutDate}>
            {new Date(item.date).toLocaleDateString("pt-PT", {
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
          onPress={() => deleteWorkout(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title="Novo Treino"
          onPress={() => navigation.navigate("AddWorkout")}
          style={styles.addButton}
        />
      </View>

      {workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={64} color={colors.gray[400]} />
          <Text style={styles.emptyTitle}>Nenhum treino registado</Text>
          <Text style={styles.emptySubtitle}>
            Comece a registar os seus treinos para acompanhar o progresso
          </Text>
          <Button
            title="Criar Primeiro Treino"
            onPress={() => navigation.navigate("AddWorkout")}
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
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textTransform: "capitalize",
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  deleteButton: {
    padding: 5,
  },
  exercisePreview: {
    marginBottom: 10,
  },
  exercisePreviewText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  moreExercises: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
    marginTop: 4,
  },
  workoutNotes: {
    fontSize: typography.sizes.sm,
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
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  firstWorkoutButton: {
    minWidth: 200,
  },
});
