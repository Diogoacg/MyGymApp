import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import Toast from "../../components/common/Toast";
import useModal from "../../hooks/useModal";
import useToast from "../../hooks/useToast";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Hooks para modal e toast
  const { showModal, visible, config, hideModal } = useModal();
  const { toast, showSuccess, showError, hideToast } = useToast();

  function validateForm() {
    const newErrors = {};

    if (!fullName) {
      newErrors.fullName = "Nome completo é obrigatório";
    }

    if (!email) {
      newErrors.email = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email inválido";
    }

    if (!password) {
      newErrors.password = "Password é obrigatória";
    } else if (password.length < 6) {
      newErrors.password = "Password deve ter pelo menos 6 caracteres";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirmação de password é obrigatória";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSignUp() {
    if (!validateForm()) {
      showError("Por favor, corrija os erros no formulário.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Mostrar modal de sucesso
      showModal({
        title: "Registo Efetuado!",
        type: "success",
        content: {
          type: "message",
          message:
            "Por favor, verifique o seu email para confirmar a conta. Após confirmar, poderá fazer login.",
        },
      });
    } catch (error) {
      console.error("Sign up error:", error);
      showError(error.message || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const handleModalClose = () => {
    hideModal();
    if (config.type === "success") {
      navigation.navigate("Login");
    }
  };

  return (
    <>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
        position="top"
      />

      <Modal
        visible={visible}
        onClose={handleModalClose}
        title={config.title}
        type={config.type}
      >
        {config.content?.type === "message" && (
          <View style={styles.modalContent}>
            <Text style={styles.modalMessage}>{config.content.message}</Text>
            <Button
              title="OK"
              onPress={handleModalClose}
              style={styles.modalButton}
            />
          </View>
        )}
      </Modal>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>Junte-se à nossa comunidade</Text>

            <Input
              label="Nome Completo"
              placeholder="Seu nome completo"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullName) {
                  setErrors((prev) => ({ ...prev, fullName: null }));
                }
              }}
              error={errors.fullName}
              editable={!loading}
            />

            <Input
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: null }));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              editable={!loading}
            />

            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: null }));
                }
              }}
              secureTextEntry
              error={errors.password}
              editable={!loading}
            />

            <Input
              label="Confirmar Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: null }));
                }
              }}
              secureTextEntry
              error={errors.confirmPassword}
              editable={!loading}
            />

            <Button
              title="Criar Conta"
              onPress={handleSignUp}
              isLoading={loading}
              disabled={loading}
              size="large"
              style={styles.signUpButton}
            />

            <TouchableOpacity
              style={[styles.linkButton, loading && styles.disabledLink]}
              onPress={() => !loading && navigation.navigate("Login")}
              disabled={loading}
            >
              <Text style={[styles.linkText, loading && styles.disabledText]}>
                Já tem conta?{" "}
                <Text style={styles.linkTextBold}>Entre aqui</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  title: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    textAlign: "center",
    marginBottom: 8,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    textAlign: "center",
    marginBottom: 40,
    color: colors.textSecondary,
  },
  signUpButton: {
    marginTop: 20,
  },
  linkButton: {
    marginTop: 30,
    alignItems: "center",
  },
  linkText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  linkTextBold: {
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  disabledLink: {
    opacity: 0.6,
  },
  disabledText: {
    color: colors.gray[400],
  },
  modalContent: {
    alignItems: "center",
  },
  modalMessage: {
    fontSize: typography.sizes.md,
    color: colors.text,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    minWidth: 100,
  },
});
