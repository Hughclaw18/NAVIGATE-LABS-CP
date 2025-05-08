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

  // Load settings from Supabase when the user changes
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      
      if (user && user.email) {
        try {
          console.log(`Loading settings for user: ${user.email}`);

          // Try to get user settings from Supabase
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_email', user.email)
            .single();
          
          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching settings:', error);
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
              telegramToken: data.telegram_token || defaultSettings.telegramToken,
              telegramChatId: data.telegram_chat_id || defaultSettings.telegramChatId,
              streamMode: data.stream_mode || defaultSettings.streamMode,
            };
            
            setSettings(loadedSettings);
            console.log('Settings loaded successfully');
          } else {
            console.log('No settings found, creating new entry with defaults');
            
            // No settings found, create new entry with default settings
            const { error: insertError } = await supabase
              .from('user_settings')
              .insert({
                user_email: user.email,
                user_name: user.user_metadata?.username || '',
                theme: defaultSettings.theme,
                telegram_enabled: defaultSettings.telegramEnabled,
                telegram_token: defaultSettings.telegramToken,
                telegram_chat_id: defaultSettings.telegramChatId,
                stream_mode: defaultSettings.streamMode,
              });
            
            if (insertError) {
              console.error('Error creating settings:', insertError);
            } else {
              console.log('Default settings created in database');
            }
            
            // Use default settings
            setSettings(defaultSettings);
          }
        } catch (err) {
          console.error('Error in settings load:', err);
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

    loadSettings();
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
        }
      } catch (err) {
        console.error('Error saving theme:', err);
      }
    }
  };

  // Update telegram settings
  const setTelegramSettings = async (telegramEnabled, telegramToken = settings.telegramToken, telegramChatId = settings.telegramChatId) => {
    // First update local state immediately for UI responsiveness
    setSettings(prev => ({
      ...prev,
      telegramEnabled,
      telegramToken,
      telegramChatId,
    }));
    
    // Save telegram settings to Supabase if user is logged in
    if (user && user.email) {
      try {
        console.log('Saving Telegram settings to Supabase:', { 
          enabled: telegramEnabled, 
          token: telegramToken ? `${telegramToken.substring(0, 5)}...` : 'empty', 
          chatId: telegramChatId || 'empty'
        });
        
        // Format data for database columns
        const updateData = { 
          telegram_enabled: telegramEnabled,
        };
        
        // Only update token and chatId if they're not empty
        if (telegramToken) {
          updateData.telegram_token = telegramToken;
        }
        
        if (telegramChatId) {
          updateData.telegram_chat_id = telegramChatId;
        }
        
        const { error } = await supabase
          .from('user_settings')
          .update(updateData)
          .eq('user_email', user.email);
        
        if (error) {
          console.error('Error updating telegram settings:', error);
        } else {
          console.log('Telegram settings saved successfully');
        }
      } catch (err) {
        console.error('Error saving telegram settings:', err);
      }
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
        }
      } catch (err) {
        console.error('Error saving stream mode:', err);
      }
    }
  };

  // Value object to be provided to consumers
  const value = {
    settings,
    setTheme,
    setTelegramSettings,
    setStreamMode,
    loading
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}; 