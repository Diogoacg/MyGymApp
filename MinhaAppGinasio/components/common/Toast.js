import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";

const { width } = Dimensions.get("window");

export default function Toast({
  visible,
  message,
  type = "success", // 'success', 'error', 'warning', 'info'
  duration = 3000,
  onHide,
  position = "top", // 'top' ou 'bottom'
}) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Mostrar toast
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: position === "top" ? -100 : 100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  const getToastStyle = () => {
    switch (type) {
      case "success":
        return {
          backgroundColor: colors.success || "#4CAF50",
          borderColor: "#45a049",
        };
      case "error":
        return {
          backgroundColor: colors.error || "#f44336",
          borderColor: "#d32f2f",
        };
      case "warning":
        return {
          backgroundColor: colors.warning || "#ff9800",
          borderColor: "#f57c00",
        };
      case "info":
        return {
          backgroundColor: colors.info || "#2196F3",
          borderColor: "#1976D2",
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "close-circle";
      case "warning":
        return "warning";
      case "info":
        return "information-circle";
      default:
        return "information-circle";
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        position === "top" ? styles.topPosition : styles.bottomPosition,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.toast, getToastStyle()]}
        onPress={hideToast}
        activeOpacity={0.9}
      >
        <Ionicons
          name={getIcon()}
          size={24}
          color="white"
          style={styles.icon}
        />
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
        <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  topPosition: {
    top: 50,
  },
  bottomPosition: {
    bottom: 100,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: "white",
    lineHeight: 20,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});
