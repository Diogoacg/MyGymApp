import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { colors } from "../styles/colors";
import { typography } from "../styles/typography";

// Import screens
import WorkoutListScreen from "../screens/workouts/WorkoutListScreen";
import AddWorkoutScreen from "../screens/workouts/AddWorkoutScreen";
import WorkoutDetailScreen from "../screens/workouts/WorkoutDetailScreen";
import EditExerciseScreen from "../screens/workouts/EditExerciseScreen";
import AddExerciseScreen from "../screens/workouts/AddExerciseScreen";

const Stack = createStackNavigator();

export default function WorkoutsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: typography?.weights?.bold || "bold",
          fontSize: typography?.sizes?.lg || 18,
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="WorkoutList"
        component={WorkoutListScreen}
        options={{
          title: "Meus Treinos",
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="AddWorkout"
        component={AddWorkoutScreen}
        options={{
          title: "Criar Treino",
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="WorkoutDetail"
        component={WorkoutDetailScreen}
        options={{
          title: "Detalhes do Treino",
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="EditExercise"
        component={EditExerciseScreen}
        options={{
          title: "Editar Exercício",
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="AddExercise"
        component={AddExerciseScreen}
        options={{
          title: "Adicionar Exercício",
          headerTitleAlign: "center",
        }}
      />
    </Stack.Navigator>
  );
}
