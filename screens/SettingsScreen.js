import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const colors = {
  primary: '#004b35',
  secondary: '#266b52',
  accent: '#4d8b70',
  background: '#f9f7f3',
  surface: '#ffffff',
  text: '#2d2926',
  textSecondary: '#4d4742',
  error: '#4c1f28',
  success: '#266b52',
};

export default function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    notifications: true,
    autoRefresh: true,
    darkMode: false,
    articleLimit: 50,
    refreshInterval: 15, // minutes
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('mawney_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('mawney_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const handleValueChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultSettings = {
              notifications: true,
              autoRefresh: true,
              darkMode: false,
              articleLimit: 50,
              refreshInterval: 15,
            };
            saveSettings(defaultSettings);
          }
        }
      ]
    );
  };

  const clearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and force a fresh reload of articles. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('mawney_articles');
              await AsyncStorage.removeItem('mawney_todos');
              await AsyncStorage.removeItem('mawney_call_notes');
              Alert.alert('Success', 'Cache cleared successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingDescription}>Receive notifications for new articles and updates</Text>
          </View>
          <Switch
            value={settings.notifications}
            onValueChange={() => handleToggle('notifications')}
            trackColor={{ false: '#767577', true: colors.accent }}
            thumbColor={settings.notifications ? colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Articles</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto Refresh</Text>
            <Text style={styles.settingDescription}>Automatically check for new articles</Text>
          </View>
          <Switch
            value={settings.autoRefresh}
            onValueChange={() => handleToggle('autoRefresh')}
            trackColor={{ false: '#767577', true: colors.accent }}
            thumbColor={settings.autoRefresh ? colors.primary : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Article Limit</Text>
            <Text style={styles.settingDescription}>Maximum articles to load at once</Text>
          </View>
          <View style={styles.valueContainer}>
            <TouchableOpacity
              style={styles.valueButton}
              onPress={() => handleValueChange('articleLimit', Math.max(10, settings.articleLimit - 10))}
            >
              <Text style={styles.valueButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.valueText}>{settings.articleLimit}</Text>
            <TouchableOpacity
              style={styles.valueButton}
              onPress={() => handleValueChange('articleLimit', Math.min(100, settings.articleLimit + 10))}
            >
              <Text style={styles.valueButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Refresh Interval</Text>
            <Text style={styles.settingDescription}>How often to check for new articles (minutes)</Text>
          </View>
          <View style={styles.valueContainer}>
            <TouchableOpacity
              style={styles.valueButton}
              onPress={() => handleValueChange('refreshInterval', Math.max(5, settings.refreshInterval - 5))}
            >
              <Text style={styles.valueButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.valueText}>{settings.refreshInterval}m</Text>
            <TouchableOpacity
              style={styles.valueButton}
              onPress={() => handleValueChange('refreshInterval', Math.min(60, settings.refreshInterval + 5))}
            >
              <Text style={styles.valueButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingDescription}>Switch to dark theme (coming soon)</Text>
          </View>
          <Switch
            value={settings.darkMode}
            onValueChange={() => handleToggle('darkMode')}
            trackColor={{ false: '#767577', true: colors.accent }}
            thumbColor={settings.darkMode ? colors.primary : '#f4f3f4'}
            disabled={true}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={clearCache}>
          <Text style={styles.actionButtonText}>Clear Cache</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.error }]} onPress={resetSettings}>
          <Text style={styles.actionButtonText}>Reset Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>App Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Build</Text>
          <Text style={styles.infoValue}>2025.09.22</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Developer</Text>
          <Text style={styles.infoValue}>Mawney Partners</Text>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent + '30',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent + '20',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent + '10',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueButton: {
    backgroundColor: colors.accent,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: 15,
    minWidth: 40,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: colors.accent,
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent + '10',
  },
  infoLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
