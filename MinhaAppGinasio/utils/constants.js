export const WATER_GOAL_ML = 2000; // Meta diária de água em ml

export const WORKOUT_TYPES = {
  STRENGTH: "strength",
  CARDIO: "cardio",
  FLEXIBILITY: "flexibility",
  SPORTS: "sports",
};

export const EXERCISE_CATEGORIES = {
  CHEST: "chest",
  BACK: "back",
  SHOULDERS: "shoulders",
  ARMS: "arms",
  LEGS: "legs",
  CORE: "core",
  CARDIO: "cardio",
};

export const REMINDER_FREQUENCIES = {
  DAILY: "daily",
  WEEKLY: "weekly",
  CUSTOM: "custom",
};

export const NOTIFICATION_TYPES = {
  WATER_REMINDER: "water_reminder",
  WORKOUT_REMINDER: "workout_reminder",
  CREATINE_REMINDER: "creatine_reminder",
  CUSTOM_REMINDER: "custom_reminder",
};

export const STORAGE_KEYS = {
  APP_SETTINGS: "app_settings",
  CREATINE_REMINDER: "creatine_reminder_settings",
  CUSTOM_REMINDERS: "custom_reminders",
  WATER_GOAL: "water_goal",
  USER_PREFERENCES: "user_preferences",
};

export const DEFAULT_EXERCISES = [
  "Supino Reto",
  "Supino Inclinado",
  "Flexões",
  "Agachamento",
  "Leg Press",
  "Deadlift",
  "Remada",
  "Pull-ups",
  "Desenvolvimento",
  "Rosca Bíceps",
  "Tríceps Pulley",
  "Abdominais",
];

export const MUSCLE_GROUPS = [
  { key: "chest", label: "Peito" },
  { key: "back", label: "Costas" },
  { key: "shoulders", label: "Ombros" },
  { key: "arms", label: "Braços" },
  { key: "legs", label: "Pernas" },
  { key: "core", label: "Core/Abdómen" },
];

export const WATER_QUICK_AMOUNTS = [250, 500, 750, 1000]; // ml

export const CREATINE_INFO = {
  DAILY_DOSAGE: 5, // gramas
  BENEFITS: [
    "Aumenta a força muscular",
    "Melhora a performance em exercícios de alta intensidade",
    "Acelera a recuperação muscular",
    "Aumenta a massa muscular magra",
  ],
  TIPS: [
    "Tome consistentemente todos os dias",
    "Pode ser tomada a qualquer hora",
    "Beba bastante água",
    "Não é necessário fazer ciclos",
  ],
};
