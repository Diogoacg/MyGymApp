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
import Toast from "../../components/common/Toast";
import useToast from "../../hooks/useToast";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { globalStyles } from "../../styles/globalStyles";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Hook para toast
  const { toast, showSuccess, showError, hideToast } = useToast();

  function validateForm() {
    const newErrors = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    if (!validateForm()) {
      showError("Por favor, corrija os erros no formulário.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      showSuccess("Login realizado com sucesso!");
    } catch (error) {
      console.error("Login error:", error);

      // Personalizar mensagens de erro
      let errorMessage = "Erro no login. Tente novamente.";

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Email ou password incorretos.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Por favor, confirme seu email antes de fazer login.";
      } else if (error.message?.includes("Too many requests")) {
        errorMessage = "Muitas tentativas. Aguarde alguns minutos.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
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

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            <Text style={styles.title}>Minha App Ginásio</Text>
            <Text style={styles.subtitle}>Entre na sua conta</Text>

            <Input
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearError("email");
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
                clearError("password");
              }}
              secureTextEntry
              error={errors.password}
              editable={!loading}
            />

            <Button
              title="Entrar"
              onPress={handleLogin}
              isLoading={loading}
              disabled={loading}
              size="large"
              style={styles.loginButton}
            />

            <TouchableOpacity
              style={[styles.linkButton, loading && styles.disabledLink]}
              onPress={() => !loading && navigation.navigate("SignUp")}
              disabled={loading}
            >
              <Text style={[styles.linkText, loading && styles.disabledText]}>
                Não tem conta?{" "}
                <Text style={styles.linkTextBold}>Registe-se aqui</Text>
              </Text>
            </TouchableOpacity>

            {/* Link para recuperação de password (opcional) */}
            <TouchableOpacity
              style={[
                styles.forgotPasswordButton,
                loading && styles.disabledLink,
              ]}
              onPress={() =>
                !loading && showError("Funcionalidade em desenvolvimento.")
              }
              disabled={loading}
            >
              <Text
                style={[
                  styles.forgotPasswordText,
                  loading && styles.disabledText,
                ]}
              >
                Esqueceu a password?
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
  loginButton: {
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
  forgotPasswordButton: {
    marginTop: 15,
    alignItems: "center",
  },
  forgotPasswordText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    textDecorationLine: "underline",
  },
});
