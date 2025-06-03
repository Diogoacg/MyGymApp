import { useState } from "react";

export default function useToast() {
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success",
    duration: 3000,
  });

  const showToast = (message, type = "success", duration = 3000) => {
    setToast({
      visible: true,
      message,
      type,
      duration,
    });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const showSuccess = (message, duration = 3000) => {
    showToast(message, "success", duration);
  };

  const showError = (message, duration = 4000) => {
    showToast(message, "error", duration);
  };

  const showWarning = (message, duration = 3500) => {
    showToast(message, "warning", duration);
  };

  const showInfo = (message, duration = 3000) => {
    showToast(message, "info", duration);
  };

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
