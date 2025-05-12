import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../supabase/client';

// Create a context for settings
const SettingsContext = createContext();

// Custom hook to use the settings context
export const useSettings = () => {
  return useContext(SettingsContext);
};

// Provider component for settings functionality
export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Default settings
  const defaultSettings = {
      theme: 'light',
      telegramEnabled: false,
      telegramToken: '',
      telegramChatId: '',
      streamMode: 'rtsp', // Default to RTSP streaming
    };

  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Function to refresh settings from database
  const refreshSettings = async () => {
    if (user && user.email) {
      setLoading(true);
      try {
        await loadSettings();
      } finally {
        setLoading(false);
        setLastRefresh(Date.now());
      }
    }
  };

  // Function to load settings from Supabase
  const loadSettings = async () => {
    if (!user || !user.email) {
      console.log('Cannot load settings - no authenticated user');
      return;
    }

    try {
      console.log(`Loading settings for user email: ${user.email}, id: ${user.id}`);

      // Try to get user settings from Supabase
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_email', user.email)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error('Error fetching settings:', error);
          throw error;
        } else {
          console.log('No settings found for user, creating new entry');
          await createDefaultSettings();
          return;
        }
      }
      
      if (data) {
        console.log('Settings found in database:', {
          theme: data.theme,
          telegram_enabled: data.telegram_enabled,
          telegram_token_present: data.telegram_token ? 'Yes' : 'No',
          telegram_chat_id_present: data.telegram_chat_id ? 'Yes' : 'No',
          stream_mode: data.stream_mode
        });
        
        // User settings found in database
        const loadedSettings = {
          theme: data.theme || defaultSettings.theme,
          telegramEnabled: data.telegram_enabled !== null ? data.telegram_enabled : defaultSettings.telegramEnabled,
          telegramToken: data.telegram_token || '',
          telegramChatId: data.telegram_chat_id || '',
          streamMode: data.stream_mode || defaultSettings.streamMode,
        };
        
        setSettings(loadedSettings);
        console.log('Settings loaded successfully');
      } else {
        await createDefaultSettings();
      }
    } catch (err) {
      console.error('Error in settings load:', err);
    }
  };

  // Function to create default settings in database
  const createDefaultSettings = async () => {
    if (!user || !user.email) {
      console.log('Cannot create settings - no authenticated user');
      return;
    }

    try {
      console.log('Creating default settings in database');
      
      const userInsertData = {
        user_email: user.email,
        user_name: user.user_metadata?.username || '',
        theme: defaultSettings.theme,
        telegram_enabled: defaultSettings.telegramEnabled,
        telegram_token: defaultSettings.telegramToken,
        telegram_chat_id: defaultSettings.telegramChatId,
        stream_mode: defaultSettings.streamMode,
      };

      // Try to add user_id if available
      if (user.id) {
        userInsertData.user_id = user.id;
      }
      
      const { error: insertError } = await supabase
        .from('user_settings')
        .insert(userInsertData);
      
      if (insertError) {
        console.error('Error creating settings:', insertError);
        throw insertError;
      } else {
        console.log('Default settings created in database');
        setSettings(defaultSettings);
      }
    } catch (err) {
      console.error('Error creating default settings:', err);
      throw err;
    }
  };

  // Load settings from Supabase when the user changes
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      
      if (user && user.email) {
        try {
          await loadSettings();
        } catch (err) {
          console.error('Error loading settings:', err);
          // Fall back to defaults if loading fails
          setSettings(defaultSettings);
        }
      } else {
        console.log('No authenticated user, using local theme settings only');
        // No user logged in, use default settings from localStorage for theme
        const savedTheme = localStorage.getItem('appTheme');
        setSettings({
          ...defaultSettings,
          theme: savedTheme || defaultSettings.theme,
        });
      }
      
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  // Save theme to localStorage for non-authenticated users
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    localStorage.setItem('appTheme', settings.theme);
  }, [settings.theme]);

  // Update theme setting
  const setTheme = async (theme) => {
    setSettings(prev => ({ ...prev, theme }));
    
    // Save theme to Supabase if user is logged in
    if (user && user.email) {
      try {
        const { error } = await supabase
          .from('user_settings')
          .update({ theme })
          .eq('user_email', user.email);
        
        if (error) {
          console.error('Error updating theme:', error);
          throw error;
        }
      } catch (err) {
        console.error('Error saving theme:', err);
        throw err;
      }
    }
  };

  // Update telegram settings
  const setTelegramSettings = async (telegramEnabled, telegramToken = '', telegramChatId = '') => {
    // First update local state immediately for UI responsiveness
    setSettings(prev => ({
      ...prev,
      telegramEnabled,
      telegramToken: telegramToken || prev.telegramToken,
      telegramChatId: telegramChatId || prev.telegramChatId,
    }));
    
    // Save telegram settings to Supabase if user is logged in
    if (user && user.email) {
      try {
        console.log('Saving Telegram settings to Supabase:', { 
          enabled: telegramEnabled, 
          token: telegramToken ? `${telegramToken.substring(0, 5)}...` : '[unchanged]', 
          chatId: telegramChatId || '[unchanged]'
        });
        
        // Format data for database columns
        const updateData = { 
          telegram_enabled: telegramEnabled,
        };
        
        // Only update token and chatId if provided
        if (telegramToken !== undefined && telegramToken !== null) {
          updateData.telegram_token = telegramToken;
        }
        
        if (telegramChatId !== undefined && telegramChatId !== null) {
          updateData.telegram_chat_id = telegramChatId;
        }
        
        const { error } = await supabase
          .from('user_settings')
          .update(updateData)
          .eq('user_email', user.email);
        
        if (error) {
          console.error('Error updating telegram settings:', error);
          throw error;
        } else {
          console.log('Telegram settings saved successfully');
          
          // After saving, reload settings to ensure we have latest data
          await loadSettings();
        }
      } catch (err) {
        console.error('Error saving telegram settings:', err);
        throw err;
      }
    } else {
      console.warn('Cannot save Telegram settings - no authenticated user');
    }
  };

  // Update stream mode setting
  const setStreamMode = async (streamMode) => {
    setSettings(prev => ({ ...prev, streamMode }));
    
    // Save stream mode to Supabase if user is logged in
    if (user && user.email) {
      try {
        const { error } = await supabase
          .from('user_settings')
          .update({ stream_mode: streamMode })
          .eq('user_email', user.email);
        
        if (error) {
          console.error('Error updating stream mode:', error);
          throw error;
        }
      } catch (err) {
        console.error('Error saving stream mode:', err);
        throw err;
      }
    }
  };

  // Value object to be provided to consumers
  const value = {
    settings,
    setTheme,
    setTelegramSettings,
    setStreamMode,
    loading,
    refreshSettings,
    lastRefresh
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}; 