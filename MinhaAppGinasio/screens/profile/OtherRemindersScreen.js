import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";

export default function OtherRemindersScreen() {
  const [reminders, setReminders] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: "",
    description: "",
    time: new Date(),
    frequency: "daily", // daily, weekly, custom
    enabled: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    try {
      const savedReminders = await AsyncStorage.getItem("custom_reminders");
      if (savedReminders) {
        setReminders(JSON.parse(savedReminders));
      }
    } catch (error) {
      console.error("Error loading reminders:", error);
    }
  }

  async function saveReminders(updatedReminders) {
    try {
      await AsyncStorage.setItem(
        "custom_reminders",
        JSON.stringify(updatedReminders)
      );
      setReminders(updatedReminders);
    } catch (error) {
      console.error("Error saving reminders:", error);
      Alert.alert("Erro", "Não foi possível guardar os lembretes.");
    }
  }

  async function addReminder() {
    if (!newReminder.title.trim()) {
      Alert.alert("Erro", "Por favor, insira um título para o lembrete.");
      return;
    }

    setLoading(true);
    try {
      const reminder = {
        id: Date.now().toString(),
        ...newReminder,
        title: newReminder.title.trim(),
        description: newReminder.description.trim(),
        createdAt: new Date().toISOString(),
      };

      const updatedReminders = [...reminders, reminder];
      await saveReminders(updatedReminders);

      if (reminder.enabled) {
        await scheduleReminderNotification(reminder);
      }

      setNewReminder({
        title: "",
        description: "",
        time: new Date(),
        frequency: "daily",
        enabled: true,
      });
      setShowAddForm(false);
      Alert.alert("Sucesso", "Lembrete criado com sucesso!");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível criar o lembrete.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleReminder(reminderId) {
    const updatedReminders = reminders.map((reminder) => {
      if (reminder.id === reminderId) {
        const updated = { ...reminder, enabled: !reminder.enabled };

        if (updated.enabled) {
          scheduleReminderNotification(updated);
        } else {
          cancelReminderNotification(reminderId);
        }

        return updated;
      }
      return reminder;
    });

    await saveReminders(updatedReminders);
  }

  async function deleteReminder(reminderId) {
    Alert.alert("Confirmar", "Tem certeza que deseja apagar este lembrete?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          const updatedReminders = reminders.filter((r) => r.id !== reminderId);
          await saveReminders(updatedReminders);
          await cancelReminderNotification(reminderId);
        },
      },
    ]);
  }

  async function scheduleReminderNotification(reminder) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.description || "Lembrete personalizado",
          sound: true,
        },
        trigger: {
          hour: reminder.time.getHours(),
          minute: reminder.time.getMinutes(),
          repeats: reminder.frequency === "daily",
        },
        identifier: `reminder_${reminder.id}`,
      });
    } catch (error) {
      console.error("Error scheduling notification:", error);
    }
  }

  async function cancelReminderNotification(reminderId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        `reminder_${reminderId}`
      );
    } catch (error) {
      console.error("Error canceling notification:", error);
    }
  }

  const formatTime = (timeString) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const frequencyLabels = {
    daily: "Diário",
    weekly: "Semanal",
    custom: "Personalizado",
  };

  const renderReminder = ({ item }) => (
    <View style={[globalStyles.card, styles.reminderCard]}>
      <View style={styles.reminderHeader}>
        <View style={styles.reminderInfo}>
          <Text style={styles.reminderTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.reminderDescription}>{item.description}</Text>
          )}
          <Text style={styles.reminderTime}>
            {formatTime(item.time)} • {frequencyLabels[item.frequency]}
          </Text>
        </View>
        <View style={styles.reminderActions}>
          <TouchableOpacity
            onPress={() => toggleReminder(item.id)}
            style={[
              styles.toggleButton,
              {
                backgroundColor: item.enabled
                  ? colors.success
                  : colors.gray[300],
              },
            ]}
          >
            <Ionicons
              name={item.enabled ? "checkmark" : "close"}
              size={16}
              color={colors.white}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteReminder(item.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderAddForm = () => (
    <View style={[globalStyles.card, styles.addForm]}>
      <Text style={styles.formTitle}>Novo Lembrete</Text>

      <Input
        label="Título"
        placeholder="Ex: Tomar vitaminas"
        value={newReminder.title}
        onChangeText={(value) =>
          setNewReminder((prev) => ({ ...prev, title: value }))
        }
      />

      <Input
        label="Descrição (opcional)"
        placeholder="Detalhes do lembrete..."
        value={newReminder.description}
        onChangeText={(value) =>
          setNewReminder((prev) => ({ ...prev, description: value }))
        }
        multiline
        numberOfLines={2}
      />

      <View style={styles.formButtons}>
        <Button
          title="Cancelar"
          variant="outline"
          onPress={() => setShowAddForm(false)}
          style={styles.formButton}
        />
        <Button
          title="Criar"
          onPress={addReminder}
          loading={loading}
          style={styles.formButton}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title="Novo Lembrete"
          onPress={() => setShowAddForm(true)}
          style={styles.addButton}
        />
      </View>

      {showAddForm && renderAddForm()}

      {reminders.length === 0 && !showAddForm ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="notifications-outline"
            size={64}
            color={colors.gray[400]}
          />
          <Text style={styles.emptyTitle}>Nenhum lembrete criado</Text>
          <Text style={styles.emptySubtitle}>
            Crie lembretes personalizados para suplementos, medicamentos ou
            outras atividades
          </Text>
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  addButton: {
    marginBottom: 10,
  },
  addForm: {
    margin: 20,
    marginTop: 10,
  },
  formTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 20,
    textAlign: "center",
  },
  formButtons: {
    flexDirection: "row",
    marginTop: 10,
  },
  formButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  reminderCard: {
    marginBottom: 15,
  },
  reminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  reminderDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  reminderTime: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  reminderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  deleteButton: {
    padding: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
