import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabaseClient";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";
import { globalStyles } from "../styles/globalStyles";

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [waterIntake, setWaterIntake] = useState(0);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(0);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  async function loadDashboardData() {
    setLoading(true);
    await Promise.all([getUser(), getTodayWaterIntake(), getWeeklyWorkouts()]);
    setLoading(false);
  }

  async function getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
  }

  async function getTodayWaterIntake() {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("water_intake_logs")
      .select("amount_ml")
      .eq("date", today);

    if (!error && data) {
      const total = data.reduce((sum, log) => sum + log.amount_ml, 0);
      setWaterIntake(total);
    }
  }

  async function getWeeklyWorkouts() {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startDate = startOfWeek.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("workouts")
      .select("id")
      .gte("date", startDate);

    if (!error && data) {
      setWeeklyWorkouts(data.length);
    }
  }

  const quickAddWater = async (amount) => {
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("water_intake_logs")
      .insert([{ date: today, amount_ml: amount }]);

    if (!error) {
      setWaterIntake((prev) => prev + amount);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDashboardData} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Olá,{" "}
          {user?.user_metadata?.full_name?.split(" ")[0] ||
            user?.email?.split("@")[0] ||
            "Utilizador"}
          !
        </Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString("pt-PT", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[globalStyles.card, styles.statCard]}>
          <Ionicons name="water" size={32} color={colors.primary} />
          <Text style={styles.statNumber}>{waterIntake}ml</Text>
          <Text style={styles.statLabel}>Água hoje</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min((waterIntake / 2000) * 100, 100)}%` },
              ]}
            />
          </View>
        </View>

        <View style={[globalStyles.card, styles.statCard]}>
          <Ionicons name="fitness" size={32} color={colors.secondary} />
          <Text style={styles.statNumber}>{weeklyWorkouts}</Text>
          <Text style={styles.statLabel}>Treinos esta semana</Text>
        </View>
      </View>

      <View style={styles.quickWaterActions}>
        <Text style={styles.sectionTitle}>Água Rápida</Text>
        <View style={styles.waterButtons}>
          <TouchableOpacity
            style={styles.waterButton}
            onPress={() => quickAddWater(250)}
          >
            <Text style={styles.waterButtonText}>+250ml</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.waterButton}
            onPress={() => quickAddWater(500)}
          >
            <Text style={styles.waterButtonText}>+500ml</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            navigation.navigate("Workouts", { screen: "AddWorkout" })
          }
        >
          <Ionicons name="add-circle" size={24} color="white" />
          <Text style={styles.actionText}>Novo Treino</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.success }]}
          onPress={() => navigation.navigate("Water")}
        >
          <Ionicons name="water" size={24} color="white" />
          <Text style={styles.actionText}>Registar Água</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.secondary }]}
          onPress={() =>
            navigation.navigate("Workouts", { screen: "WorkoutList" })
          }
        >
          <Ionicons name="list" size={24} color="white" />
          <Text style={styles.actionText}>Ver Treinos</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.white,
    marginBottom: 20,
  },
  greeting: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  date: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: 5,
    textTransform: "capitalize",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 5,
  },
  statNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 10,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 5,
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: colors.gray[200],
    borderRadius: 2,
    marginTop: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  quickWaterActions: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  waterButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  waterButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: "center",
  },
  waterButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  quickActions: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  actionText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    marginLeft: 10,
  },
});
