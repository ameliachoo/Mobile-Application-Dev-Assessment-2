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

interface WeatherData {
  temp: number;
  condition: string;
  description: string;
  icon: string;
}

const WEATHER_API_KEY = 'c27b2966be5ed7c73f5a8243b4ca1689';

export const HomeScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const { heartPoints, dailyStreak, addPoints, incrementTasksCompleted } = usePoints();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
      checkAndResetTasks();
      fetchWeather();
    }, [])
  );

  const checkAndResetTasks = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (taskDoc) => {
        const task = taskDoc.data() as Task;
        
        if (task.completed && task.lastCompletedDate) {
          const lastCompleted = new Date(task.lastCompletedDate);
          const now = new Date();

          let shouldReset = false;

          if (task.repeatType === 'DAILY') {
            shouldReset = lastCompleted.toDateString() !== now.toDateString();
          } else if (task.repeatType === 'WEEKLY') {
            const daysDiff = Math.floor((now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));
            shouldReset = daysDiff >= 7;
          }

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

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  const toggleTask = async (taskId: string, task: Task) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const newCompletedStatus = !task.completed;
      
      await updateDoc(taskRef, {
        completed: newCompletedStatus,
        lastCompletedDate: newCompletedStatus ? new Date().toISOString() : null
      });
      
      if (newCompletedStatus) {
        const isDailyTask = task.repeatType === 'DAILY';
        await addPoints(POINTS_PER_TASK, isDailyTask);
        await incrementTasksCompleted();
      } else {
        const pointsToRemove = POINTS_PER_TASK;
        await addPoints(-pointsToRemove, false);
      }
      
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, completed: newCompletedStatus, lastCompletedDate: newCompletedStatus ? new Date().toISOString() : undefined } : t
      ));
    } catch (error) {
      console.log('Error updating task:', error);
    }
  };

  const tasksRemaining = tasks.filter(t => !t.completed).length;

  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        setWeatherLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
      );

      if (!response.ok) {
        throw new Error('Weather fetch failed');
      }

      const data = await response.json();

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
      <ThemeToggle />
      
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

        {/* Pet Display Card */}
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