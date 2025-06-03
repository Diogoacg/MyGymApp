import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export default function useWorkouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  console.log("🏋️ useWorkouts hook state:", {
    userId,
    workoutsCount: workouts.length,
    loading,
  });

  // Obter o ID do usuário atual ao montar o componente E escutar mudanças de auth
  useEffect(() => {
    console.log("🆔 useWorkouts: Setting up auth listener...");

    // Get initial session
    const getInitialUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("🆔 Initial session:", {
          hasSession: !!session,
          userId: session?.user?.id,
        });
        if (session?.user) {
          setUserId(session.user.id);
          console.log("✅ Initial userId set to:", session.user.id);
        } else {
          console.log("❌ No initial session found");
          setUserId(null);
        }
      } catch (error) {
        console.error("💥 Error getting initial session:", error);
        setUserId(null);
      }
    };

    getInitialUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state change:", {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
      });
      if (session?.user) {
        setUserId(session.user.id);
        console.log("✅ Auth change - userId set to:", session.user.id);
      } else {
        setUserId(null);
        console.log("❌ Auth change - userId cleared");
      }
    });

    return () => {
      console.log("🧹 Cleaning up auth listener");
      subscription?.unsubscribe();
    };
  }, []);

  const loadWorkouts = useCallback(async () => {
    console.log("📥 loadWorkouts called with userId:", userId);
    setLoading(true);
    try {
      if (!userId) {
        console.log("❌ loadWorkouts: No userId");
        return { error: "Usuário não autenticado" };
      }

      console.log("📡 Fetching workouts for user:", userId);
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
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (error) {
        console.log("❌ Error loading workouts:", error);
        throw error;
      }

      console.log("✅ Workouts loaded:", { count: data?.length || 0 });
      setWorkouts(data || []);
      return { data, error: null };
    } catch (error) {
      console.error("💥 Error loading workouts:", error);
      return { error };
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createWorkout = async (workoutData, exercises) => {
    console.log("➕ createWorkout called:", {
      workoutData,
      exercisesCount: exercises?.length || 0,
    });
    try {
      if (!userId) {
        console.log("❌ createWorkout: No userId");
        return { error: "Usuário não autenticado" };
      }

      // Adicionar user_id aos dados do treino
      const workoutWithUserId = {
        ...workoutData,
        user_id: userId,
      };

      console.log("📤 Inserting workout:", workoutWithUserId);
      // Insert workout
      const { data: workout, error: workoutError } = await supabase
        .from("workouts")
        .insert([workoutWithUserId])
        .select()
        .single();

      if (workoutError) {
        console.log("❌ Error creating workout:", workoutError);
        throw workoutError;
      }

      console.log("✅ Workout created:", {
        id: workout.id,
        name: workout.name,
      });

      // Insert exercises if any
      if (exercises && exercises.length > 0) {
        const exercisesToInsert = exercises.map((exercise) => ({
          ...exercise,
          workout_id: workout.id,
        }));

        console.log("📤 Inserting exercises:", {
          count: exercisesToInsert.length,
        });
        const { error: exercisesError } = await supabase
          .from("exercises")
          .insert(exercisesToInsert);

        if (exercisesError) {
          console.log("❌ Error creating exercises:", exercisesError);
          throw exercisesError;
        }
        console.log("✅ Exercises created");
      }

      console.log("🔄 Refreshing workouts list");
      await loadWorkouts(); // Refresh the list
      return { data: workout, error: null };
    } catch (error) {
      console.error("💥 Error creating workout:", error);
      return { error };
    }
  };
  const deleteWorkout = useCallback(
    async (workoutId) => {
      console.log("🗑️ deleteWorkout hook called with:", { workoutId, userId });

      try {
        if (!userId) {
          console.log("❌ deleteWorkout: No userId available");
          return { error: "Usuário não autenticado" };
        }

        if (!workoutId) {
          console.log("❌ deleteWorkout: No workoutId provided");
          return { error: "ID do treino não fornecido" };
        }

        console.log("🗑️ Step 1: Deleting exercises for workout:", workoutId);

        // Primeiro, apagar os exercícios associados
        const { error: exercisesError } = await supabase
          .from("exercises")
          .delete()
          .eq("workout_id", workoutId);

        if (exercisesError) {
          console.log("❌ Error deleting exercises:", exercisesError);
          return {
            error: exercisesError.message || "Erro ao apagar exercícios",
          };
        }

        console.log("✅ Exercises deleted successfully");

        console.log("🗑️ Step 2: Deleting workout:", workoutId);

        // Depois, apagar o treino
        const { error: workoutError } = await supabase
          .from("workouts")
          .delete()
          .eq("id", workoutId)
          .eq("user_id", userId);

        if (workoutError) {
          console.log("❌ Error deleting workout:", workoutError);
          return { error: workoutError.message || "Erro ao apagar treino" };
        }

        console.log("✅ Workout deleted successfully");

        console.log("🔄 Refreshing workouts list...");

        // Refresh the list
        await loadWorkouts();

        console.log("✅ Delete operation completed successfully");
        return { error: null };
      } catch (error) {
        console.error("💥 Unexpected error in deleteWorkout:", error);
        return { error: error.message || "Erro inesperado ao apagar treino" };
      }
    },
    [userId, loadWorkouts]
  );

  const getWorkoutById = async (workoutId) => {
    console.log("🔍 getWorkoutById called:", { workoutId, userId });
    try {
      if (!userId) {
        console.log("❌ getWorkoutById: No userId");
        return { error: "Usuário não autenticado" };
      }

      console.log("📡 Fetching workout details for:", { workoutId, userId });
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
        .eq("user_id", userId)
        .single();

      if (error) {
        console.log("❌ Error getting workout:", error);
        throw error;
      }

      console.log("✅ Workout details fetched:", {
        id: data.id,
        name: data.name,
        exercisesCount: data.exercises?.length || 0,
      });
      return { data, error: null };
    } catch (error) {
      console.error("💥 Error getting workout:", error);
      return { error };
    }
  };

  useEffect(() => {
    console.log("🔄 useWorkouts effect triggered, userId:", userId);
    if (userId) {
      console.log("📥 Loading workouts for user:", userId);
      loadWorkouts();
    } else {
      console.log("⏳ Waiting for userId to load workouts");
    }
  }, [userId, loadWorkouts]);

  console.log("🏋️ useWorkouts returning:", {
    workoutsCount: workouts.length,
    loading,
    userId: userId || "null",
  });

  return {
    workouts,
    loading,
    loadWorkouts,
    createWorkout,
    deleteWorkout,
    getWorkoutById,
    userId, // Expor userId para debugging
  };
}
