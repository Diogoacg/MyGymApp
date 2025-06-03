import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import ProfileMainScreen from "../screens/profile/ProfileScreen";
import SettingsScreen from "../screens/profile/SettingsScreen";
import CreatineReminderScreen from "../screens/profile/CreatineReminderScreen";
import OtherRemindersScreen from "../screens/profile/OtherRemindersScreen";
import { colors } from "../styles/colors";

const Stack = createStackNavigator();

export default function ProfileNavigator() {
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
        name="ProfileMain"
        component={ProfileMainScreen}
        options={{ title: "Perfil" }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Configurações" }}
      />
      <Stack.Screen
        name="CreatineReminder"
        component={CreatineReminderScreen}
        options={{ title: "Lembrete de Creatina" }}
      />
      <Stack.Screen
        name="OtherReminders"
        component={OtherRemindersScreen}
        options={{ title: "Outros Lembretes" }}
      />
    </Stack.Navigator>
  );
}
