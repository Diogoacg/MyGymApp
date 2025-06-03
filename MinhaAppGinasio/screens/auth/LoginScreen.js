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

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    if (!validateForm()) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      Alert.alert("Erro no Login", error.message);
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
          <Text style={styles.title}>Minha App Ginásio</Text>
          <Text style={styles.subtitle}>Entre na sua conta</Text>

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

          <Button
            title="Entrar"
            onPress={handleLogin}
            loading={loading}
            size="large"
            style={styles.loginButton}
          />

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate("SignUp")}
          >
            <Text style={styles.linkText}>
              Não tem conta?{" "}
              <Text style={styles.linkTextBold}>Registe-se aqui</Text>
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
});
