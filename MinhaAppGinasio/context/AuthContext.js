import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Cria e exporta o contexto
export const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthContext: useEffect started");

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error("AuthContext: Error getting session:", error);
        }
        console.log("AuthContext: getSession result:", session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        console.log("AuthContext: setLoading(false) after getSession");
      })
      .catch((err) => {
        console.error("AuthContext: Exception in getSession:", err);
        setLoading(false); // Ensure loading is set to false even on error
        console.log("AuthContext: setLoading(false) after getSession catch");
      });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(
          "AuthContext: onAuthStateChange event:",
          event,
          "session:",
          session
        );
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle auth events
        if (event === "SIGNED_IN") {
          console.log("User signed in");
        } else if (event === "SIGNED_OUT") {
          console.log("User signed out");
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []); // Array de dependências vazio

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Sign in error:", error);
      return { data: null, error };
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("Sign up error:", error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Sign out error:", error);
      return { error };
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Update profile error:", error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
