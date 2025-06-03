import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import DashboardScreen from "../screens/DashboardScreen";
import WaterTrackingScreen from "../screens/WaterTrackingScreen";
import WorkoutsNavigator from "./WorkoutsNavigator";
import ProfileNavigator from "./ProfileNavigator";
import { colors } from "../styles/colors";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Workouts") {
            iconName = focused ? "fitness" : "fitness-outline";
          } else if (route.name === "Water") {
            iconName = focused ? "water" : "water-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary || "#007AFF",
        tabBarInactiveTintColor: "gray",
        headerShown: false, // Remover header duplo
        tabBarStyle: {
          backgroundColor: colors.surface || "#fff",
          borderTopColor: colors.border || "#e0e0e0",
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Início" }}
      />
      <Tab.Screen
        name="Workouts"
        component={WorkoutsNavigator}
        options={{ title: "Treinos" }}
      />
      <Tab.Screen
        name="Water"
        component={WaterTrackingScreen}
        options={{ title: "Água" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ title: "Perfil" }}
      />
    </Tab.Navigator>
  );
}
