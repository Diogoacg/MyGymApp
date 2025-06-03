import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator, // Adicionado para feedback de loading
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabaseClient";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { globalStyles } from "../styles/globalStyles";
import useWaterIntake from "../hooks/useWaterIntake"; // Importar o hook

export default function WaterTrackingScreen() {
  const {
    userId, // Pode ser útil para debug ou outras funcionalidades
    todayIntake,
    weeklyData,
    loading, // Objeto de loading: { today, weekly, action }
    error,
    fetchTodayIntake,
    fetchWeeklyData,
    addWaterIntake,
    deleteWaterLog,
  } = useWaterIntake();

  const [customAmount, setCustomAmount] = useState("");
  const [todayLogs, setTodayLogs] = useState([]); // Manter logs diários localmente se o hook não os fornecer

  const dailyGoal = 2000; // ml

  // Função para carregar/recarregar todos os dados
  const loadAllWaterData = async () => {
    // O hook já carrega os dados iniciais no useEffect quando o userId está disponível.
    // Esta função pode ser usada para o RefreshControl.
    if (userId) {
      // As funções fetch do hook já gerem o seu próprio estado de loading.
      await Promise.all([
        fetchTodayIntake(),
        fetchWeeklyData(),
        getTodayLogsForScreen(),
      ]);
    }
  };

  // O hook lida com o carregamento inicial, mas podemos querer recarregar com RefreshControl
  useEffect(() => {
    if (userId) {
      getTodayLogsForScreen(); // Carregar os logs detalhados para exibição
    }
  }, [userId, todayIntake]); // Recarregar logs se o userId ou todayIntake mudar

  // Função para buscar os logs detalhados do dia para exibição na tela
  // O hook useWaterIntake foca-se nos totais, esta função busca os itens individuais para a lista.
  async function getTodayLogsForScreen() {
    if (!userId) return;
    // setLoading(true); // O hook tem seu próprio loading, mas podemos ter um para esta operação específica
    try {
      const todayDate = new Date().toISOString().split("T")[0];
      const { data, error: fetchError } = await supabase // supabase ainda é necessário para esta query específica
        .from("water_intake_logs")
        .select("*") // Selecionar todos os campos para a lista de logs
        .eq("user_id", userId)
        .eq("date", todayDate)
        .order("logged_at", { ascending: false });

      if (fetchError) throw fetchError;

      if (data) {
        setTodayLogs(data);
      }
    } catch (e) {
      console.error("Erro ao buscar logs detalhados de hoje:", e);
      Alert.alert("Erro", "Não foi possível carregar os registos de hoje.");
    } finally {
      // setLoading(false);
    }
  }

  async function handleLogWater(amount) {
    if (!userId) {
      Alert.alert("Erro", "Utilizador não autenticado.");
      return;
    }
    const result = await addWaterIntake(amount);
    if (result.error) {
      Alert.alert(
        "Erro",
        result.error.message || "Não foi possível registar o consumo de água."
      );
    } else {
      Alert.alert("Sucesso", `${amount}ml de água registados!`);
      getTodayLogsForScreen(); // Atualizar a lista de logs detalhados
    }
  }

  async function handleAddCustomAmount() {
    const amount = parseInt(customAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Erro", "Por favor, insira uma quantidade válida.");
      return;
    }
    await handleLogWater(amount);
    setCustomAmount("");
  }

  async function handleDeleteLog(logId) {
    if (!userId) {
      Alert.alert("Erro", "Utilizador não autenticado.");
      return;
    }
    Alert.alert(
      "Confirmar Exclusão",
      "Tem a certeza que deseja apagar este registo?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            const result = await deleteWaterLog(logId);
            if (result.error) {
              Alert.alert(
                "Erro",
                result.error.message || "Não foi possível apagar o registo."
              );
            } else {
              Alert.alert("Sucesso", "Registo apagado.");
              getTodayLogsForScreen(); // Atualizar a lista de logs detalhados
            }
          },
        },
      ]
    );
  }

  useEffect(() => {
    if (error) {
      Alert.alert(
        "Erro no Hook",
        error.message || "Ocorreu um erro ao processar os dados de água."
      );
    }
  }, [error]);

  const progressPercentage = Math.min((todayIntake / dailyGoal) * 100, 100);

  // Determinar o estado de refresh geral
  const isRefreshing = loading.today || loading.weekly || loading.action;

  if (!userId && loading.today) {
    // Se o userId ainda não estiver definido e o hook estiver a tentar carregar
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          A carregar dados do utilizador...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={loadAllWaterData}
        />
      }
    >
      <View style={[globalStyles.card, styles.progressCard]}>
        <Text style={styles.title}>Consumo de Água Hoje</Text>
        {loading.today && !isRefreshing ? (
          <ActivityIndicator
            style={{ marginVertical: 20 }}
            size="small"
            color={colors.primary}
          />
        ) : (
          <Text style={styles.intakeAmount}>{todayIntake}ml</Text>
        )}
        <Text style={styles.goalText}>Meta: {dailyGoal}ml</Text>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercentage}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(progressPercentage)}%
          </Text>
        </View>
      </View>

      <View style={[globalStyles.card, styles.quickActions]}>
        <Text style={styles.sectionTitle}>Adicionar Água</Text>

        <View style={styles.quickButtons}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleLogWater(250)}
            disabled={loading.action}
          >
            <Ionicons name="water" size={24} color={colors.white} />
            <Text style={styles.quickButtonText}>250ml</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleLogWater(500)}
            disabled={loading.action}
          >
            <Ionicons name="water" size={24} color={colors.white} />
            <Text style={styles.quickButtonText}>500ml</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleLogWater(750)}
            disabled={loading.action}
          >
            <Ionicons name="water" size={24} color={colors.white} />
            <Text style={styles.quickButtonText}>750ml</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.customAmountContainer}>
          <Input
            placeholder="Quantidade personalizada (ml)"
            value={customAmount}
            onChangeText={setCustomAmount}
            keyboardType="numeric"
            style={styles.customInput}
            editable={!loading.action}
          />
          <Button
            title="Adicionar"
            onPress={handleAddCustomAmount}
            size="medium"
            style={styles.addButton}
            isLoading={loading.action} // Adicionar estado de loading ao botão
            disabled={loading.action}
          />
        </View>
      </View>

      {loading.weekly && weeklyData.length === 0 ? (
        <View style={[globalStyles.card, styles.centered, { minHeight: 150 }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>A carregar dados semanais...</Text>
        </View>
      ) : (
        weeklyData.length > 0 && (
          <View style={[globalStyles.card, styles.weeklyChart]}>
            <Text style={styles.sectionTitle}>Esta Semana</Text>
            <View style={styles.chartContainer}>
              {weeklyData.map((day, index) => (
                <View key={index} style={styles.dayColumn}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max((day.amount / dailyGoal) * 100, 5) }, // Garante altura mínima
                      ]}
                    />
                  </View>
                  <Text style={styles.dayLabel}>{day.dayName}</Text>
                  <Text style={styles.dayAmount}>{day.amount}ml</Text>
                </View>
              ))}
            </View>
          </View>
        )
      )}

      {/* Exibir logs detalhados de hoje */}
      {/* Adicionar um indicador de loading para os logs detalhados se necessário */}
      {todayLogs.length > 0 && (
        <View style={[globalStyles.card, styles.logsContainer]}>
          <Text style={styles.sectionTitle}>Registos de Hoje</Text>
          {todayLogs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logInfo}>
                <Text style={styles.logAmount}>{log.amount_ml}ml</Text>
                <Text style={styles.logTime}>
                  {new Date(log.logged_at).toLocaleTimeString("pt-PT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteLog(log.id)}
                style={styles.deleteButton}
                disabled={loading.action}
              >
                {loading.action && (
                  <ActivityIndicator size="small" color={colors.error} />
                )}
                {!loading.action && (
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.error}
                  />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  progressCard: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: typography.sizes.xl, // Aumentado
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 10,
  },
  intakeAmount: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginVertical: 5, // Adicionado espaço
  },
  goalText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  progressBar: {
    flex: 1,
    height: 10, // Aumentado
    backgroundColor: colors.gray[200],
    borderRadius: 5, // Aumentado
    marginRight: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 5, // Aumentado
  },
  progressText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    minWidth: 40, // Aumentado
  },
  quickActions: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 15,
  },
  quickButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  quickButton: {
    backgroundColor: colors.primary,
    flex: 1,
    alignItems: "center",
    paddingVertical: 15, // Ajustado
    paddingHorizontal: 10,
    borderRadius: 8,
    marginHorizontal: 5,
    minHeight: 80, // Altura mínima para consistência
    justifyContent: "center",
  },
  quickButtonText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginTop: 5,
  },
  customAmountContainer: {
    flexDirection: "row",
    alignItems: "center", // Alinhar itens verticalmente
  },
  customInput: {
    flex: 1,
    marginRight: 10,
    // marginBottom: 0, // Removido para alinhar com o botão
  },
  addButton: {
    // minWidth: 100, // Ajustado
    paddingHorizontal: 20, // Adicionado para melhor toque
  },
  weeklyChart: {
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 150, // Altura do container do gráfico
    paddingTop: 10, // Espaço para os valores não cortarem
  },
  dayColumn: {
    alignItems: "center",
    flex: 1,
  },
  barContainer: {
    height: 100, // Altura máxima da barra
    width: "80%", // Largura relativa da barra
    maxWidth: 25, // Largura máxima da barra
    justifyContent: "flex-end",
    backgroundColor: colors.gray[100], // Fundo da barra
    borderRadius: 3,
    marginBottom: 5,
    overflow: "hidden", // Para garantir que o preenchimento não exceda
  },
  bar: {
    backgroundColor: colors.primary,
    width: "100%", // Barra preenche o barContainer
    // height é dinâmico
    // borderRadius: 2, // Removido, o borderRadius do container é suficiente
  },
  dayLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dayAmount: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  logsContainer: {
    marginBottom: 20,
  },
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12, // Aumentado
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  logInfo: {
    flex: 1,
  },
  logAmount: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  logTime: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 8, // Aumentado para melhor toque
    marginLeft: 10,
  },
});
