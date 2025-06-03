import React, { useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
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
    if (!validateForm()) return;

    setLoading(true);
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
      Alert.alert("Erro no Registo", error.message);
    } else {
      Alert.alert(
        "Registo Efetuado!",
        "Por favor, verifique o seu email para confirmar a conta.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }]
      );
    }
    setLoading(false);
  }

  return (
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
            onChangeText={setFullName}
            error={errors.fullName}
          />

          <Input
            label="Email"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />

          <Input
            label="Confirmar Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            error={errors.confirmPassword}
          />

          <Button
            title="Criar Conta"
            onPress={handleSignUp}
            loading={loading}
            size="large"
            style={styles.signUpButton}
          />

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.linkText}>
              Já tem conta? <Text style={styles.linkTextBold}>Entre aqui</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
});
