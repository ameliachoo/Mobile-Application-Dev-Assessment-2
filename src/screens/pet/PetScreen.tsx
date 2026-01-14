import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors/Colors';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { usePoints } from '../../contexts/PointsContext';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export const PetScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const { heartPoints } = usePoints();
  
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLifetimePoints();
  }, []);

  const loadLifetimePoints = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setLifetimePoints(data.lifetimePoints || 0);
      }
    } catch (error) {
      console.log('Error loading lifetime points:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate level based on lifetime points
  // Level 1: 0-99 points
  // Level 2: 100-299 points  
  // Level 3: 300-599 points
  // Level 4: 600-999 points
  // And so on with increasing requirements
  const calculateLevel = (points: number): number => {
    if (points < 100) return 1;
    if (points < 300) return 2;
    if (points < 600) return 3;
    if (points < 1000) return 4;
    if (points < 1500) return 5;
    if (points < 2100) return 6;
    if (points < 2800) return 7;
    if (points < 3600) return 8;
    if (points < 4500) return 9;
    
    // For levels 10+, each level requires 1000 more points
    return Math.floor((points - 4500) / 1000) + 10;
  };

  const getPointsForNextLevel = (currentLevel: number): number => {
    if (currentLevel === 1) return 100;
    if (currentLevel === 2) return 300;
    if (currentLevel === 3) return 600;
    if (currentLevel === 4) return 1000;
    if (currentLevel === 5) return 1500;
    if (currentLevel === 6) return 2100;
    if (currentLevel === 7) return 2800;
    if (currentLevel === 8) return 3600;
    if (currentLevel === 9) return 4500;
    
    // For levels 10+
    return 4500 + (currentLevel - 9) * 1000;
  };

  const getPointsForCurrentLevel = (currentLevel: number): number => {
    if (currentLevel === 1) return 0;
    return getPointsForNextLevel(currentLevel - 1);
  };

  const currentLevel = calculateLevel(lifetimePoints);
  const pointsForCurrentLevel = getPointsForCurrentLevel(currentLevel);
  const pointsForNextLevel = getPointsForNextLevel(currentLevel);
  const pointsIntoLevel = lifetimePoints - pointsForCurrentLevel;
  const pointsNeededForLevel = pointsForNextLevel - pointsForCurrentLevel;
  const xpPercentage = (pointsIntoLevel / pointsNeededForLevel) * 100;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.text} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading pet...</Text>
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

      <View style={styles.themeToggleContainer}>
        <ThemeToggle />
      </View>

      <View style={styles.content}>
        <View style={[styles.petCard, {
          backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
        }]}>
          <View style={styles.petDisplay}>
            <Ionicons 
              name="paw" 
              size={120} 
              color={isDarkMode ? '#3a3a3a' : '#e0e0e0'} 
            />
          </View>
        </View>

        <View style={styles.levelContainer}>
          <Text style={[styles.levelText, { color: theme.text }]}>
            Lvl {currentLevel}
          </Text>
          <View style={[styles.levelProgressBar, {
            backgroundColor: isDarkMode ? '#3a3a3a' : '#d0d0d0',
          }]}>
            <View style={[styles.levelProgressFill, {
              backgroundColor: isDarkMode ? '#fff' : '#1a1a1a',
              width: `${Math.min(xpPercentage, 100)}%`,
            }]} />
          </View>
          <Text style={[styles.xpText, { color: isDarkMode ? '#888' : '#666' }]}>
            {pointsIntoLevel}/{pointsNeededForLevel}
          </Text>
        </View>

        <View style={[styles.statsCard, {
          backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
        }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: isDarkMode ? '#888' : '#666' }]}>
              Lifetime Points
            </Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {lifetimePoints.toLocaleString()}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: isDarkMode ? '#888' : '#666' }]}>
              Next Level
            </Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {pointsNeededForLevel - pointsIntoLevel} pts
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.customizeButton, {
            backgroundColor: isDarkMode ? '#3a3a3a' : '#d0d0d0',
          }]}
          onPress={() => navigation.navigate('Shop')}
        >
          <Text style={[styles.customizeText, { color: theme.text }]}>
            CUSTOMIZE
          </Text>
        </TouchableOpacity>
      </View>
      
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </View>
  );
};

// style sheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
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
  profileButton: {
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
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 200,
    paddingBottom: 130,
    justifyContent: 'center',
  },
  petCard: {
    borderRadius: 30,
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    marginBottom: 20,
  },
  petDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 50,
  },
  levelProgressBar: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: 6,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  customizeButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  customizeText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
});