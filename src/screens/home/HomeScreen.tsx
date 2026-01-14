import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors/Colors';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { auth, db } from '../../config/firebaseConfig';
import { collection, getDocs, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { usePoints, POINTS_PER_TASK } from '../../contexts/PointsContext';
import * as Location from 'expo-location';

/**
 * Task Data Structure
 * 
 * - represents a users task with completion tracking and repeat settings.
 */
interface Task {
  id: string;
  title: string;
  subtitle: string;
  completed: boolean;
  icon: string;
  userId: string;
  createdAt: string;
  dueDate?: string;
  repeatType: 'DAILY' | 'WEEKLY' | 'CUSTOM';
  lastCompletedDate?: string;
}

/**
 * Weather Data Structure
 * 
 * - contains current weather conditions from OpenWeatherMap API.
 */
interface WeatherData {
  temp: number;
  condition: string;
  description: string;
  icon: string;
}

// OpenWeatherMap API
const WEATHER_API_KEY = 'c27b2966be5ed7c73f5a8243b4ca1689';

/**
 * HomeScreen component.
 * 
 * - main dashboard displaying tasks, weather, points, and pet.
 * - handles task completion tracking with automatic daily and weekly resets.
 * 
 * - live weather display based on user location.
 * - task list with completion and point rewards.
 * - daily streak tracking for recurring tasks.
 * - automatic task reset based on repeat type.
 * - heart points display and management.
 * - pet display placeholder.
 * - navigation to profile, settings, and tasks screens.
 */
export const HomeScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const { heartPoints, dailyStreak, addPoints, incrementTasksCompleted } = usePoints();

  // state management.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  /**
   * Screen Focus Effect
   * 
   * - reloads tasks, checks for task resets, and fetches weather whenever screen is being viewed.
   */
  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
      checkAndResetTasks();
      fetchWeather();
    }, [])
  );

   /**
   * Check and Reset Tasks
   * 
   * - automatically resets tasks based on their repeat type.
   * - daily tasks: reset if last completed on a different day.
   * - weekly tasks: reset if 7 days have passed since completion.
   * - custom tasks: no automatic reset.
   */
  const checkAndResetTasks = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (taskDoc) => {
        const task = taskDoc.data() as Task;
        
        // only check completed tasks that have a completion date.
        if (task.completed && task.lastCompletedDate) {
          const lastCompleted = new Date(task.lastCompletedDate);
          const now = new Date();

          let shouldReset = false;

          // check if daily task needs to be reset.
          if (task.repeatType === 'DAILY') {
            shouldReset = lastCompleted.toDateString() !== now.toDateString();
            // check if weekly task needs to be reset.
          } else if (task.repeatType === 'WEEKLY') {
            const daysDiff = Math.floor((now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));
            shouldReset = daysDiff >= 7;
          }
          // reset task if needed.
          if (shouldReset) {
            await updateDoc(doc(db, 'tasks', taskDoc.id), {
              completed: false,
              lastCompletedDate: null
            });
          }
        }
      });

      await loadTasks();
    } catch (error) {
      console.log('Error checking task resets:', error);
    }
  };

    /**
   * Load Tasks
   * 
   * - fetches all tasks belonging to the current user.
   */
  const loadTasks = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const loadedTasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        loadedTasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      
      setTasks(loadedTasks);
    } catch (error) {
      console.log('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Nav to Settings
   */
  const handleSettings = () => {
    navigation.navigate('Settings');
  };

    /**
   * Nav to Profile
   */
  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  /**
   * Toggle Task Completion Status
   * 
   * - handles task completion/incompletion with the following logic - 
   * - completing task - awards points.
   * - uncompleting task - removes points that were awarded.
   * - updates firestore with new completion status and timestamp.
   */
  const toggleTask = async (taskId: string, task: Task) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const newCompletedStatus = !task.completed;
      
      // update task in Firestore
      await updateDoc(taskRef, {
        completed: newCompletedStatus,
        lastCompletedDate: newCompletedStatus ? new Date().toISOString() : null
      });
      
      // handle points and task counter.
      if (newCompletedStatus) {
        const isDailyTask = task.repeatType === 'DAILY';
        await addPoints(POINTS_PER_TASK, isDailyTask);
        await incrementTasksCompleted();
      } else {
        const pointsToRemove = POINTS_PER_TASK;
        await addPoints(-pointsToRemove, false);
      }
      
      // update local state to reflect the change
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, completed: newCompletedStatus, lastCompletedDate: newCompletedStatus ? new Date().toISOString() : undefined } : t
      ));
    } catch (error) {
      console.log('Error updating task:', error);
    }
  };

  // calculate the number of incomplete tasks
  const tasksRemaining = tasks.filter(t => !t.completed).length;

   /**
   * Fetch Weather
   * 
   * - gets users current location and fetches weather from OpenWeatherMap API.
   * - requires location permission from user.
   * - updates weather state with temperature, condition, and icon.
   */
  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      // request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        setWeatherLoading(false);
        return;
      }

      // get current location coords
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // fetch the weather data from api 
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
      );

      if (!response.ok) {
        throw new Error('Weather fetch failed');
      }

      const data = await response.json();

      // update weather state
      setWeather({
        temp: Math.round(data.main.temp),
        condition: data.weather[0].main,
        description: data.weather[0].description,
        icon: getWeatherIcon(data.weather[0].main),
      });
    } catch (error) {
      console.log('Error fetching weather:', error);
    } finally {
      setWeatherLoading(false);
    }
  };

  /**
   * Get Weather Icons
   * 
   * - gets the weather icons that match the weather conditions

   */
  const getWeatherIcon = (condition: string): string => {
    const icons: { [key: string]: string } = {
      'Clear': 'sunny',
      'Clouds': 'cloudy',
      'Rain': 'rainy',
      'Drizzle': 'rainy',
      'Thunderstorm': 'thunderstorm',
      'Snow': 'snow',
      'Mist': 'cloud',
      'Fog': 'cloud',
    };
    return icons[condition] || 'partly-sunny';
  };

    /**
   * Get Weather Suggestion
   * 
   * - provides suggestions for what to do based on current weather.
   */
  const getWeatherSuggestion = (): string => {
    if (!weather) return '';

    const suggestions: { [key: string]: string } = {
      'Clear': 'Perfect day for outdoor activities!',
      'Clouds': 'Great weather for a walk!',
      'Rain': 'Lets stay inside!',
      'Drizzle': 'Light rain, great for indoor activities!',
      'Thunderstorm': 'Perfect weather to read a book!',
      'Snow': 'Bundle up or stay cozy indoors!',
      'Mist': 'Why not do some baking?',
      'Fog': 'Indoor tasks recommended!',
    };

    return suggestions[weather.condition] || 'Great day to be productive!';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* floating theme toggle button. */}
      <ThemeToggle />
      
      {/* heart points display. */}
      <View style={styles.currencyContainer}>
        <View style={[styles.currencyBox, {
          backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8',
        }]}>
          <Ionicons 
            name="heart" 
            size={24} 
            color="#e74c3c"
          />
          <Text style={[styles.pointsText, { color: theme.text }]}>
            {heartPoints}
          </Text>
        </View>
      </View>

      {/* profile and settings buttons. */}
      <View style={styles.topRightIcons}>
        <TouchableOpacity 
          style={[styles.iconButton, { backgroundColor: 'rgba(128, 128, 128, 0.2)' }]}
          onPress={handleProfile}
        >
          <Ionicons 
            name="person-circle" 
            size={28} 
            color={theme.text} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.iconButton, { backgroundColor: 'rgba(128, 128, 128, 0.2)' }]}
          onPress={handleSettings}
        >
          <Ionicons 
            name="settings" 
            size={28} 
            color={theme.text} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* weather card - shows current weather and activity suggestion. */}
        {weather && (
          <View style={[styles.weatherCard, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          }]}>
            <View style={styles.weatherHeader}>
              <Ionicons 
                name={weather.icon as any}
                size={50} 
                color={isDarkMode ? '#fff' : '#1a1a1a'} 
              />
              <View style={styles.weatherInfo}>
                <Text style={[styles.weatherTemp, { color: theme.text }]}>
                  {weather.temp}°C
                </Text>
                <Text style={[styles.weatherCondition, { color: isDarkMode ? '#888' : '#666' }]}>
                  {weather.description}
                </Text>
              </View>
            </View>
            <Text style={[styles.weatherSuggestion, { color: isDarkMode ? '#888' : '#666' }]}>
              {getWeatherSuggestion()}
            </Text>
          </View>
        )}

        {/* pet display card - placeholder for future pet feature. */}
        <View style={[styles.petCard, {
          backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
        }]}>
          <View style={styles.petPlaceholder}>
            <Ionicons 
              name="paw" 
              size={100} 
              color={isDarkMode ? '#3a3a3a' : '#e0e0e0'} 
            />
          </View>
        </View>

        {/* goals header with task count and action buttons. */}
        <View style={styles.goalsContainer}>
          <View style={styles.goalsLeft}>
            <Ionicons 
              name="calendar" 
              size={24} 
              color={isDarkMode ? '#888' : '#666'} 
            />
            <Text style={[styles.goalsText, { color: isDarkMode ? '#888' : '#666' }]}>
              {tasks.length === 0 ? 'No goals yet!' : `${tasksRemaining} goals left for today!`}
            </Text>
          </View>
          <TouchableOpacity>
            <Ionicons 
              name="options" 
              size={24} 
              color={isDarkMode ? '#888' : '#666'} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
            <Ionicons 
              name="add-circle" 
              size={24} 
              color={isDarkMode ? '#888' : '#666'} 
            />
          </TouchableOpacity>
        </View>

        {/* loading state. */}
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: isDarkMode ? '#888' : '#666' }]}>
              Loading tasks...
            </Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons 
              name="clipboard-outline" 
              size={80} 
              color={isDarkMode ? '#3a3a3a' : '#d0d0d0'} 
            />
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
              No tasks yet!
            </Text>
            <Text style={[styles.emptyStateText, { color: isDarkMode ? '#888' : '#666' }]}>
              Why not create some goals to get started?
            </Text>
            <TouchableOpacity 
              style={[styles.createButton, {
                backgroundColor: isDarkMode ? '#fff' : '#1a1a1a',
              }]}
              onPress={() => navigation.navigate('Tasks')}
            >
              <Text style={[styles.createButtonText, {
                color: isDarkMode ? '#1a1a1a' : '#fff',
              }]}>
                Create Your First Task
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tasksList}>
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskItem, {
                  backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8',
                }]}
                onPress={() => toggleTask(task.id, task)}
              >
                <View style={styles.taskLeft}>
                  <View style={[styles.taskIcon, {
                    backgroundColor: isDarkMode ? '#3a3a3a' : '#d0d0d0',
                  }]}>
                    <Ionicons 
                      name={task.icon as any}
                      size={24} 
                      color={isDarkMode ? '#888' : '#666'} 
                    />
                  </View>
                  {/* task content (title and subtitle). */}
                  <View style={styles.taskContent}>
                    <View style={styles.taskTitleRow}>
                      <Text style={[styles.taskTitle, { 
                        color: theme.text,
                        textDecorationLine: task.completed ? 'line-through' : 'none',
                      }]}>
                        {task.title}
                      </Text>
                      {task.repeatType === 'DAILY' && (
                        <View style={styles.streakBadge}>
                          <Ionicons 
                            name="flame" 
                            size={16} 
                            color="#ff6b35"
                          />
                          <Text style={styles.streakText}>{dailyStreak}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.taskSubtitle, { color: isDarkMode ? '#888' : '#666' }]}>
                      {task.subtitle}
                    </Text>
                  </View>
                </View>

                {/* completion checkbox. */}
                <View style={[styles.checkbox, {
                  backgroundColor: task.completed 
                    ? (isDarkMode ? '#fff' : '#1a1a1a')
                    : 'transparent',
                  borderColor: isDarkMode ? '#666' : '#999',
                  borderWidth: task.completed ? 0 : 2,
                }]}>
                  {task.completed && (
                    <Ionicons 
                      name="checkmark" 
                      size={24} 
                      color={isDarkMode ? '#1a1a1a' : '#fff'} 
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </View>
  );
};

// style sheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  currencyContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  currencyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '600',
  },
  topRightIcons: {
    position: 'absolute',
    top: 50,
    right: 80,
    flexDirection: 'row',
    gap: 10,
    zIndex: 10,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    marginTop: 100,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 130,
  },
  petCard: {
    borderRadius: 30,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
  },
  petPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  petImage: {
    width: 200,
    height: 200,
  },
  weatherCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  weatherInfo: {
    marginLeft: 15,
  },
  weatherTemp: {
    fontSize: 32,
    fontWeight: '700',
  },
  weatherCondition: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  weatherSuggestion: {
    fontSize: 14,
    marginTop: 10,
    fontStyle: 'italic',
  },
  goalsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  goalsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  goalsText: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  createButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tasksList: {
    gap: 10,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 25,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flex: 1,
  },
  taskIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff6b35',
  },
  taskSubtitle: {
    fontSize: 14,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});