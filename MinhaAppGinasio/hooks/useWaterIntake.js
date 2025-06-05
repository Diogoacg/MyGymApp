import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export default function useWaterIntake(onWaterGoalChange) {
  const [userId, setUserId] = useState(null);
  const [todayIntake, setTodayIntake] = useState(0);
  const [weeklyData, setWeeklyData] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [loading, setLoading] = useState({
    today: true,
    weekly: false,
    action: false,
    settings: true,
  });
  const [error, setError] = useState(null);

  console.log("💧 useWaterIntake state:", {
    userId,
    todayIntake,
    dailyGoal,
    loading,
    hasError: !!error,
  });

  // Função para obter a data local no formato YYYY-MM-DD
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Função para obter array de datas da semana atual (Segunda a Domingo)
  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Ajustar para Segunda = 0

    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push({
        date: getLocalDateString(date),
        dayName: date.toLocaleDateString("pt-PT", { weekday: "short" }),
        isToday: getLocalDateString(date) === getLocalDateString(new Date()),
      });
    }

    console.log("📅 Week dates calculated:", weekDates);
    return weekDates;
  };

  // Função para notificar mudanças na meta de água
  const notifyWaterGoalChange = useCallback(
    (newGoal) => {
      console.log("💧 Notifying water goal change:", newGoal);
      if (onWaterGoalChange && typeof onWaterGoalChange === "function") {
        onWaterGoalChange(newGoal);
      }
    },
    [onWaterGoalChange]
  );

  // Obter o ID do utilizador atual
  useEffect(() => {
    console.log("🆔 useWaterIntake: Setting up auth listener...");

    const getInitialUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

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
        setTodayIntake(0);
        setWeeklyData([]);
        setDailyGoal(2000);
        console.log("❌ Auth change - userId cleared");
      }
    });

    return () => {
      console.log("🧹 Cleaning up auth listener");
      subscription?.unsubscribe();
    };
  }, []);

  // Função para buscar configurações do utilizador
  const fetchUserSettings = useCallback(async () => {
    console.log("⚙️ fetchUserSettings called with userId:", userId);

    if (!userId) {
      console.log("❌ fetchUserSettings: No userId");
      return;
    }

    setLoading((prev) => ({ ...prev, settings: true }));

    try {
      console.log("📡 Fetching user settings for water goal");
      const { data, error } = await supabase
        .from("user_settings")
        .select("water_goal_ml, weekly_workout_goal")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Criar configurações padrão se não existirem
          console.log("📝 No settings found, creating default");
          const { data: newSettings, error: createError } = await supabase
            .from("user_settings")
            .insert([
              {
                user_id: userId,
                water_goal_ml: 2000,
                weekly_workout_goal: 3,
                notifications_enabled: true,
                water_reminders_enabled: true,
                workout_reminders_enabled: true,
                dark_mode_enabled: false,
              },
            ])
            .select("water_goal_ml, weekly_workout_goal")
            .single();

          if (createError) {
            throw createError;
          }

          console.log("✅ Default settings created");
          const newGoal = newSettings.water_goal_ml || 2000;
          setDailyGoal(newGoal);
          notifyWaterGoalChange(newGoal);
        } else {
          throw error;
        }
      } else {
        console.log("✅ User settings loaded:", data);
        const newGoal = data.water_goal_ml || 2000;
        setDailyGoal(newGoal);
        notifyWaterGoalChange(newGoal);
      }
    } catch (e) {
      console.error("💥 Error fetching user settings:", e);
      setError(e);
    } finally {
      setLoading((prev) => ({ ...prev, settings: false }));
    }
  }, [userId, notifyWaterGoalChange]);

  // Método para atualizar a meta externamente (chamado quando settings mudam)
  const updateWaterGoal = useCallback(
    (newGoal) => {
      console.log("📝 Updating water goal externally:", newGoal);
      if (newGoal && newGoal !== dailyGoal) {
        setDailyGoal(newGoal);
        notifyWaterGoalChange(newGoal);
      }
    },
    [dailyGoal, notifyWaterGoalChange]
  );

  // Função para buscar o consumo de água do dia atual (baseado na data local)
  const fetchTodayIntake = useCallback(async () => {
    console.log("📅 fetchTodayIntake called with userId:", userId);

    if (!userId) {
      console.log("❌ fetchTodayIntake: No userId");
      return;
    }

    setLoading((prev) => ({ ...prev, today: true }));
    setError(null);

    try {
      const todayDate = getLocalDateString();
      console.log("📡 Fetching water intake for local date:", todayDate);

      const { data, error } = await supabase
        .from("water_intake_logs")
        .select("amount_ml")
        .eq("user_id", userId)
        .eq("date", todayDate);

      if (error) {
        console.log("❌ Error fetching today intake:", error);
        throw error;
      }

      const total = data.reduce((sum, log) => sum + log.amount_ml, 0);
      console.log("✅ Today intake calculated:", {
        total,
        logs: data.length,
        date: todayDate,
      });

      setTodayIntake(total);
    } catch (e) {
      console.error("💥 Error in fetchTodayIntake:", e);
      setError(e);
      setTodayIntake(0);
    } finally {
      setLoading((prev) => ({ ...prev, today: false }));
    }
  }, [userId]);

  // Função para buscar os dados de consumo de água da semana (baseado em datas locais)
  const fetchWeeklyData = useCallback(async () => {
    console.log("📊 fetchWeeklyData called with userId:", userId);

    if (!userId) {
      console.log("❌ fetchWeeklyData: No userId");
      return;
    }

    setLoading((prev) => ({ ...prev, weekly: true }));

    try {
      const weekDates = getWeekDates();
      const dateStrings = weekDates.map((d) => d.date);

      console.log("📡 Fetching weekly data for local dates:", dateStrings);

      const { data, error } = await supabase
        .from("water_intake_logs")
        .select("date, amount_ml")
        .eq("user_id", userId)
        .in("date", dateStrings);

      if (error) {
        console.log("❌ Error fetching weekly data:", error);
        throw error;
      }

      // Agrupar dados por data e calcular totais
      const weeklyTotals = weekDates.map((dayInfo) => {
        const dayLogs = data.filter((log) => log.date === dayInfo.date);
        const total = dayLogs.reduce((sum, log) => sum + log.amount_ml, 0);

        return {
          date: dayInfo.date,
          total,
          dayName: dayInfo.dayName,
          isToday: dayInfo.isToday,
          logsCount: dayLogs.length,
        };
      });

      console.log("✅ Weekly data calculated:", weeklyTotals);
      setWeeklyData(weeklyTotals);
    } catch (e) {
      console.error("💥 Error in fetchWeeklyData:", e);
      setError(e);
      setWeeklyData([]);
    } finally {
      setLoading((prev) => ({ ...prev, weekly: false }));
    }
  }, [userId]);

  // Função para adicionar um novo registo de consumo de água (sempre no dia atual local)
  const addWaterIntake = async (amount) => {
    console.log("💧 addWaterIntake called:", { amount, userId });

    if (!userId) {
      console.log("❌ addWaterIntake: No userId");
      return { error: "Utilizador não autenticado" };
    }

    if (!amount || amount <= 0) {
      console.log("❌ Invalid amount:", amount);
      return { error: "Quantidade inválida" };
    }

    setLoading((prev) => ({ ...prev, action: true }));

    try {
      const todayDate = getLocalDateString();
      const now = new Date();

      console.log("📤 Adding water intake to database for date:", todayDate);
      const { data, error } = await supabase
        .from("water_intake_logs")
        .insert([
          {
            user_id: userId,
            date: todayDate, // Data local
            amount_ml: amount,
            logged_at: now.toISOString(), // Timestamp UTC para ordenação
          },
        ])
        .select()
        .single();

      if (error) {
        console.log("❌ Error adding water intake:", error);
        throw error;
      }

      console.log("✅ Water intake added successfully:", {
        id: data.id,
        date: todayDate,
        amount: amount,
      });

      // Atualizar intake de hoje localmente
      setTodayIntake((prev) => prev + amount);

      // Recarregar dados semanais para atualizar o gráfico
      await fetchWeeklyData();

      return { data, error: null };
    } catch (e) {
      console.error("💥 Error adding water intake:", e);
      return { error: e };
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  // Função para apagar um registo de consumo de água
  const deleteWaterLog = async (logId) => {
    console.log("🗑️ deleteWaterLog called:", logId);

    if (!userId) {
      console.log("❌ deleteWaterLog: No userId");
      return { error: "Utilizador não autenticado" };
    }

    setLoading((prev) => ({ ...prev, action: true }));

    try {
      // Primeiro buscar o log para saber o valor a subtrair
      const { data: logData, error: fetchError } = await supabase
        .from("water_intake_logs")
        .select("amount_ml, date")
        .eq("id", logId)
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        console.log("❌ Error fetching log to delete:", fetchError);
        throw fetchError;
      }

      // Apagar o registo
      const { error } = await supabase
        .from("water_intake_logs")
        .delete()
        .eq("id", logId)
        .eq("user_id", userId);

      if (error) {
        console.log("❌ Error deleting water log:", error);
        throw error;
      }

      console.log("✅ Water log deleted successfully:", {
        id: logId,
        amount: logData.amount_ml,
        date: logData.date,
      });

      // Se o log deletado é de hoje, atualizar o total local
      const todayDate = getLocalDateString();
      if (logData.date === todayDate) {
        setTodayIntake((prev) => Math.max(0, prev - logData.amount_ml));
      }

      // Recarregar dados semanais
      await fetchWeeklyData();

      return { error: null };
    } catch (e) {
      console.error("💥 Error deleting water log:", e);
      return { error: e };
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  // Função para buscar logs detalhados de hoje (para a tela de water tracking)
  const getTodayLogs = useCallback(async () => {
    console.log("📋 getTodayLogs called with userId:", userId);

    if (!userId) {
      console.log("❌ getTodayLogs: No userId");
      return [];
    }

    try {
      const todayDate = getLocalDateString();
      console.log("📡 Fetching today logs for date:", todayDate);

      const { data, error } = await supabase
        .from("water_intake_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("date", todayDate)
        .order("logged_at", { ascending: false });

      if (error) {
        console.log("❌ Error fetching today logs:", error);
        throw error;
      }

      console.log("✅ Today logs fetched:", {
        count: data.length,
        date: todayDate,
      });

      return data;
    } catch (e) {
      console.error("💥 Error in getTodayLogs:", e);
      return [];
    }
  }, [userId]);

  // Carregar dados iniciais
  useEffect(() => {
    console.log("🔄 useWaterIntake effect triggered, userId:", userId);
    if (userId) {
      console.log("📥 Loading water data for user:", userId);
      fetchTodayIntake();
      fetchUserSettings();
      fetchWeeklyData();
    } else {
      console.log("⏳ Waiting for userId to load water data");
    }
  }, [userId, fetchTodayIntake, fetchUserSettings, fetchWeeklyData]);

  console.log("💧 useWaterIntake returning:", {
    loading,
    hasError: !!error,
    todayIntake,
    dailyGoal,
    weeklyDataCount: weeklyData.length,
    userId: userId || "null",
  });

  return {
    userId,
    todayIntake,
    weeklyData,
    dailyGoal,
    loading,
    error,
    fetchTodayIntake,
    fetchWeeklyData,
    fetchUserSettings,
    addWaterIntake,
    deleteWaterLog,
    updateWaterGoal,
    getTodayLogs, // Nova função para logs detalhados
    getLocalDateString, // Expor para uso nas telas
  };
}
