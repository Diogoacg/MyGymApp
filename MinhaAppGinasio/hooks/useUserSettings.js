import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export default function useUserSettings(onSettingsChange) {
  const [settings, setSettings] = useState({
    water_goal_ml: 2000,
    weekly_workout_goal: 3,
    notifications_enabled: true,
    water_reminders_enabled: true,
    workout_reminders_enabled: true,
    dark_mode_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  console.log("⚙️ useUserSettings state:", {
    userId,
    loading,
    hasError: !!error,
    settings,
  });

  // Função para notificar mudanças nas configurações
  const notifySettingsChange = useCallback(
    (newSettings) => {
      console.log("📢 Notifying settings change:", newSettings);
      if (onSettingsChange && typeof onSettingsChange === "function") {
        onSettingsChange(newSettings);
      }
    },
    [onSettingsChange]
  );

  // Obter o ID do utilizador atual
  useEffect(() => {
    console.log("🆔 useUserSettings: Setting up auth listener...");

    const getInitialUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("🆔 Initial session:", {
          hasSession: !!session,
          userId: session?.user?.id,
        });
        if (session?.user) {
          setUserId(session.user.id);
          console.log("✅ Initial userId set to:", session.user.id);
        } else {
          console.log("❌ No initial session found");
          setUserId(null);
        }
      } catch (error) {
        console.error("💥 Error getting initial session:", error);
        setUserId(null);
      }
    };

    getInitialUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state change:", {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
      });
      if (session?.user) {
        setUserId(session.user.id);
        console.log("✅ Auth change - userId set to:", session.user.id);
      } else {
        setUserId(null);
        console.log("❌ Auth change - userId cleared");
      }
    });

    return () => {
      console.log("🧹 Cleaning up auth listener");
      subscription?.unsubscribe();
    };
  }, []);

  const loadSettings = useCallback(async () => {
    console.log("📥 loadSettings called with userId:", userId);

    if (!userId) {
      console.log("❌ loadSettings: No userId");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("📡 Fetching user settings for:", userId);
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // Se não existir registo, criar um com valores padrão
        if (error.code === "PGRST116") {
          console.log("📝 No settings found, creating default settings");
          const defaultSettings = {
            user_id: userId,
            water_goal_ml: 2000,
            weekly_workout_goal: 3,
            notifications_enabled: true,
            water_reminders_enabled: true,
            workout_reminders_enabled: true,
            dark_mode_enabled: false,
          };

          const { data: newSettings, error: createError } = await supabase
            .from("user_settings")
            .insert([defaultSettings])
            .select()
            .single();

          if (createError) {
            console.log("❌ Error creating default settings:", createError);
            throw createError;
          }

          console.log("✅ Default settings created:", newSettings);
          setSettings(newSettings);
          notifySettingsChange(newSettings);
        } else {
          console.log("❌ Error loading settings:", error);
          throw error;
        }
      } else {
        console.log("✅ Settings loaded:", data);
        setSettings(data);
        notifySettingsChange(data);
      }
    } catch (e) {
      console.error("💥 Error in loadSettings:", e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [userId, notifySettingsChange]);

  const updateSetting = async (key, value) => {
    console.log("📝 updateSetting called:", { key, value, userId });

    if (!userId) {
      console.log("❌ updateSetting: No userId");
      return { error: "Utilizador não autenticado" };
    }

    try {
      const updatedSettings = { ...settings, [key]: value };
      console.log("📤 Updating setting in database:", { key, value });

      const { error } = await supabase
        .from("user_settings")
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) {
        console.log("❌ Error updating setting:", error);
        throw error;
      }

      console.log("✅ Setting updated successfully");
      setSettings(updatedSettings);

      // Notificar sobre a mudança imediatamente
      notifySettingsChange(updatedSettings);

      return { error: null };
    } catch (e) {
      console.error("💥 Error updating setting:", e);
      setError(e);
      return { error: e };
    }
  };

  const resetToDefaults = async () => {
    console.log("🔄 resetToDefaults called");

    if (!userId) {
      console.log("❌ resetToDefaults: No userId");
      return { error: "Utilizador não autenticado" };
    }

    try {
      const defaultSettings = {
        water_goal_ml: 2000,
        weekly_workout_goal: 3,
        notifications_enabled: true,
        water_reminders_enabled: true,
        workout_reminders_enabled: true,
        dark_mode_enabled: false,
        updated_at: new Date().toISOString(),
      };

      console.log("📤 Resetting settings to defaults");
      const { error } = await supabase
        .from("user_settings")
        .update(defaultSettings)
        .eq("user_id", userId);

      if (error) {
        console.log("❌ Error resetting settings:", error);
        throw error;
      }

      console.log("✅ Settings reset successfully");
      const newSettings = { ...defaultSettings, user_id: userId };
      setSettings(newSettings);

      // Notificar sobre o reset
      notifySettingsChange(newSettings);

      return { error: null };
    } catch (e) {
      console.error("💥 Error resetting settings:", e);
      setError(e);
      return { error: e };
    }
  };

  const exportSettings = () => {
    console.log("📤 exportSettings called");
    return {
      settings,
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
    };
  };

  useEffect(() => {
    console.log("🔄 useUserSettings effect triggered, userId:", userId);
    if (userId) {
      console.log("📥 Loading settings for user:", userId);
      loadSettings();
    } else {
      console.log("⏳ Waiting for userId to load settings");
    }
  }, [userId, loadSettings]);

  console.log("⚙️ useUserSettings returning:", {
    loading,
    hasError: !!error,
    userId: userId || "null",
  });

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateSetting,
    resetToDefaults,
    exportSettings,
    userId, // Para debugging
  };
}
