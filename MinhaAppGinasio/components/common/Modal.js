import React from "react";
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import Button from "./Button";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function Modal({
  visible = false,
  onClose,
  title,
  type = "default", // 'default', 'success', 'warning', 'error'
  children,
  animationType = "fade",
  transparent = true,
  closable = true,
}) {
  const getIconForType = () => {
    switch (type) {
      case "success":
        return (
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
        );
      case "warning":
        return <Ionicons name="warning" size={24} color={colors.warning} />;
      case "error":
        return <Ionicons name="alert-circle" size={24} color={colors.error} />;
      default:
        return (
          <Ionicons
            name="information-circle"
            size={24}
            color={colors.primary}
          />
        );
    }
  };

  const getHeaderColorForType = () => {
    switch (type) {
      case "success":
        return colors.success;
      case "warning":
        return colors.warning;
      case "error":
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const icon = getIconForType();
  const headerColor = getHeaderColorForType();

  return (
    <RNModal
      visible={visible}
      animationType={animationType}
      transparent={transparent}
      onRequestClose={closable ? onClose : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            {title && (
              <View
                style={[
                  styles.header,
                  { borderBottomColor: colors.gray?.[200] },
                ]}
              >
                <View style={styles.headerContent}>
                  <View style={styles.headerIcon}>{icon}</View>
                  <Text style={[styles.title, { color: headerColor }]}>
                    {title}
                  </Text>
                </View>
                {closable && (
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={colors.gray?.[600]}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={styles.content}>{children}</View>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalContainer: {
    width: "100%",
    maxWidth: Math.min(screenWidth - 40, 400),
    alignItems: "center",
  },
  modal: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    maxHeight: screenHeight * 0.8,
    minHeight: 150,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    backgroundColor: colors.gray?.[25] || "#fafafa",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: typography?.sizes?.lg || 18,
    fontWeight: typography?.weights?.bold || "bold",
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.gray?.[100] || "#f5f5f5",
  },
  content: {
    padding: 24,
    minHeight: 100,
  },
});

// Variações específicas do Modal para diferentes casos de uso
export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title = "Confirmar",
  message,
  children, // Adicionar suporte para conteúdo customizado
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "warning",
  confirmButtonStyle,
  isLoading = false,
}) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      type={type}
      closable={!isLoading}
    >
      <View style={confirmModalStyles.container}>
        {/* Renderizar mensagem ou conteúdo customizado */}
        {children ? (
          children
        ) : (
          <Text style={confirmModalStyles.message}>{message}</Text>
        )}

        <View style={confirmModalStyles.buttons}>
          <Button
            title={cancelText}
            variant="ghost"
            onPress={onClose}
            style={[confirmModalStyles.button, confirmModalStyles.cancelButton]}
            textStyle={confirmModalStyles.cancelButtonText}
            disabled={isLoading}
          />
          <Button
            title={confirmText}
            onPress={onConfirm}
            style={[
              confirmModalStyles.button,
              confirmModalStyles.confirmButton,
              confirmButtonStyle,
              isLoading && confirmModalStyles.disabledButton,
            ]}
            textStyle={confirmModalStyles.confirmButtonText}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </View>
      </View>
    </Modal>
  );
}

const confirmModalStyles = StyleSheet.create({
  container: {
    minHeight: 120,
  },
  message: {
    fontSize: typography?.sizes?.md || 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 32,
    textAlign: "center",
  },
  buttons: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20, // Adicionar margem superior para separar do conteúdo
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    maxWidth: 120,
  },
  cancelButton: {
    backgroundColor: colors.gray?.[100] || "#f5f5f5",
    borderWidth: 1,
    borderColor: colors.gray?.[300] || "#d1d5db",
  },
  cancelButtonText: {
    fontSize: typography?.sizes?.md || 16,
    fontWeight: typography?.weights?.medium || "500",
    color: colors.gray?.[700] || "#374151",
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    fontSize: typography?.sizes?.md || 16,
    fontWeight: typography?.weights?.medium || "500",
    color: colors.white,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
