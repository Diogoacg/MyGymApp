import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function useWorkouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  // Obter o ID do usuário atual ao montar o componente
  useEffect(() => {
    const getUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };
    getUserId();
  }, []);

  const loadWorkouts = async () => {
    setLoading(true);
    try {
      if (!userId) return { error: "Usuário não autenticado" };

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
            notes
          )
        `
        )
        .eq("user_id", userId) // Filtrar por user_id
        .order("date", { ascending: false });

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error("Error loading workouts:", error);
      return { error };
    } finally {
      setLoading(false);
    }
    return { error: null };
  };

  const createWorkout = async (workoutData, exercises) => {
    try {
      if (!userId) return { error: "Usuário não autenticado" };

      // Adicionar user_id aos dados do treino
      const workoutWithUserId = {
        ...workoutData,
        user_id: userId,
      };

      // Insert workout
      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert([workoutWithUserId])
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Insert exercises if any
      if (exercises && exercises.length > 0) {
        const exercisesToInsert = exercises.map((exercise) => ({
          ...exercise,
          workout_id: workout.id,
        }));

        const { error: exercisesError } = await supabase
          .from("exercises")
          .insert(exercisesToInsert);

        if (exercisesError) throw exercisesError;
      }

      await loadWorkouts(); // Refresh the list
      return { data: workout, error: null };
    } catch (error) {
      console.error("Error creating workout:", error);
      return { error };
    }
  };

  const deleteWorkout = async (workoutId) => {
    try {
      if (!userId) return { error: "Usuário não autenticado" };

      const { error } = await supabase
        .from("workouts")
        .delete()
        .eq("id", workoutId)
        .eq("user_id", userId); // Adicionar filtro de user_id

      if (error) throw error;

      await loadWorkouts(); // Refresh the list
      return { error: null };
    } catch (error) {
      console.error("Error deleting workout:", error);
      return { error };
    }
  };

  const getWorkoutById = async (workoutId) => {
    try {
      if (!userId) return { error: "Usuário não autenticado" };

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
        .eq("user_id", userId) // Filtrar por user_id
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Error getting workout:", error);
      return { error };
    }
  };

  useEffect(() => {
    if (userId) {
      loadWorkouts();
    }
  }, [userId]); // Executar quando o userId for obtido

  return {
    workouts,
    loading,
    loadWorkouts,
    createWorkout,
    deleteWorkout,
    getWorkoutById,
  };
}
