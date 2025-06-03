import { useState } from "react";

export default function useModal() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: "",
    type: "default",
    content: null,
  });

  const showModal = (modalConfig = {}) => {
    setConfig({
      title: "",
      type: "default",
      content: null,
      ...modalConfig,
    });
    setVisible(true);
  };

  const hideModal = () => {
    setVisible(false);
    // Limpar config após um pequeno delay para não afetar a animação
    setTimeout(() => {
      setConfig({
        title: "",
        type: "default",
        content: null,
      });
    }, 300);
  };

  const showConfirm = ({
    title = "Confirmar",
    message,
    onConfirm,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    type = "warning",
  }) => {
    showModal({
      title,
      type,
      content: {
        type: "confirm",
        message,
        onConfirm: () => {
          hideModal();
          onConfirm?.();
        },
        confirmText,
        cancelText,
      },
    });
  };

  const showSuccess = (title, message) => {
    showModal({
      title,
      type: "success",
      content: { type: "message", message },
    });
  };

  const showError = (title, message) => {
    showModal({
      title,
      type: "error",
      content: { type: "message", message },
    });
  };

  const showWarning = (title, message) => {
    showModal({
      title,
      type: "warning",
      content: { type: "message", message },
    });
  };

  return {
    visible,
    config,
    showModal,
    hideModal,
    showConfirm,
    showSuccess,
    showError,
    showWarning,
  };
}
