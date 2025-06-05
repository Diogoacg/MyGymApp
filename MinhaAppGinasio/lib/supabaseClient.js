import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Para desenvolvimento local
let supabaseUrl, supabaseAnonKey;

try {
  // Tentar importar do .env (desenvolvimento)
  const env = require("@env");
  supabaseUrl = env.SUPABASE_URL;
  supabaseAnonKey = env.SUPABASE_ANON_KEY;
} catch (error) {
  // Fallback para variáveis de ambiente do build
  supabaseUrl = process.env.SUPABASE_URL;
  supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
}

// Verificação final
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase environment variables missing");
  console.log(
    "Available env vars:",
    Object.keys(process.env).filter((k) => k.includes("SUPA"))
  );
}

export const supabase = createClient(
  supabaseUrl || "fallback_url",
  supabaseAnonKey || "fallback_key",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    // Adicionar headers globais para garantir autorização
    global: {
      headers: {
        "Content-Type": "application/json",
      },
    },
  }
);
