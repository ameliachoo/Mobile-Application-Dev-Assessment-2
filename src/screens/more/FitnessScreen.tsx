import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors/Colors';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { Pedometer } from 'expo-sensors';
import { usePoints } from '../../contexts/PointsContext';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface FitnessStats {
  steps: number;
  stepGoal: number;
  lastReset: string;
  totalStepsAllTime: number;
}

interface FitnessTask {
  id: string;
  title: string;
  targetSteps: number;
  completed: boolean;
  icon: string;
}

export const FitnessScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const { addPoints, incrementTasksCompleted, heartPoints } = usePoints();

  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [currentSteps, setCurrentSteps] = useState(0);
  const [stepGoal, setStepGoal] = useState(10000);
  const [totalStepsAllTime, setTotalStepsAllTime] = useState(0);
  const [loading, setLoading] = useState(true);

  const [fitnessTasks, setFitnessTasks] = useState<FitnessTask[]>([
    { id: '1', title: 'Take 1,000 steps', targetSteps: 1000, completed: false, icon: 'walk' },
    { id: '2', title: 'Take 5,000 steps', targetSteps: 5000, completed: false, icon: 'fitness' },
    { id: '3', title: 'Reach 10,000 steps', targetSteps: 10000, completed: false, icon: 'trophy' },
    { id: '4', title: 'Power walker: 15,000 steps', targetSteps: 15000, completed: false, icon: 'rocket' },
  ]);

  useEffect(() => {
    checkPedometerAvailability();
    loadFitnessStats();
    
    const subscription = subscribeToPedometer();
    
    getTodaySteps();
    
    return subscription;
  }, []);

  const checkPedometerAvailability = async () => {
    const available = await Pedometer.isAvailableAsync();
    setIsPedometerAvailable(available);
    
    if (!available) {
      Alert.alert('Pedometer Not Available', 'Step tracking is not supported on this device.');
    }
  };

  const loadFitnessStats = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const fitnessRef = doc(db, 'fitnessStats', user.uid);
      const docSnap = await getDoc(fitnessRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as FitnessStats;
        
        const today = new Date().toDateString();
        const lastReset = new Date(data.lastReset).toDateString();

        if (today !== lastReset) {
          setCurrentSteps(0);
          await updateDoc(fitnessRef, {
            steps: 0,
            lastReset: new Date().toISOString(),
          });
        } else {
          setCurrentSteps(data.steps);
        }

        setStepGoal(data.stepGoal || 10000);
        setTotalStepsAllTime(data.totalStepsAllTime || 0);
      } else {
        const initialStats: FitnessStats = {
          steps: 0,
          stepGoal: 10000,
          lastReset: new Date().toISOString(),
          totalStepsAllTime: 0,
        };
        await setDoc(fitnessRef, initialStats);
      }
    } catch (error) {
      console.log('Error loading fitness stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTodaySteps = async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const result = await Pedometer.getStepCountAsync(start, end);
      
      if (result) {
        const todaySteps = result.steps;
        
        const stepIncrease = todaySteps - currentSteps;
        if (stepIncrease > 0) {
          setTotalStepsAllTime(prev => prev + stepIncrease);
        }
        
        setCurrentSteps(todaySteps);
        
        const user = auth.currentUser;
        if (user) {
          const fitnessRef = doc(db, 'fitnessStats', user.uid);
          await updateDoc(fitnessRef, {
            steps: todaySteps,
            totalStepsAllTime: stepIncrease > 0 ? totalStepsAllTime + stepIncrease : totalStepsAllTime,
          });
        }
      }
    } catch (error) {
      console.log('Error getting step count:', error);
    }
  };

  const subscribeToPedometer = () => {
    const interval = setInterval(() => {
      getTodaySteps();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  };

  const updateSteps = async (totalSteps: number) => {
    const user = auth.currentUser;
    if (!user) return;

    const stepDifference = totalSteps - currentSteps;
    
    if (stepDifference > 0) {
      setTotalStepsAllTime(prev => prev + stepDifference);
    }

    setCurrentSteps(totalSteps);
    checkFitnessTaskCompletion(totalSteps);

    try {
      const fitnessRef = doc(db, 'fitnessStats', user.uid);
      await updateDoc(fitnessRef, {
        steps: totalSteps,
        totalStepsAllTime: stepDifference > 0 ? totalStepsAllTime + stepDifference : totalStepsAllTime,
      });
    } catch (error) {
      console.log('Error updating steps:', error);
    }
  };

  const checkFitnessTaskCompletion = async (steps: number) => {
    const user = auth.currentUser;
    if (!user) return;

    fitnessTasks.forEach(async (task) => {
      if (!task.completed && steps >= task.targetSteps) {
        setFitnessTasks(prev => 
          prev.map(t => t.id === task.id ? { ...t, completed: true } : t)
        );

        await addPoints(50, false); 
        await incrementTasksCompleted();

        Alert.alert('Fitness Goal Achieved!', `You completed: ${task.title}!`);
      }
    });

    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(
        tasksRef, 
        where('userId', '==', user.uid),
        where('subtitle', '==', 'HEALTH')
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (taskDoc) => {
        const task = taskDoc.data();
        
        if (!task.completed && task.title.toLowerCase().includes('step')) {
          const stepMatch = task.title.match(/\d+/);
          if (stepMatch && steps >= parseInt(stepMatch[0])) {
            await updateDoc(doc(db, 'tasks', taskDoc.id), {
              completed: true,
              lastCompletedDate: new Date().toISOString(),
            });

            Alert.alert('Task Auto-Completed!', `"${task.title}" completed automatically!`);
          }
        }
      });
    } catch (error) {
      console.log('Error checking tasks:', error);
    }
  };

  const progressPercentage = Math.min((currentSteps / stepGoal) * 100, 100);

  const getMotivationalMessage = (): string => {
    const percentage = (currentSteps / stepGoal) * 100;
    
    if (percentage === 0) return "Let's get moving!";
    if (percentage < 25) return "Great start! Keep it up!";
    if (percentage < 50) return "You're doing amazing!";
    if (percentage < 75) return "More than halfway there!";
    if (percentage < 100) return "Almost at your goal!";
    return "Goal achieved!";
  };

  const handleResetSteps = () => {
    Alert.alert(
      'Reset Steps',
      'Are you sure you want to reset your step count to 0? This will also reset your all-time total.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setCurrentSteps(0);
            setTotalStepsAllTime(0);
            setFitnessTasks(prev => prev.map(t => ({ ...t, completed: false })));
            
            const user = auth.currentUser;
            if (user) {
              const fitnessRef = doc(db, 'fitnessStats', user.uid);
              await updateDoc(fitnessRef, { 
                steps: 0,
                totalStepsAllTime: 0,
              });
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading fitness data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.pointsContainer}>
        <View style={[styles.pointsBox, {
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

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color={theme.text} />
      </TouchableOpacity>

      <View style={styles.themeToggleContainer}>
        <ThemeToggle />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          FITNESS TRACKER
        </Text>

        <View style={[styles.stepCard, {
          backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
        }]}>
          <View style={styles.stepHeader}>
            <Ionicons name="footsteps" size={40} color="#4CAF50" />
            <Text style={[styles.stepTitle, { color: theme.text }]}>Today's Steps</Text>
          </View>

          <Text style={[styles.stepCount, { color: theme.text }]}>
            {currentSteps.toLocaleString()}
          </Text>

          <Text style={[styles.stepGoalText, { color: isDarkMode ? '#888' : '#666' }]}>
            Goal: {stepGoal.toLocaleString()} steps
          </Text>

          <View style={[styles.progressBarContainer, {
            backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0',
          }]}>
            <View style={[styles.progressBarFill, {
              width: `${progressPercentage}%`,
              backgroundColor: '#4CAF50',
            }]} />
          </View>

          <Text style={[styles.progressText, { color: isDarkMode ? '#888' : '#666' }]}>
            {Math.round(progressPercentage)}% complete
          </Text>

          <Text style={[styles.motivationalText, { color: theme.text }]}>
            {getMotivationalMessage()}
          </Text>
        </View>

        <View style={[styles.statsCard, {
          backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
        }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Statistics</Text>
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="flame" size={30} color="#FF5722" />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {Math.round(currentSteps * 0.04)}
              </Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#888' : '#666' }]}>
                Calories
              </Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="navigate" size={30} color="#2196F3" />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {(currentSteps * 0.0008).toFixed(2)}
              </Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#888' : '#666' }]}>
                Kilometers
              </Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="time" size={30} color="#FF9800" />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {Math.round(currentSteps / 100)}
              </Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#888' : '#666' }]}>
                Minutes
              </Text>
            </View>
          </View>

          <View style={styles.totalStepsContainer}>
            <Ionicons name="trophy" size={24} color="#FFD700" />
            <View style={styles.totalStepsInfo}>
              <Text style={[styles.totalStepsLabel, { color: isDarkMode ? '#888' : '#666' }]}>
                All-Time Total
              </Text>
              <Text style={[styles.totalStepsValue, { color: theme.text }]}>
                {totalStepsAllTime.toLocaleString()} steps
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.milestonesSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Today's Milestones
          </Text>

          {fitnessTasks.map((task) => (
            <View
              key={task.id}
              style={[styles.milestoneItem, {
                backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
              }]}
            >
              <View style={styles.milestoneLeft}>
                <View style={[styles.milestoneIcon, {
                  backgroundColor: task.completed ? '#4CAF50' : (isDarkMode ? '#3a3a3a' : '#e0e0e0'),
                }]}>
                  <Ionicons 
                    name={task.icon as any}
                    size={24} 
                    color={task.completed ? '#fff' : (isDarkMode ? '#888' : '#666')}
                  />
                </View>
                <View style={styles.milestoneInfo}>
                  <Text style={[styles.milestoneTitle, { 
                    color: theme.text,
                    textDecorationLine: task.completed ? 'line-through' : 'none',
                  }]}>
                    {task.title}
                  </Text>
                  <Text style={[styles.milestoneProgress, { color: isDarkMode ? '#888' : '#666' }]}>
                    {currentSteps >= task.targetSteps 
                      ? '✓ Completed!' 
                      : `${currentSteps} / ${task.targetSteps.toLocaleString()}`
                    }
                  </Text>
                </View>
              </View>
              
              {task.completed && (
                <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              )}
            </View>
          ))}
        </View>

        {!isPedometerAvailable && (
          <View style={[styles.warningCard, {
            backgroundColor: isDarkMode ? '#3a2a2a' : '#fff3e0',
          }]}>
            <Ionicons name="warning" size={24} color="#FF9800" />
            <Text style={[styles.warningText, { color: isDarkMode ? '#FFB74D' : '#F57C00' }]}>
              Pedometer not available on this device. Step tracking may not work.
            </Text>
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
    paddingTop: 100,
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
  pointsContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  pointsBox: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  stepCard: {
    borderRadius: 20,
    padding: 30,
    marginBottom: 20,
    alignItems: 'center',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  stepCount: {
    fontSize: 64,
    fontWeight: '700',
    marginBottom: 10,
  },
  stepGoalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    marginBottom: 15,
  },
  motivationalText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  totalStepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  totalStepsInfo: {
    flex: 1,
  },
  totalStepsLabel: {
    fontSize: 14,
  },
  totalStepsValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  milestonesSection: {
    marginBottom: 20,
  },
  milestoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  milestoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flex: 1,
  },
  milestoneIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  milestoneProgress: {
    fontSize: 14,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 15,
    borderRadius: 15,
    marginTop: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
  },
});