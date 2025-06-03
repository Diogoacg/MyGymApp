import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient"; // Certifique-se que o caminho está correto

export default function useWaterIntake() {
  const [todayIntake, setTodayIntake] = useState(0);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState({
    today: false,
    weekly: false,
    action: false, // Para ações como adicionar ou apagar
  });
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  // Obter o ID do utilizador atual e definir o estado
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Tenta obter a sessão atual primeiro, pode ser mais rápido se já estiver em cache
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (sessionData?.session?.user?.id) {
          setUserId(sessionData.session.user.id);
        } else {
          // Se não houver sessão, tenta obter o utilizador (pode acionar uma busca se não houver sessão)
          const { data: userData, error: userError } =
            await supabase.auth.getUser();
          if (userError) throw userError;
          if (userData?.user) {
            setUserId(userData.user.id);
          } else {
            console.warn(
              "useWaterIntake: Utilizador não autenticado ao inicializar."
            );
            setError({ message: "Utilizador não autenticado." });
          }
        }
      } catch (e) {
        console.error("useWaterIntake: Erro ao obter ID do utilizador:", e);
        setError(e);
      }
    };

    initializeUser();

    // Opcional: Ouvir mudanças no estado de autenticação para atualizar o userId
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id || null);
        if (!session?.user?.id) {
          // Limpar dados se o utilizador fizer logout
          setTodayIntake(0);
          setWeeklyData([]);
          console.warn(
            "useWaterIntake: Sessão terminada ou utilizador deslogado."
          );
        }
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  // Função para buscar o consumo de água do dia atual
  const fetchTodayIntake = useCallback(async () => {
    if (!userId) return;

    setLoading((prev) => ({ ...prev, today: true }));
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error: fetchError } = await supabase
        .from("water_intake_logs")
        .select("amount_ml")
        .eq("user_id", userId)
        .eq("date", today);

      if (fetchError) throw fetchError;

      const total = data?.reduce((sum, log) => sum + log.amount_ml, 0) || 0;
      setTodayIntake(total);
    } catch (e) {
      console.error("Erro ao buscar consumo de hoje:", e);
      setError(e);
    } finally {
      setLoading((prev) => ({ ...prev, today: false }));
    }
  }, [userId]);

  // Função para buscar os dados de consumo de água da semana
  const fetchWeeklyData = useCallback(async () => {
    if (!userId) return;

    setLoading((prev) => ({ ...prev, weekly: true }));
    setError(null);
    try {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data, error: fetchError } = await supabase
        .from("water_intake_logs")
        .select("date, amount_ml")
        .eq("user_id", userId)
        .gte("date", weekAgo.toISOString().split("T")[0])
        .lte("date", today.toISOString().split("T")[0]);
      // .order("date", { ascending: false }); // Opcional: ordenar os dados

      if (fetchError) throw fetchError;

      const groupedData =
        data?.reduce((acc, log) => {
          const date = log.date;
          if (!acc[date]) {
            acc[date] = 0;
          }
          acc[date] += log.amount_ml;
          return acc;
        }, {}) || {};

      const weeklyArray = Object.entries(groupedData)
        .map(([date, amount]) => ({
          date,
          amount,
          // Adicionar o dia da semana formatado
          dayName: new Date(date + "T00:00:00").toLocaleDateString("pt-PT", {
            // Adicionar T00:00:00 para evitar problemas de fuso horário na formatação
            weekday: "short",
          }),
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // Ordenar por data

      setWeeklyData(weeklyArray);
    } catch (e) {
      console.error("Erro ao buscar dados semanais:", e);
      setError(e);
    } finally {
      setLoading((prev) => ({ ...prev, weekly: false }));
    }
  }, [userId]);

  // Efeito para carregar dados quando o userId estiver disponível ou mudar
  useEffect(() => {
    if (userId) {
      fetchTodayIntake();
      fetchWeeklyData();
    }
  }, [userId, fetchTodayIntake, fetchWeeklyData]);

  // Função para adicionar um novo registo de consumo de água
  const addWaterIntake = async (amountMl) => {
    if (!userId) {
      setError({
        message: "Utilizador não autenticado para adicionar registo.",
      });
      return { error: { message: "Utilizador não autenticado." } };
    }
    if (amountMl <= 0) {
      setError({ message: "A quantidade de água deve ser positiva." });
      return { error: { message: "A quantidade de água deve ser positiva." } };
    }

    setLoading((prev) => ({ ...prev, action: true }));
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const waterLogData = {
        user_id: userId,
        date: today,
        amount_ml: amountMl,
        // logged_at é DEFAULT NOW() na BD
      };

      console.log("Tentando inserir registo de água:", waterLogData);

      const { data: insertedData, error: insertError } = await supabase
        .from("water_intake_logs")
        .insert([waterLogData])
        .select() // Retorna os dados inseridos
        .single(); // Espera-se um único registo

      if (insertError) {
        console.error(
          "Erro detalhado na inserção Supabase:",
          JSON.stringify(insertError, null, 2)
        );
        throw insertError;
      }

      console.log("Registo de água inserido:", insertedData);

      // Atualizar os dados locais
      await fetchTodayIntake();
      await fetchWeeklyData(); // Pode ser otimizado para apenas atualizar o dia atual nos dados semanais

      return { data: insertedData, error: null };
    } catch (e) {
      console.error("Erro ao adicionar consumo de água:", e);
      setError(e);
      return { error: e };
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  // Função para apagar um registo de consumo de água
  // Nota: Para esta função ser útil, precisaria de uma forma de identificar o `logId`.
  // A sua tabela tem `id UUID DEFAULT uuid_generate_v4() PRIMARY KEY`.
  // Seria necessário buscar os logs com os seus IDs para permitir a exclusão.
  const deleteWaterLog = async (logId) => {
    if (!userId) {
      setError({ message: "Utilizador não autenticado para apagar registo." });
      return { error: { message: "Utilizador não autenticado." } };
    }
    if (!logId) {
      setError({ message: "ID do registo não fornecido para exclusão." });
      return { error: { message: "ID do registo não fornecido." } };
    }

    setLoading((prev) => ({ ...prev, action: true }));
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("water_intake_logs")
        .delete()
        .eq("id", logId)
        .eq("user_id", userId); // Garante que o utilizador só apaga os seus próprios registos

      if (deleteError) throw deleteError;

      // Atualizar os dados locais
      await fetchTodayIntake();
      await fetchWeeklyData();

      return { error: null };
    } catch (e) {
      console.error("Erro ao apagar registo de água:", e);
      setError(e);
      return { error: e };
    } finally {
      setLoading((prev) => ({ ...prev, action: false }));
    }
  };

  return {
    userId, // Expor o userId pode ser útil para o componente
    todayIntake,
    weeklyData,
    loading,
    error,
    fetchTodayIntake, // Expor para refresh manual se necessário
    fetchWeeklyData, // Expor para refresh manual se necessário
    addWaterIntake,
    deleteWaterLog,
  };
}
