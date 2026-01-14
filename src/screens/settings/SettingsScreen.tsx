import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors/Colors';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

export const SettingsScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;

  // settings state.
  const [notifications, setNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [loading, setLoading] = useState(false);

  /**
   * Component Initialisation Hook
   * 
   * - loads user settings from Firestore when component mounts.
   */
  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * Load Settings
   * 
   * - retrieves user preferences from Firestore.
   */
  const loadSettings = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // default to true if field doesn't exist or is undefined.
        setNotifications(data.notifications !== false);
        setTaskReminders(data.taskReminders !== false);
        setAutoSync(data.autoSync !== false);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  /**
   * Handle Notifications Toggle
   * 
   * - updates push notification preference in Firestore.
   */
  const handleNotificationsToggle = async (value: boolean) => {
    setNotifications(value);
    
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { notifications: value });
    } catch (error) {
      console.log('Error updating notifications:', error);
    }
  };

  /**
   * Handle Task Reminders Toggle
   * 
   * - updates task reminder preference in Firestore.
   */
  const handleTaskRemindersToggle = async (value: boolean) => {
    setTaskReminders(value);
    
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { taskReminders: value });
    } catch (error) {
      console.log('Error updating task reminders:', error);
    }
  };

  /**
   * Handle Auto-Sync Toggle
   * 
   * - updates auto-sync preference in Firestore.
   */
  const handleAutoSyncToggle = async (value: boolean) => {
    setAutoSync(value);
    
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { autoSync: value });
    } catch (error) {
      console.log('Error updating auto-sync:', error);
    }
  };

  /**
   * Handle Export Data
   * 
   * - exports all user data including tasks, nutrition, fitness stats, and profile.
   * - currently logs data to console - in production would download as JSON file probably.
   */
  const handleExportData = async () => {
    Alert.alert(
      'Export Data',
      'Your data export will include all tasks, nutrition tracking, fitness stats, and user information.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setLoading(true);
            try {
              const user = auth.currentUser;
              if (!user) return;

              // collect all user data from different Firestore collections.
              const userData = await getDoc(doc(db, 'users', user.uid));
              const tasksSnapshot = await getDocs(query(collection(db, 'tasks'), where('userId', '==', user.uid)));
              const nutritionData = await getDoc(doc(db, 'nutritionData', user.uid));
              const fitnessData = await getDoc(doc(db, 'fitnessStats', user.uid));

              // compile all data into single export object.
              const exportData = {
                user: userData.data(),
                tasks: tasksSnapshot.docs.map(d => d.data()),
                nutrition: nutritionData.data(),
                fitness: fitnessData.data(),
                exportDate: new Date().toISOString()
              };

              console.log('Exported data:', exportData);
              Alert.alert('Success', 'Your data has been exported! Check the console for details.');
            } catch (error) {
              console.log('Error exporting data:', error);
              Alert.alert('Error', 'Failed to export data');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  /**
   * Handle Clear All Data
   * 
   * - permanently deletes all user data but account details.
   * - removes -  tasks, nutrition data, fitness stats, and resets all points.
   * - shows confirmation dialog with warning before deletion.
   */
  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your tasks, nutrition tracking, and fitness data. Your account will remain active. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const user = auth.currentUser;
              if (!user) return;

              // delete all user's tasks from Firestore.
              const tasksSnapshot = await getDocs(query(collection(db, 'tasks'), where('userId', '==', user.uid)));
              for (const taskDoc of tasksSnapshot.docs) {
                await deleteDoc(doc(db, 'tasks', taskDoc.id));
              }

              // delete nutrition data.
              try {
                await deleteDoc(doc(db, 'nutritionData', user.uid));
              } catch (e) {
                console.log('No nutrition data to delete');
              }

              // delete fitness data.
              try {
                await deleteDoc(doc(db, 'fitnessStats', user.uid));
              } catch (e) {
                console.log('No fitness data to delete');
              }

              // reset all user points and statistics to zero.
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                score: 0,
                heartPoints: 0,
                lifetimePoints: 0,
                dailyStreak: 0,
                tasksCompleted: 0
              });

              Alert.alert('Success', 'All your data has been cleared.');
              navigation.navigate('Home');
            } catch (error) {
              console.log('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* back navigation button. */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons 
          name="arrow-back" 
          size={28} 
          color={theme.text} 
        />
      </TouchableOpacity>

      {/* theme toggle button. */}
      <View style={styles.themeToggleContainer}>
        <ThemeToggle />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          SETTINGS
        </Text>

        {/* account section. */}
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#888' : '#666' }]}>
          ACCOUNT
        </Text>

        {/* profile navigation item. */}
        <TouchableOpacity 
          style={[styles.settingItem, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          }]}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.settingLeft}>
            <Ionicons 
              name="person-circle-outline" 
              size={24} 
              color={theme.text} 
            />
            <Text style={[styles.settingText, { color: theme.text }]}>
              Profile
            </Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={isDarkMode ? '#666' : '#999'} 
          />
        </TouchableOpacity>

        {/* notifications section. */}
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#888' : '#666' }]}>
          NOTIFICATIONS
        </Text>

        {/* push notifications toggle. */}
        <View 
          style={[styles.settingItem, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          }]}
        >
          <View style={styles.settingLeft}>
            <Ionicons 
              name="notifications-outline" 
              size={24} 
              color={theme.text} 
            />
            <Text style={[styles.settingText, { color: theme.text }]}>
              Push Notifications
            </Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: '#767577', true: isDarkMode ? '#fff' : '#1a1a1a' }}
            thumbColor={notifications ? (isDarkMode ? '#1a1a1a' : '#fff') : '#f4f3f4'}
            disabled={loading}
          />
        </View>

        {/* task reminders toggle. */}
        <View 
          style={[styles.settingItem, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          }]}
        >
          <View style={styles.settingLeft}>
            <Ionicons 
              name="alarm-outline" 
              size={24} 
              color={theme.text} 
            />
            <Text style={[styles.settingText, { color: theme.text }]}>
              Task Reminders
            </Text>
          </View>
          <Switch
            value={taskReminders}
            onValueChange={handleTaskRemindersToggle}
            trackColor={{ false: '#767577', true: isDarkMode ? '#fff' : '#1a1a1a' }}
            thumbColor={taskReminders ? (isDarkMode ? '#1a1a1a' : '#fff') : '#f4f3f4'}
            disabled={loading}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#888' : '#666' }]}>
          PREFERENCES
        </Text>

        {/* language selection - currently placeholder :( */}
        <TouchableOpacity 
          style={[styles.settingItem, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          }]}
        >
          <View style={styles.settingLeft}>
            <Ionicons 
              name="language-outline" 
              size={24} 
              color={theme.text} 
            />
            <Text style={[styles.settingText, { color: theme.text }]}>
              Language
            </Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={[styles.settingValue, { color: isDarkMode ? '#888' : '#666' }]}>
              English
            </Text>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={isDarkMode ? '#666' : '#999'} 
            />
          </View>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#888' : '#666' }]}>
          DATA
        </Text>

        <View 
          style={[styles.settingItem, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          }]}
        >
          <View style={styles.settingLeft}>
            <Ionicons 
              name="sync-outline" 
              size={24} 
              color={theme.text} 
            />
            <Text style={[styles.settingText, { color: theme.text }]}>
              Auto-Sync
            </Text>
          </View>
          <Switch
            value={autoSync}
            onValueChange={handleAutoSyncToggle}
            trackColor={{ false: '#767577', true: isDarkMode ? '#fff' : '#1a1a1a' }}
            thumbColor={autoSync ? (isDarkMode ? '#1a1a1a' : '#fff') : '#f4f3f4'}
            disabled={loading}
          />
        </View>

        <TouchableOpacity 
          style={[styles.settingItem, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
            opacity: loading ? 0.5 : 1,
          }]}
          onPress={handleExportData}
          disabled={loading}
        >
          <View style={styles.settingLeft}>
            <Ionicons 
              name="download-outline" 
              size={24} 
              color={theme.text} 
            />
            <Text style={[styles.settingText, { color: theme.text }]}>
              Export Data
            </Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={isDarkMode ? '#666' : '#999'} 
          />
        </TouchableOpacity>

        {/* clear all data button. */}
        <TouchableOpacity 
          style={[styles.settingItem, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
            opacity: loading ? 0.5 : 1,
          }]}
          onPress={handleClearAllData}
          disabled={loading}
        >
          <View style={styles.settingLeft}>
            <Ionicons 
              name="trash-outline" 
              size={24} 
              color="#ff4444"
            />
            <Text style={[styles.settingText, { color: '#ff4444' }]}>
              Clear All Data
            </Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={isDarkMode ? '#666' : '#999'} 
          />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#888' : '#666' }]}>
          ABOUT
        </Text>

        {/* app version display.*/}
        <TouchableOpacity 
          style={[styles.settingItem, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          }]}
        >
          <View style={styles.settingLeft}>
            <Ionicons 
              name="information-circle-outline" 
              size={24} 
              color={theme.text} 
            />
            <Text style={[styles.settingText, { color: theme.text }]}>
              App Version
            </Text>
          </View>
          <Text style={[styles.settingValue, { color: isDarkMode ? '#888' : '#666' }]}>
            1.0.0
          </Text>
        </TouchableOpacity>
      </ScrollView>
      
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </View>
  );
};

// style sheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    right: 80,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  themeToggleContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 130,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 15,
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingText: {
    fontSize: 16,
  },
  settingValue: {
    fontSize: 14,
  },
});