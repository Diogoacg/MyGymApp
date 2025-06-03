import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";

export default function CreatineReminderScreen() {
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dailyDosage, setDailyDosage] = useState("5");
  const [reminderText, setReminderText] = useState("Hora de tomar creatina!");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReminderSettings();
    requestNotificationPermissions();
  }, []);

  async function requestNotificationPermissions() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissões",
        "Para receber lembretes, precisa de ativar as notificações nas definições do dispositivo."
      );
    }
  }

  async function loadReminderSettings() {
    try {
      const settings = await AsyncStorage.getItem("creatine_reminder_settings");
      if (settings) {
        const parsed = JSON.parse(settings);
        setReminderEnabled(parsed.enabled || false);
        setReminderTime(new Date(parsed.time) || new Date());
        setDailyDosage(parsed.dosage || "5");
        setReminderText(parsed.text || "Hora de tomar creatina!");
      }
    } catch (error) {
      console.error("Error loading reminder settings:", error);
    }
  }

  async function saveReminderSettings() {
    setLoading(true);
    try {
      const settings = {
        enabled: reminderEnabled,
        time: reminderTime.toISOString(),
        dosage: dailyDosage,
        text: reminderText,
      };

      await AsyncStorage.setItem(
        "creatine_reminder_settings",
        JSON.stringify(settings)
      );

      if (reminderEnabled) {
        await scheduleNotification();
      } else {
        await cancelNotifications();
      }

      Alert.alert("Sucesso", "Definições de lembrete guardadas!");
    } catch (error) {
      console.error("Error saving reminder settings:", error);
      Alert.alert("Erro", "Não foi possível guardar as definições.");
    } finally {
      setLoading(false);
    }
  }

  async function scheduleNotification() {
    // Cancel existing notifications
    await cancelNotifications();

    if (reminderEnabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Lembrete de Creatina",
          body: `${reminderText} (${dailyDosage}g)`,
          sound: true,
        },
        trigger: {
          hour: reminderTime.getHours(),
          minute: reminderTime.getMinutes(),
          repeats: true,
        },
      });
    }
  }

  async function cancelNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setReminderTime(selectedTime);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={[globalStyles.card, styles.reminderCard]}>
        <View style={styles.header}>
          <Ionicons name="alarm" size={32} color={colors.primary} />
          <Text style={styles.title}>Lembrete de Creatina</Text>
        </View>

        <Text style={styles.description}>
          Configure um lembrete diário para tomar creatina e manter a
          consistência.
        </Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Ativar Lembrete</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ false: colors.gray[300], true: colors.primary }}
            thumbColor={reminderEnabled ? colors.white : colors.gray[100]}
          />
        </View>

        {reminderEnabled && (
          <>
            <View style={styles.timeSection}>
              <Text style={styles.sectionTitle}>Horário</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons
                  name="time-outline"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.timeText}>{formatTime(reminderTime)}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.gray[400]}
                />
              </TouchableOpacity>
            </View>

            <Input
              label="Dosagem Diária (gramas)"
              placeholder="5"
              value={dailyDosage}
              onChangeText={setDailyDosage}
              keyboardType="numeric"
            />

            <Input
              label="Texto do Lembrete"
              placeholder="Hora de tomar creatina!"
              value={reminderText}
              onChangeText={setReminderText}
              multiline
              numberOfLines={2}
            />
          </>
        )}

        {showTimePicker && (
          <DateTimePicker
            value={reminderTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={onTimeChange}
          />
        )}
      </View>

      {reminderEnabled && (
        <View style={[globalStyles.card, styles.infoCard]}>
          <Text style={styles.infoTitle}>Sobre a Creatina</Text>
          <Text style={styles.infoText}>
            • A creatina é mais eficaz quando tomada consistentemente{"\n"}• A
            dosagem recomendada é de 3-5g por dia{"\n"}• Pode ser tomada a
            qualquer hora do dia{"\n"}• Beba bastante água quando tomar creatina
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title="Guardar Definições"
          onPress={saveReminderSettings}
          loading={loading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  reminderCard: {
    marginBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 10,
  },
  description: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  timeSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 10,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  timeText: {
    flex: 1,
    fontSize: typography.sizes.lg,
    color: colors.text,
    marginLeft: 10,
    fontWeight: typography.weights.medium,
  },
  infoCard: {
    marginBottom: 20,
    backgroundColor: colors.primary + "10",
  },
  infoTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: 10,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: 40,
  },
});
