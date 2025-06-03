import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import WorkoutListScreen from "../screens/workouts/WorkoutListScreen";
import AddWorkoutScreen from "../screens/workouts/AddWorkoutScreen";
import WorkoutDetailScreen from "../screens/workouts/WorkoutDetailScreen";
import EditExerciseScreen from "../screens/workouts/EditExerciseScreen";
import { colors } from "../styles/colors";

const Stack = createStackNavigator();

export default function WorkoutsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary || "#007AFF",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="WorkoutList"
        component={WorkoutListScreen}
        options={{ title: "Meus Treinos" }}
      />
      <Stack.Screen
        name="AddWorkout"
        component={AddWorkoutScreen}
        options={{ title: "Novo Treino" }}
      />
      <Stack.Screen
        name="WorkoutDetail"
        component={WorkoutDetailScreen}
        options={{ title: "Detalhes do Treino" }}
      />
      <Stack.Screen
        name="EditExercise"
        component={EditExerciseScreen}
        options={{ title: "Editar Exercício" }}
      />
    </Stack.Navigator>
  );
}
