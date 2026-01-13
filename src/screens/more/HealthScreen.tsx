import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors/Colors';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { usePoints } from '../../contexts/PointsContext';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';

interface NutritionData {
  waterGlasses: number;
  vegetables: number;
  fruits: number;
  proteinGrams: number;
  sleepHours: number;
  mindfulMinutes: number;
  meals: Meal[];
  lastReset: string;
}

interface Meal {
  id: string;
  name: string;
  items: string;
  time: string;
  calories: number;
  healthy: boolean;
}

export const HealthScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const { heartPoints, addPoints, incrementTasksCompleted } = usePoints();

  const [loading, setLoading] = useState(true);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [vegetables, setVegetables] = useState(0);
  const [fruits, setFruits] = useState(0);
  const [proteinGrams, setProteinGrams] = useState(0);
  const [sleepHours, setSleepHours] = useState(0);
  const [mindfulMinutes, setMindfulMinutes] = useState(0);
  const [meals, setMeals] = useState<Meal[]>([]);

  const [showMealModal, setShowMealModal] = useState(false);
  const [showProteinModal, setShowProteinModal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealItems, setNewMealItems] = useState('');
  const [newMealCalories, setNewMealCalories] = useState('');
  const [proteinInput, setProteinInput] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadNutritionData();
    }, [])
  );

  const loadNutritionData = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const nutritionRef = doc(db, 'nutritionData', user.uid);
      const docSnap = await getDoc(nutritionRef);

      const today = new Date().toDateString();

      if (docSnap.exists()) {
        const data = docSnap.data() as NutritionData;
        const lastReset = new Date(data.lastReset).toDateString();

        if (today !== lastReset) {
          console.log('Resetting nutrition data for a new day');
          await resetNutritionData(user.uid);
        } else {
          console.log('Loading existing nutrition data');
          setWaterGlasses(data.waterGlasses || 0);
          setVegetables(data.vegetables || 0);
          setFruits(data.fruits || 0);
          setProteinGrams(data.proteinGrams || 0);
          setSleepHours(data.sleepHours || 0);
          setMindfulMinutes(data.mindfulMinutes || 0);
          setMeals(data.meals || []);
        }
      } else {
        console.log('Creating initial data');
        await resetNutritionData(user.uid);
      }
    } catch (error) {
      console.error('Error loading nutrition data:', error);
      Alert.alert('Error', 'Failed to load nutrition data');
    } finally {
      setLoading(false);
    }
  };

  const resetNutritionData = async (userId: string) => {
    const initialData: NutritionData = {
      waterGlasses: 0,
      vegetables: 0,
      fruits: 0,
      proteinGrams: 0,
      sleepHours: 0,
      mindfulMinutes: 0,
      meals: [],
      lastReset: new Date().toISOString(),
    };

    await setDoc(doc(db, 'nutritionData', userId), initialData);

    setWaterGlasses(0);
    setVegetables(0);
    setFruits(0);
    setProteinGrams(0);
    setSleepHours(0);
    setMindfulMinutes(0);
    setMeals([]);
  };

  const updateFirebase = async (updates: Partial<NutritionData>) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const nutritionRef = doc(db, 'nutritionData', user.uid);
      await updateDoc(nutritionRef, updates);
    } catch (error) {
      console.error('Error updating nutrition data:', error);
    }
  };

  const handleAddWater = async () => {
    const newCount = waterGlasses + 1;
    setWaterGlasses(newCount);
    await updateFirebase({ waterGlasses: newCount });
    
    if (newCount === 8) {
      await addPoints(50, false);
      await incrementTasksCompleted();
      Alert.alert('Goal Achieved!', 'You drank 8 glasses of water today! +50 points');
    }
  };

  const handleRemoveWater = async () => {
    if (waterGlasses > 0) {
      const newCount = waterGlasses - 1;
      setWaterGlasses(newCount);
      await updateFirebase({ waterGlasses: newCount });
    }
  };

  const handleAddVegetable = async () => {
    const newCount = vegetables + 1;
    setVegetables(newCount);
    await updateFirebase({ vegetables: newCount });
    
    if (newCount === 5) {
      await addPoints(75, false);
      await incrementTasksCompleted();
      Alert.alert('Excellent!', 'You ate 5 servings of vegetables! +75 points');
    }
  };

  const handleRemoveVegetable = async () => {
    if (vegetables > 0) {
      const newCount = vegetables - 1;
      setVegetables(newCount);
      await updateFirebase({ vegetables: newCount });
    }
  };

  const handleAddFruit = async () => {
    const newCount = fruits + 1;
    setFruits(newCount);
    await updateFirebase({ fruits: newCount });
    
    if (newCount === 3) {
      await addPoints(50, false);
      await incrementTasksCompleted();
      Alert.alert('Great Job!', 'You ate 3 servings of fruit! +50 points');
    }
  };

  const handleRemoveFruit = async () => {
    if (fruits > 0) {
      const newCount = fruits - 1;
      setFruits(newCount);
      await updateFirebase({ fruits: newCount });
    }
  };

  const handleAddProtein = () => {
    setShowProteinModal(true);
  };

  const handleSubmitProtein = async () => {
    const grams = parseInt(proteinInput || '0');
    if (grams > 0 && grams <= 200) {
      const newTotal = proteinGrams + grams;
      setProteinGrams(newTotal);
      await updateFirebase({ proteinGrams: newTotal });
      
      if (newTotal >= 100 && proteinGrams < 100) {
        await addPoints(60, false);
        await incrementTasksCompleted();
        Alert.alert('Protein Goal!', 'You reached 100g protein! +60 points');
      }
      
      setShowProteinModal(false);
      setProteinInput('');
    } else {
      Alert.alert('Error', 'Please enter a valid amount');
    }
  };

  const handleAddMeal = async () => {
    if (!newMealName || !newMealItems || !newMealCalories) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const newMeal: Meal = {
      id: Date.now().toString(),
      name: newMealName,
      items: newMealItems,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      calories: parseInt(newMealCalories),
      healthy: parseInt(newMealCalories) < 600,
    };

    const updatedMeals = [...meals, newMeal];
    setMeals(updatedMeals);
    await updateFirebase({ meals: updatedMeals });

    setShowMealModal(false);
    setNewMealName('');
    setNewMealItems('');
    setNewMealCalories('');

    await addPoints(30, false);
    Alert.alert('Meal Logged!', 'Keep tracking your nutrition! +30 points');
  };

  const handleDeleteMeal = async (id: string) => {
    Alert.alert(
      'Delete Meal',
      'Remove this meal from your log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedMeals = meals.filter(m => m.id !== id);
            setMeals(updatedMeals);
            await updateFirebase({ meals: updatedMeals });
          }
        }
      ]
    );
  };

  const handleManualReset = () => {
    Alert.alert(
      'Reset All Data',
      'This will reset all nutrition tracking for today. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const user = auth.currentUser;
            if (user) {
              await resetNutritionData(user.uid);
              Alert.alert('Reset Complete', 'All nutrition data has been cleared');
            }
          }
        }
      ]
    );
  };

  const calculateProgress = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const healthyMealCount = meals.filter(m => m.healthy).length;

  const nutritionChallenges = [
    { id: '1', title: 'Drink 8 glasses of water', progress: waterGlasses, goal: 8, icon: 'water', color: '#00BCD4', reward: 50 },
    { id: '2', title: 'Eat 5 servings of vegetables', progress: vegetables, goal: 5, icon: 'leaf', color: '#4CAF50', reward: 75 },
    { id: '3', title: 'Consume 100g protein', progress: proteinGrams, goal: 100, icon: 'fish', color: '#E91E63', reward: 60 },
    { id: '4', title: 'Eat 3 servings of fruit', progress: fruits, goal: 3, icon: 'nutrition', color: '#FF9800', reward: 50 },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.text} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading nutrition data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemeToggle />
      <View style={styles.pointsContainer}>
        <View style={[styles.pointsBox, {
          backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8',
        }]}>
          <Ionicons name="heart" size={24} color="#e74c3c" />
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
      <TouchableOpacity 
        style={styles.resetButton}
        onPress={handleManualReset}
      >
        <Ionicons name="refresh" size={24} color={theme.text} />
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          NUTRITION & WELLNESS
        </Text>
        <View style={[styles.overviewCard, {
          backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
        }]}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Ionicons name="restaurant" size={24} color="#FF9800" />
              <Text style={[styles.overviewValue, { color: theme.text }]}>
                {meals.length}
              </Text>
              <Text style={[styles.overviewLabel, { color: isDarkMode ? '#888' : '#666' }]}>
                Meals
              </Text>
            </View>

            <View style={styles.overviewItem}>
              <Ionicons name="flame" size={24} color="#FF5722" />
              <Text style={[styles.overviewValue, { color: theme.text }]}>
                {totalCalories}
              </Text>
              <Text style={[styles.overviewLabel, { color: isDarkMode ? '#888' : '#666' }]}>
                Calories
              </Text>
            </View>

            <View style={styles.overviewItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={[styles.overviewValue, { color: theme.text }]}>
                {healthyMealCount}/{meals.length}
              </Text>
              <Text style={[styles.overviewLabel, { color: isDarkMode ? '#888' : '#666' }]}>
                Healthy
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#888' : '#666' }]}>
          QUICK TRACK
        </Text>

        <View style={styles.quickAddGrid}>
          <View style={[styles.quickAddCard, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          }]}>
            <Ionicons name="water" size={32} color="#00BCD4" />
            <Text style={[styles.quickAddCount, { color: theme.text }]}>
              {waterGlasses}
            </Text>
            <Text style={[styles.quickAddLabel, { color: isDarkMode ? '#888' : '#666' }]}>
              / 8 glasses
            </Text>
            <View style={[styles.miniProgress, {
              backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0',
            }]}>
              <View style={[styles.miniProgressFill, {
                backgroundColor: '#00BCD4',
                width: `${calculateProgress(waterGlasses, 8)}%`,
              }]} />
            </View>
            <View style={styles.cardButtons}>
              <TouchableOpacity 
                style={[styles.minusButton, { backgroundColor: '#FF5252' }]}
                onPress={handleRemoveWater}
              >
                <Ionicons name="remove" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.addButtonCard, { backgroundColor: '#4CAF50' }]}
                onPress={handleAddWater}
              >
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.quickAddCard, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          }]}>
            <Ionicons name="leaf" size={32} color="#4CAF50" />
            <Text style={[styles.quickAddCount, { color: theme.text }]}>
              {vegetables}
            </Text>
            <Text style={[styles.quickAddLabel, { color: isDarkMode ? '#888' : '#666' }]}>
              / 5 servings
            </Text>
            <View style={[styles.miniProgress, {
              backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0',
            }]}>
              <View style={[styles.miniProgressFill, {
                backgroundColor: '#4CAF50',
                width: `${calculateProgress(vegetables, 5)}%`,
              }]} />
            </View>
            <View style={styles.cardButtons}>
              <TouchableOpacity 
                style={[styles.minusButton, { backgroundColor: '#FF5252' }]}
                onPress={handleRemoveVegetable}
              >
                <Ionicons name="remove" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.addButtonCard, { backgroundColor: '#4CAF50' }]}
                onPress={handleAddVegetable}
              >
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.quickAddCard, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          }]}>
            <Ionicons name="nutrition" size={32} color="#FF9800" />
            <Text style={[styles.quickAddCount, { color: theme.text }]}>
              {fruits}
            </Text>
            <Text style={[styles.quickAddLabel, { color: isDarkMode ? '#888' : '#666' }]}>
              / 3 servings
            </Text>
            <View style={[styles.miniProgress, {
              backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0',
            }]}>
              <View style={[styles.miniProgressFill, {
                backgroundColor: '#FF9800',
                width: `${calculateProgress(fruits, 3)}%`,
              }]} />
            </View>
            <View style={styles.cardButtons}>
              <TouchableOpacity 
                style={[styles.minusButton, { backgroundColor: '#FF5252' }]}
                onPress={handleRemoveFruit}
              >
                <Ionicons name="remove" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.addButtonCard, { backgroundColor: '#4CAF50' }]}
                onPress={handleAddFruit}
              >
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.quickAddCard, {
              backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
            }]}
            onPress={handleAddProtein}
          >
            <Ionicons name="fish" size={32} color="#E91E63" />
            <Text style={[styles.quickAddCount, { color: theme.text }]}>
              {proteinGrams}g
            </Text>
            <Text style={[styles.quickAddLabel, { color: isDarkMode ? '#888' : '#666' }]}>
              / 100g goal
            </Text>
            <View style={[styles.miniProgress, {
              backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0',
            }]}>
              <View style={[styles.miniProgressFill, {
                backgroundColor: '#E91E63',
                width: `${calculateProgress(proteinGrams, 100)}%`,
              }]} />
            </View>
            <View style={[styles.addButtonCard, { backgroundColor: '#4CAF50 ' }]}>
              <Ionicons name="add" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#888' : '#666' }]}>
          TODAY'S MEALS
        </Text>

        {meals.length === 0 ? (
          <View style={[styles.emptyState, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          }]}>
            <Ionicons name="restaurant-outline" size={48} color={isDarkMode ? '#666' : '#999'} />
            <Text style={[styles.emptyText, { color: isDarkMode ? '#888' : '#666' }]}>
              No meals logged yet today
            </Text>
          </View>
        ) : (
          meals.map((meal) => (
            <TouchableOpacity
              key={meal.id}
              style={[styles.mealCard, {
                backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
              }]}
              onLongPress={() => handleDeleteMeal(meal.id)}
            >
              <View style={styles.mealLeft}>
                <View style={[styles.mealIcon, {
                  backgroundColor: meal.healthy ? '#4CAF50' : '#FF9800',
                }]}>
                  <Ionicons 
                    name={meal.healthy ? 'checkmark' : 'alert'}
                    size={24} 
                    color="#fff" 
                  />
                </View>
                <View style={styles.mealInfo}>
                  <Text style={[styles.mealName, { color: theme.text }]}>
                    {meal.name}
                  </Text>
                  <Text style={[styles.mealItems, { color: isDarkMode ? '#888' : '#666' }]}>
                    {meal.items}
                  </Text>
                  <View style={styles.mealMeta}>
                    <Ionicons name="time-outline" size={14} color={isDarkMode ? '#888' : '#666'} />
                    <Text style={[styles.mealTime, { color: isDarkMode ? '#888' : '#666' }]}>
                      {meal.time}
                    </Text>
                    <Text style={[styles.mealCalories, { color: isDarkMode ? '#888' : '#666' }]}>
                      • {meal.calories} cal
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={[styles.addMealButton, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
            borderColor: isDarkMode ? '#3a3a3a' : '#d0d0d0',
          }]}
          onPress={() => setShowMealModal(true)}
        >
          <Ionicons name="add-circle" size={24} color={theme.text} />
          <Text style={[styles.addMealText, { color: theme.text }]}>
            Log a Meal
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#888' : '#666' }]}>
          DAILY CHALLENGES
        </Text>

        {nutritionChallenges.map((challenge) => {
          const completed = challenge.progress >= challenge.goal;
          return (
            <View
              key={challenge.id}
              style={[styles.challengeCard, {
                backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
              }]}
            >
              <View style={styles.challengeLeft}>
                <View style={[styles.challengeIcon, {
                  backgroundColor: challenge.color + '20',
                }]}>
                  <Ionicons 
                    name={challenge.icon as any}
                    size={24} 
                    color={challenge.color} 
                  />
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={[styles.challengeTitle, { color: theme.text }]}>
                    {challenge.title}
                  </Text>
                  <Text style={[styles.challengeProgress, { color: isDarkMode ? '#888' : '#666' }]}>
                    {challenge.progress} / {challenge.goal}
                  </Text>
                </View>
              </View>
              <View style={styles.challengeRight}>
                <Text style={[styles.challengeReward, { color: '#FFD700' }]}>
                  +{challenge.reward}
                </Text>
                {completed && (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                )}
              </View>
            </View>
          );
        })}

        <View style={[styles.tipCard, {
          backgroundColor: isDarkMode ? '#2a2a2a' : '#fff3e0',
        }]}>
          <Ionicons name="bulb" size={24} color="#FF9800" />
          <Text style={[styles.tipText, { color: theme.text }]}>
            Tip: All data resets daily at midnight. Track consistently to maintain your pet's health!
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showMealModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMealModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Log a Meal
            </Text>

            <TextInput
              style={[styles.modalInput, {
                backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
                color: theme.text,
              }]}
              placeholder="Meal name (e.g., Dinner)"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              value={newMealName}
              onChangeText={setNewMealName}
            />

            <TextInput
              style={[styles.modalInput, {
                backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
                color: theme.text,
              }]}
              placeholder="What did you eat?"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              value={newMealItems}
              onChangeText={setNewMealItems}
            />

            <TextInput
              style={[styles.modalInput, {
                backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
                color: theme.text,
              }]}
              placeholder="Calories"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              value={newMealCalories}
              onChangeText={setNewMealCalories}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, {
                  backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0',
                }]}
                onPress={() => setShowMealModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, {
                  backgroundColor: '#4CAF50',
                }]}
                onPress={handleAddMeal}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  Log Meal
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showProteinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProteinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Add Protein
            </Text>

            <TextInput
              style={[styles.modalInput, {
                backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
                color: theme.text,
              }]}
              placeholder="Enter grams (e.g., 25)"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              value={proteinInput}
              onChangeText={setProteinInput}
              keyboardType="numeric"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, {
                  backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0',
                }]}
                onPress={() => {
                  setShowProteinModal(false);
                  setProteinInput('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, {
                  backgroundColor: '#E91E63',
                }]}
                onPress={handleSubmitProtein}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>     
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
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
    right: 140,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  resetButton: {
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
  loadingText: {
    fontSize: 16,
    marginTop: 10,
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
    marginBottom: 20,
  },
  overviewCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  overviewLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 15,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  quickAddCard: {
    width: '48%',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    position: 'relative',
  },
  quickAddCount: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 10,
  },
  quickAddLabel: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  miniProgress: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  miniProgressFill: {
    height: '100%',
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  minusButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonCard: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  mealCard: {
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
  },
  mealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  mealIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealItems: {
    fontSize: 14,
    marginBottom: 4,
  },
  mealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealTime: {
    fontSize: 12,
  },
  mealCalories: {
    fontSize: 12,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  addMealText: {
    fontSize: 16,
    fontWeight: '600',
  },
  challengeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
  },
  challengeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flex: 1,
  },
  challengeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  challengeProgress: {
    fontSize: 13,
  },
  challengeRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  challengeReward: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipCard: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 20,
    gap: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    height: 50,
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});