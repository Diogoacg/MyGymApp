import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NOTIFICATION_TYPES, STORAGE_KEYS } from "./constants";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermissions = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
};

export const scheduleWaterReminder = async (
  times = ["09:00", "12:00", "15:00", "18:00", "21:00"]
) => {
  // Cancel existing water reminders
  await cancelNotificationsByType(NOTIFICATION_TYPES.WATER_REMINDER);

  const notifications = [];

  for (const time of times) {
    const [hours, minutes] = time.split(":").map(Number);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Lembrete de Água 💧",
        body: "Hora de beber água! Mantenha-se hidratado.",
        sound: true,
        data: { type: NOTIFICATION_TYPES.WATER_REMINDER },
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
      },
    });

    notifications.push({
      id: notificationId,
      time,
      type: NOTIFICATION_TYPES.WATER_REMINDER,
    });
  }

  // Save scheduled notifications
  await saveScheduledNotifications(notifications);
  return notifications;
};

export const scheduleWorkoutReminder = async (
  days = [1, 3, 5],
  time = "18:00"
) => {
  // Cancel existing workout reminders
  await cancelNotificationsByType(NOTIFICATION_TYPES.WORKOUT_REMINDER);

  const [hours, minutes] = time.split(":").map(Number);
  const notifications = [];

  for (const weekday of days) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Hora do Treino! 💪",
        body: "Não esqueça do seu treino hoje. Vamos lá!",
        sound: true,
        data: { type: NOTIFICATION_TYPES.WORKOUT_REMINDER },
      },
      trigger: {
        weekday,
        hour: hours,
        minute: minutes,
        repeats: true,
      },
    });

    notifications.push({
      id: notificationId,
      weekday,
      time,
      type: NOTIFICATION_TYPES.WORKOUT_REMINDER,
    });
  }

  // Save scheduled notifications
  await saveScheduledNotifications(notifications);
  return notifications;
};

export const scheduleCreatineReminder = async (
  time = "09:00",
  dosage = "5g"
) => {
  // Cancel existing creatine reminders
  await cancelNotificationsByType(NOTIFICATION_TYPES.CREATINE_REMINDER);

  const [hours, minutes] = time.split(":").map(Number);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Lembrete de Creatina",
      body: `Hora de tomar creatina! (${dosage})`,
      sound: true,
      data: { type: NOTIFICATION_TYPES.CREATINE_REMINDER },
    },
    trigger: {
      hour: hours,
      minute: minutes,
      repeats: true,
    },
  });

  const notification = {
    id: notificationId,
    time,
    dosage,
    type: NOTIFICATION_TYPES.CREATINE_REMINDER,
  };

  // Save scheduled notification
  await saveScheduledNotifications([notification]);
  return notification;
};

export const scheduleCustomReminder = async (
  title,
  body,
  time,
  frequency = "daily"
) => {
  const [hours, minutes] = time.split(":").map(Number);

  let trigger;
  switch (frequency) {
    case "daily":
      trigger = {
        hour: hours,
        minute: minutes,
        repeats: true,
      };
      break;
    case "weekly":
      trigger = {
        weekday: 1, // Monday
        hour: hours,
        minute: minutes,
        repeats: true,
      };
      break;
    default:
      trigger = {
        hour: hours,
        minute: minutes,
        repeats: true,
      };
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { type: NOTIFICATION_TYPES.CUSTOM_REMINDER },
    },
    trigger,
  });

  const notification = {
    id: notificationId,
    title,
    body,
    time,
    frequency,
    type: NOTIFICATION_TYPES.CUSTOM_REMINDER,
  };

  // Save scheduled notification
  await saveScheduledNotifications([notification]);
  return notification;
};

export const cancelNotificationsByType = async (type) => {
  try {
    const scheduledNotifications = await getScheduledNotifications();
    const notificationsToCancel = scheduledNotifications.filter(
      (n) => n.type === type
    );

    for (const notification of notificationsToCancel) {
      await Notifications.cancelScheduledNotificationAsync(notification.id);
    }

    // Remove from saved notifications
    const remainingNotifications = scheduledNotifications.filter(
      (n) => n.type !== type
    );
    await saveScheduledNotifications(remainingNotifications);

    return notificationsToCancel.length;
  } catch (error) {
    console.error("Error canceling notifications:", error);
    return 0;
  }
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(STORAGE_KEYS.SCHEDULED_NOTIFICATIONS);
};

export const getScheduledNotifications = async () => {
  try {
    const saved = await AsyncStorage.getItem(
      STORAGE_KEYS.SCHEDULED_NOTIFICATIONS
    );
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Error getting scheduled notifications:", error);
    return [];
  }
};

const saveScheduledNotifications = async (notifications) => {
  try {
    const existing = await getScheduledNotifications();
    const updated = [
      ...existing.filter(
        (n) => !notifications.some((newN) => newN.type === n.type)
      ),
      ...notifications,
    ];
    await AsyncStorage.setItem(
      STORAGE_KEYS.SCHEDULED_NOTIFICATIONS,
      JSON.stringify(updated)
    );
  } catch (error) {
    console.error("Error saving scheduled notifications:", error);
  }
};

export const sendInstantNotification = async (title, body) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null, // Send immediately
  });
};

// Notification response handler
export const handleNotificationResponse = (response) => {
  const data = response.notification.request.content.data;

  switch (data?.type) {
    case NOTIFICATION_TYPES.WATER_REMINDER:
      // Navigate to water tracking screen
      console.log("Water reminder tapped");
      break;
    case NOTIFICATION_TYPES.WORKOUT_REMINDER:
      // Navigate to workout screen
      console.log("Workout reminder tapped");
      break;
    case NOTIFICATION_TYPES.CREATINE_REMINDER:
      // Show creatine reminder
      console.log("Creatine reminder tapped");
      break;
    case NOTIFICATION_TYPES.CUSTOM_REMINDER:
      // Handle custom reminder
      console.log("Custom reminder tapped");
      break;
    default:
      console.log("Unknown notification type");
  }
};
