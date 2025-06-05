import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient"; // Certifique-se que o caminho está correto

export default function useWorkouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false); // General loading for list operations
  const [userId, setUserId] = useState(null);

  // console.log("🏋️ useWorkouts hook state:", { userId, workoutsCount: workouts.length, loading });

  // Efeito para buscar o userId e ouvir mudanças na autenticação
  useEffect(() => {
    // console.log("🆔 useWorkouts: Setting up auth listener...");
    let isMounted = true;

    const updateUserSessionData = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        // console.log("🆔 Initial session:", { hasSession: !!session, userId: session?.user?.id });
        if (sessionError && isMounted) {
          console.error(
            "useWorkouts: Erro ao obter sessão:",
            sessionError.message
          );
          setUserId(null);
          setWorkouts([]);
          return;
        }
        if (isMounted) {
          const currentUserId = session?.user?.id || null;
          setUserId(currentUserId);
          // console.log("✅ Initial userId set to:", currentUserId);
        }
      } catch (error) {
        console.error("💥 Error getting initial session:", error);
        if (isMounted) setUserId(null);
      }
    };

    updateUserSessionData();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // console.log("🔄 Auth state change:", { event: _event, hasSession: !!session, userId: session?.user?.id });
        if (isMounted) {
          const currentUserId = session?.user?.id || null;
          setUserId(currentUserId);
          // console.log(`✅ Auth change - userId set to: ${currentUserId} on event: ${_event}`);
          if (!currentUserId) {
            setWorkouts([]);
            // console.log("❌ Auth change - workouts cleared");
          }
        }
      }
    );

    return () => {
      // console.log("🧹 Cleaning up auth listener");
      isMounted = false;
      authListener?.subscription?.unsubscribe(); // Correct way to unsubscribe
    };
  }, []);

  const loadWorkouts = useCallback(async () => {
    // console.log("📥 loadWorkouts called with userId:", userId);
    if (!userId) {
      // console.log("❌ loadWorkouts: No userId, clearing workouts.");
      setWorkouts([]);
      return { data: [], error: null };
    }
    setLoading(true);
    try {
      // console.log("📡 Fetching workouts for user:", userId);
      const { data, error } = await supabase
        .from("workouts")
        .select(
          `
          *,
          exercises (
            id,
            name,
            total_sets, 
            exercise_type,
            notes,
            exercise_sets ( 
              id,
              set_number,
              reps,
              weight_kg,
              notes
            )
          )
        `
        )
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (error) {
        console.error("❌ Error loading workouts:", error);
        throw error;
      }

      // Process data for compatibility if needed, or ensure frontend adapts
      const processedData =
        data?.map((workout) => ({
          ...workout,
          exercises:
            workout.exercises?.map((ex) => ({
              ...ex,
              // For WorkoutListScreen compatibility (if it expects these flat properties)
              sets: ex.total_sets,
              reps: ex.exercise_sets?.[0]?.reps || null,
              weight_kg: ex.exercise_sets?.[0]?.weight_kg || null,
              // Keep the detailed sets for WorkoutDetailScreen
              detailed_sets:
                ex.exercise_sets?.sort((a, b) => a.set_number - b.set_number) ||
                [],
            })) || [],
        })) || [];

      // console.log("✅ Workouts loaded:", { count: processedData?.length || 0 });
      setWorkouts(processedData);
      return { data: processedData, error: null };
    } catch (error) {
      console.error("💥 Error in loadWorkouts catch:", error);
      setWorkouts([]);
      return {
        data: [],
        error: { message: error.message || "Erro ao carregar treinos." },
      };
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // useEffect to load workouts when userId changes
  useEffect(() => {
    // console.log("🔄 useWorkouts effect for loading list, userId:", userId);
    if (userId) {
      // console.log("📥 (Effect) Loading workouts for user:", userId);
      loadWorkouts();
    } else {
      // console.log("⏳ (Effect) Waiting for userId, or user logged out, clearing workouts.");
      setWorkouts([]); // Clear workouts if no user
    }
  }, [userId, loadWorkouts]); // loadWorkouts is stable if userId is stable

  const createWorkout = useCallback(
    async (workoutData, exercisesData = []) => {
      // console.log("➕ createWorkout called:", { workoutData, exercisesCount: exercisesData?.length });
      if (!userId) {
        console.error("❌ createWorkout: No userId");
        return {
          error: { message: "Utilizador não autenticado para criar treino." },
        };
      }

      try {
        const workoutToInsert = { ...workoutData, user_id: userId };
        // console.log("📤 Inserting workout:", workoutToInsert);
        const { data: newWorkout, error: workoutError } = await supabase
          .from("workouts")
          .insert([workoutToInsert])
          .select()
          .single();

        if (workoutError) {
          console.error("❌ Error creating workout:", workoutError);
          throw workoutError;
        }
        // console.log("✅ Workout created:", newWorkout);

        if (exercisesData && exercisesData.length > 0) {
          for (const exercise of exercisesData) {
            const exerciseToInsert = {
              workout_id: newWorkout.id,
              user_id: userId, // Important for RLS on exercises table if any
              name: exercise.name,
              total_sets: exercise.sets?.length || 0, // Assuming exercise.sets is an array of set objects
              exercise_type: exercise.type || "strength", // Default or from input
              notes: exercise.notes || "",
            };
            // console.log("📤 Inserting exercise:", exerciseToInsert);
            const { data: createdExercise, error: exerciseInsertError } =
              await supabase
                .from("exercises")
                .insert(exerciseToInsert)
                .select()
                .single();

            if (exerciseInsertError) {
              console.error("❌ Error creating exercise:", exerciseInsertError);
              throw exerciseInsertError; // Or handle more gracefully (e.g., rollback workout)
            }
            // console.log("✅ Exercise created:", createdExercise);

            if (exercise.sets && exercise.sets.length > 0) {
              const setsToInsert = exercise.sets.map((set, index) => ({
                exercise_id: createdExercise.id,
                set_number: set.set_number || index + 1, // Use provided set_number or generate
                reps: set.reps || null,
                weight_kg: set.weight_kg || null,
                notes: set.notes || "",
              }));
              // console.log("📤 Inserting exercise sets:", setsToInsert);
              const { error: setsInsertError } = await supabase
                .from("exercise_sets")
                .insert(setsToInsert);
              if (setsInsertError) {
                console.error(
                  "❌ Error creating exercise sets:",
                  setsInsertError
                );
                throw setsInsertError; // Or handle
              }
              // console.log("✅ Exercise sets created for exercise:", createdExercise.id);
            }
          }
        }
        await loadWorkouts();
        return { data: newWorkout, error: null };
      } catch (error) {
        console.error("💥 Error in createWorkout catch:", error);
        return { error: { message: error.message || "Erro ao criar treino." } };
      }
    },
    [userId, loadWorkouts]
  );

  const deleteWorkout = useCallback(
    async (workoutId) => {
      // console.log("🗑️ deleteWorkout hook called with:", { workoutId, userId });
      if (!userId) {
        console.error("❌ deleteWorkout: No userId available");
        return { error: { message: "Utilizador não autenticado" } };
      }
      if (!workoutId) {
        console.error("❌ deleteWorkout: No workoutId provided");
        return { error: { message: "ID do treino não fornecido" } };
      }

      try {
        // Assuming RLS and CASCADE delete are set up correctly in Supabase for exercises and exercise_sets
        // If not, you'd need to delete exercises and exercise_sets first.
        // For simplicity and if CASCADE is on:
        // console.log("🗑️ Deleting workout (expecting cascade for exercises/sets):", workoutId);
        const { error } = await supabase
          .from("workouts")
          .delete()
          .eq("id", workoutId)
          .eq("user_id", userId); // Ensure user can only delete their own workouts

        if (error) {
          console.error("❌ Error deleting workout:", error);
          throw error;
        }
        // console.log("✅ Workout deleted successfully");
        await loadWorkouts();
        return { error: null };
      } catch (error) {
        console.error("💥 Unexpected error in deleteWorkout:", error);
        return {
          error: {
            message: error.message || "Erro inesperado ao apagar treino",
          },
        };
      }
    },
    [userId, loadWorkouts]
  );

  const getWorkoutById = useCallback(
    async (workoutIdToFetch) => {
      // console.log("🔍 getWorkoutById called:", { workoutIdToFetch, userId });
      if (!userId) {
        console.error("❌ getWorkoutById: No userId");
        return { error: { message: "Utilizador não autenticado." } };
      }
      if (!workoutIdToFetch) {
        console.error("❌ getWorkoutById: No workoutIdToFetch provided.");
        return { error: { message: "ID do treino não fornecido." } };
      }

      try {
        // console.log("📡 Fetching workout details for:", { workoutIdToFetch, userId });
        const { data, error } = await supabase
          .from("workouts")
          .select(
            `
          *,
          exercises (
            id,
            name,
            total_sets,
            exercise_type,
            notes,
            created_at,
            exercise_sets (
              id,
              set_number,
              reps,
              weight_kg,
              notes
            )
          )
        `
          )
          .eq("id", workoutIdToFetch)
          .eq("user_id", userId)
          .single();

        if (error) {
          console.error("❌ Error getting workout by ID:", error);
          throw error;
        }

        if (!data) {
          return { data: null, error: { message: "Treino não encontrado." } };
        }

        const processedData = {
          ...data,
          exercises:
            data.exercises?.map((exercise) => ({
              ...exercise,
              // This 'sets' array is for the detailed view (WorkoutDetailScreen)
              sets:
                exercise.exercise_sets
                  ?.sort((a, b) => a.set_number - b.set_number)
                  .map((set) => ({
                    id: set.id,
                    setNumber: set.set_number, // Ensure this matches what renderExercise expects
                    reps: set.reps,
                    weight_kg: set.weight_kg,
                    notes: set.notes,
                  })) || [],
              // For compatibility if WorkoutListScreen still expects these flat properties
              // total_sets is already there.
            })) || [],
        };
        // console.log("✅ Workout details fetched:", processedData);
        return { data: processedData, error: null };
      } catch (error) {
        console.error("💥 Error in getWorkoutById catch:", error);
        return {
          error: { message: error.message || "Erro ao buscar treino." },
        };
      }
    },
    [userId]
  );

  return {
    workouts,
    loading,
    userId,
    loadWorkouts,
    createWorkout,
    deleteWorkout,
    getWorkoutById,
  };
}
