import { WATER_GOAL_ML } from "./constants";

// Formatação de data e hora
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };

  return new Date(date).toLocaleDateString("pt-PT", defaultOptions);
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString("pt-PT", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Cálculos de água
export const calculateWaterProgress = (currentIntake, goal = WATER_GOAL_ML) => {
  return Math.min((currentIntake / goal) * 100, 100);
};

export const getRemainingWater = (currentIntake, goal = WATER_GOAL_ML) => {
  return Math.max(goal - currentIntake, 0);
};

export const getWaterProgressMessage = (
  currentIntake,
  goal = WATER_GOAL_ML
) => {
  const percentage = calculateWaterProgress(currentIntake, goal);

  if (percentage >= 100) {
    return "Parabéns! Meta atingida! 🎉";
  } else if (percentage >= 75) {
    return "Quase lá! Continue assim! 💪";
  } else if (percentage >= 50) {
    return "No bom caminho! 👍";
  } else if (percentage >= 25) {
    return "Vamos beber mais água! 💧";
  } else {
    return "Hora de começar a hidratar! 🚰";
  }
};

// Cálculos de treino
export const calculateWorkoutDuration = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end - start;
  const minutes = Math.floor(durationMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}min`;
  }
  return `${minutes}min`;
};

export const calculateTotalVolume = (exercises) => {
  return exercises.reduce((total, exercise) => {
    if (exercise.sets && exercise.reps && exercise.weight_kg) {
      return total + exercise.sets * exercise.reps * exercise.weight_kg;
    }
    return total;
  }, 0);
};

export const getWorkoutIntensity = (exercises) => {
  if (exercises.length === 0) return "Baixa";

  const avgSets =
    exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0) / exercises.length;
  const avgReps =
    exercises.reduce((sum, ex) => sum + (ex.reps || 0), 0) / exercises.length;

  if (avgSets >= 4 && avgReps >= 12) return "Alta";
  if (avgSets >= 3 && avgReps >= 8) return "Média";
  return "Baixa";
};

// Validações
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateExercise = (exercise) => {
  const errors = {};

  if (!exercise.name?.trim()) {
    errors.name = "Nome do exercício é obrigatório";
  }

  if (exercise.sets && (isNaN(exercise.sets) || exercise.sets <= 0)) {
    errors.sets = "Número de séries deve ser maior que 0";
  }

  if (exercise.reps && (isNaN(exercise.reps) || exercise.reps <= 0)) {
    errors.reps = "Número de repetições deve ser maior que 0";
  }

  if (
    exercise.weight_kg &&
    (isNaN(exercise.weight_kg) || exercise.weight_kg < 0)
  ) {
    errors.weight_kg = "Peso deve ser um número positivo";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Estatísticas
export const getWeeklyStats = (data, valueKey) => {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weeklyData = data.filter((item) => {
    const itemDate = new Date(item.date || item.created_at);
    return itemDate >= weekAgo && itemDate <= today;
  });

  return {
    total: weeklyData.reduce((sum, item) => sum + (item[valueKey] || 0), 0),
    average:
      weeklyData.length > 0
        ? weeklyData.reduce((sum, item) => sum + (item[valueKey] || 0), 0) /
          weeklyData.length
        : 0,
    count: weeklyData.length,
  };
};

export const getMonthlyStats = (data, valueKey) => {
  const today = new Date();
  const monthAgo = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    today.getDate()
  );

  const monthlyData = data.filter((item) => {
    const itemDate = new Date(item.date || item.created_at);
    return itemDate >= monthAgo && itemDate <= today;
  });

  return {
    total: monthlyData.reduce((sum, item) => sum + (item[valueKey] || 0), 0),
    average:
      monthlyData.length > 0
        ? monthlyData.reduce((sum, item) => sum + (item[valueKey] || 0), 0) /
          monthlyData.length
        : 0,
    count: monthlyData.length,
  };
};

// Utilitários gerais
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + "...";
};

export const sortByDate = (array, dateKey = "date", ascending = false) => {
  return [...array].sort((a, b) => {
    const dateA = new Date(a[dateKey]);
    const dateB = new Date(b[dateKey]);
    return ascending ? dateA - dateB : dateB - dateA;
  });
};
