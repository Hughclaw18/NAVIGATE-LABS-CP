import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabase/client';

// Create a context for authentication
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component to wrap application and provide auth functionality
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Effect to check for an existing session on component mount
  useEffect(() => {
    const getSession = async () => {
      try {
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session) {
          const { user } = session;
          setUser(user);
        }
      } catch (error) {
        console.error('Error getting session:', error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Clean up on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Sign up function
  const signUp = async (email, password, username) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0]
          }
        }
      });

      if (error) {
        throw error;
      }

      // If sign up was successful and we have a username, store it in the user_settings table
      if (data && data.user && username) {
        try {
          // First check if a record already exists for this email
          const { data: existingData, error: queryError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_email', email)
            .single();
            
          if (queryError && queryError.code !== 'PGRST116') {
            console.error('Error checking user settings:', queryError);
          }
          
          if (!existingData) {
            // Create a new record if none exists
            const { error: insertError } = await supabase
              .from('user_settings')
              .insert({
                user_email: email,
                user_name: username,
                theme: 'light',
                telegram_enabled: false,
                telegram_token: '',
                telegram_chat_id: '',
                stream_mode: 'rtsp',
              });
              
            if (insertError) {
              console.error('Error storing user settings:', insertError);
            }
          }
        } catch (storageError) {
          console.error('Error in user settings storage:', storageError);
        }
      }

      return data;
    } catch (error) {
      console.error('Error signing up:', error.message);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error signing in:', error.message);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing out:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error resetting password:', error.message);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update password function
  const updatePassword = async (password) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating password:', error.message);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Value object to be provided to consumers of this context
  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
 