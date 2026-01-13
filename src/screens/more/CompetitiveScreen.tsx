import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors/Colors';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';

interface LeaderboardUser {
  uid: string;
  username: string;
  score: number;
  position?: number;
}

export const CompetitiveScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUserData, setCurrentUserData] = useState<LeaderboardUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchLeaderboard(),
        fetchCurrentUser()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const leaderboardQuery = query(
        collection(db, 'users'),
        orderBy('score', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(leaderboardQuery);
      const users: LeaderboardUser[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: doc.id,
          username: data.username || 'Anonymous',
          score: data.score || 0,
        });
      });

      // Add position numbers
      const rankedUsers = users.map((user, index) => ({
        ...user,
        position: index + 1
      }));

      setLeaderboard(rankedUsers);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setCurrentUserData({
            uid: user.uid,
            username: data.username || 'You',
            score: data.score || 0,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const renderPodium = () => {
    if (leaderboard.length === 0) return null;

    const topThree = leaderboard.slice(0, 3);
    const positions = [
      topThree[1] || null, // 2nd place
      topThree[0] || null, // 1st place
      topThree[2] || null, // 3rd place
    ];

    return (
      <View style={styles.podiumSection}>
        {positions.map((user, index) => {
          const actualPosition = index === 0 ? 2 : index === 1 ? 1 : 3;
          const height = actualPosition === 1 ? 100 : actualPosition === 2 ? 60 : 40;
          const isCurrentUser = user && user.uid === auth.currentUser?.uid;

          return (
            <View key={index} style={styles.podiumItem}>
              {actualPosition === 1 && (
                <Ionicons 
                  name="trophy" 
                  size={24} 
                  color="#FFD700"
                  style={styles.crownIcon}
                />
              )}
              <View style={[styles.podiumAvatar, {
                backgroundColor: isCurrentUser 
                  ? '#4A90E2'
                  : isDarkMode ? '#2a2a2a' : '#e8e8e8',
                height: 80,
              }]}>
                <Ionicons 
                  name="person" 
                  size={40} 
                  color={isCurrentUser ? '#fff' : isDarkMode ? '#666' : '#999'} 
                />
              </View>
              {user && (
                <Text style={[styles.podiumUsername, { 
                  color: theme.text,
                  fontSize: 12
                }]} numberOfLines={1}>
                  {user.username}
                </Text>
              )}
              <View style={[styles.podiumPlatform, {
                backgroundColor: isDarkMode ? '#3a3a3a' : '#d0d0d0',
                height,
              }]}>
                <Text style={[styles.podiumNumber, { color: theme.text }]}>
                  {actualPosition}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { 
        backgroundColor: theme.background,
        justifyContent: 'center',
        alignItems: 'center'
      }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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

      <View style={styles.themeToggleContainer}>
        <ThemeToggle />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          GLOBAL LEADERBOARD
        </Text>

        {/* Podium */}
        {renderPodium()}

        {/* Progress Bar */}
        <View style={[styles.progressBar, {
          backgroundColor: isDarkMode ? '#3a3a3a' : '#d0d0d0',
        }]} />

        {/* Current User Card */}
        {currentUserData && (
          <View style={[styles.currentUserCard, {
            backgroundColor: '#4A90E2',
          }]}>
            <View style={styles.leaderboardLeft}>
              <View style={[styles.positionCircle, {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
              }]}>
                <Text style={[styles.positionText, { color: '#fff' }]}>
                  {leaderboard.findIndex(u => u.uid === currentUserData.uid) + 1 || '-'}
                </Text>
              </View>
              <View>
                <Text style={[styles.usernameText, { color: '#fff', fontWeight: '600' }]}>
                  {currentUserData.username} (You)
                </Text>
                <Text style={[styles.scoreText, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                  {currentUserData.score} points
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Leaderboard List */}
        <View style={styles.leaderboardList}>
          {leaderboard.length === 0 ? (
            <Text style={[styles.emptyText, { color: isDarkMode ? '#888' : '#666' }]}>
              No users on leaderboard yet
            </Text>
          ) : (
            leaderboard.map((user) => {
              const isCurrentUser = user.uid === auth.currentUser?.uid;

              return (
                <View
                  key={user.uid}
                  style={[styles.leaderboardItem, {
                    backgroundColor: isCurrentUser
                      ? 'rgba(74, 144, 226, 0.2)'
                      : isDarkMode ? '#2a2a2a' : '#f5f5f5',
                    borderWidth: isCurrentUser ? 2 : 0,
                    borderColor: '#4A90E2',
                  }]}
                >
                  <View style={styles.leaderboardLeft}>
                    <View style={[styles.positionCircle, {
                      backgroundColor: isCurrentUser
                        ? '#4A90E2'
                        : isDarkMode ? '#3a3a3a' : '#e0e0e0',
                    }]}>
                      <Text style={[styles.positionText, { 
                        color: isCurrentUser ? '#fff' : theme.text 
                      }]}>
                        {user.position}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.usernameText, { color: theme.text }]}>
                        {user.username}
                        {isCurrentUser && ' (You)'}
                      </Text>
                      <Text style={[styles.scoreText, { color: isDarkMode ? '#888' : '#666' }]}>
                        {user.score} points
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
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
    marginBottom: 20,
  },
  podiumSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 20,
    gap: 10,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  crownIcon: {
    marginBottom: 5,
  },
  podiumAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  podiumUsername: {
    marginBottom: 5,
    textAlign: 'center',
  },
  podiumPlatform: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 20,
  },
  currentUserCard: {
    padding: 18,
    borderRadius: 20,
    marginBottom: 15,
  },
  leaderboardList: {
    gap: 10,
  },
  leaderboardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
  },
  leaderboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  positionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  usernameText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scoreText: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 30,
  },
});