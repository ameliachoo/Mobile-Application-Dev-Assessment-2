import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

/**
 * User Statistics Interface
 * 
 * - represents all user statistics stored in Firestore.
 * - tracks points, tasks, streaks, and timestamps.
 */
interface UserStats {
  heartPoints: number;
  totalTasksCompleted: number;
  dailyStreak: number;
  lastDailyTaskDate: string | null;
  lastUpdated: string;
}

/**
 * Points Context Interface
 * 
 * - defines all available methods and states for managing user points and statistics.
 */
interface PointsContextType {
  heartPoints: number;
  totalTasksCompleted: number;
  dailyStreak: number;
  loading: boolean;
  addPoints: (points: number, isDailyTask?: boolean) => Promise<void>;
  subtractPoints: (points: number) => Promise<boolean>;
  incrementTasksCompleted: () => Promise<void>;
  refreshPoints: () => Promise<void>;
}

// create the points context.
const PointsContext = createContext<PointsContextType | undefined>(undefined);
// points configuration constants.
export const POINTS_PER_TASK = 20;
export const DAILY_TASK_BASE_POINTS = 10; 
export const STREAK_BONUS_MULTIPLIER = 2; 

/**
 * PointsProvider Component
 * 
 * - global state provider for managing user points, task completion, and daily streaks.
 * - automatically syncs with Firestore and maintains both userStats and users collections.
 * 
 * - real-time points tracking
 * - daily streak management with automatic reset
 * - task completion counting
 * - leaderboard score sync
 */
export const PointsProvider = ({ children }: { children: ReactNode }) => {
  // state management for stats.
  const [heartPoints, setHeartPoints] = useState(0);
  const [totalTasksCompleted, setTotalTasksCompleted] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [loading, setLoading] = useState(true);

/**
  * Auth Listener
  * 
  * - monitors user authentication and loads or resets stats accordingly.
  */
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadUserStats(user.uid);
      } else {
        setHeartPoints(0);
        setTotalTasksCompleted(0);
        setDailyStreak(0);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Load User Stats
   * 
   * - fetches user stats from the userStats collection.
   * - creates initial stats document if it doesn't exist yet.
   * - checks and updates daily streak based on last activity.
   */
  const loadUserStats = async (userId: string) => {
    setLoading(true);
    try {
      const userStatsRef = doc(db, 'userStats', userId);
      const docSnap = await getDoc(userStatsRef);

      if (docSnap.exists()) {
        // load existing user stats
        const data = docSnap.data() as UserStats;
        setHeartPoints(data.heartPoints || 0);
        setTotalTasksCompleted(data.totalTasksCompleted || 0);
        
        // verify and update streak (will reset if you miss a day).
        const streak = await checkAndUpdateStreak(data.dailyStreak || 0, data.lastDailyTaskDate);
        setDailyStreak(streak);
      } else {
        // initialise new user with default stats
        const initialStats: UserStats = {
          heartPoints: 0,
          totalTasksCompleted: 0,
          dailyStreak: 0,
          lastDailyTaskDate: null,
          lastUpdated: new Date().toISOString(),
        };
        await setDoc(userStatsRef, initialStats);
        setHeartPoints(0);
        setTotalTasksCompleted(0);
        setDailyStreak(0);
      }
    } catch (error) {
      console.log('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check and Update Daily Streak
   * 
   * - validates the users daily streak based on the last task completion date.
   * - resets streak to 0 if more than one day has passed since last daily task.
   * 
   * logic
   * - if same day - streak maintained
   * - if next day - streak increases by one
   * - 2 day gap - streak resets to 0
   */
  const checkAndUpdateStreak = async (currentStreak: number, lastDate: string | null): Promise<number> => {
    if (!lastDate) return currentStreak;
    const user = auth.currentUser;

    if (!user) return currentStreak;
    // normalise dates to midnight for accurate day comparison.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastTaskDate = new Date(lastDate);
    lastTaskDate.setHours(0, 0, 0, 0);

    // calculate day difference.
    const daysDifference = Math.floor((today.getTime() - lastTaskDate.getTime()) / (1000 * 60 * 60 * 24));

    // reset streak if the user misses a day.
    if (daysDifference > 1) {
      const userStatsRef = doc(db, 'userStats', user.uid);
      await updateDoc(userStatsRef, {
        dailyStreak: 0,
        lastUpdated: new Date().toISOString(),
      });
      return 0;
    }
    return currentStreak;
  };

  /**
   * Calculate Daily Task Points 
   * 
   * - determines points awarded for completing a daily task based on current streak.
   * - math = base number of points + (streak * multiplier)
   */
  const calculateDailyTaskPoints = (currentStreak: number): number => {
    return DAILY_TASK_BASE_POINTS + (currentStreak * STREAK_BONUS_MULTIPLIER);
  };

   /**
   * Sync Score to Leaderboard
   * 
   * - updates the user's score for leaderboard display.
   * - this keeps the leaderboard in sync with the userStats collection.
   */
  const syncScoreToLeaderboard = async (userId: string, newScore: number) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          score: newScore,
        });
        console.log(`✅ Synced score (${newScore}) to leaderboard for user ${userId}`);
      } else {
        console.log(`⚠️ User document not found in 'users' collection for ${userId}`);
      }
    } catch (error) {
      console.log('Error syncing score to leaderboard:', error);
    }
  };

  /**
   * Add Points to User Account
   * 
   * - adds points to the user's total heart points.
   * - handles special logic for daily tasks (like bonuses.)
   * - automatically syncs updated score to leaderboard.
   */
  const addPoints = async (points: number, isDailyTask: boolean = false) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      let pointsToAdd = points;
      let newStreak = dailyStreak;
      const today = new Date().toISOString().split('T')[0]; 

      if (isDailyTask && points > 0) {
        const userStatsRef = doc(db, 'userStats', user.uid);
        const docSnap = await getDoc(userStatsRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserStats;
          const lastDate = data.lastDailyTaskDate;

          if (lastDate !== today) {
            newStreak = dailyStreak + 1;
            setDailyStreak(newStreak);
            pointsToAdd = calculateDailyTaskPoints(newStreak);

            await updateDoc(userStatsRef, {
              lastDailyTaskDate: today,
              dailyStreak: newStreak,
            });
          } else {
            pointsToAdd = DAILY_TASK_BASE_POINTS;
          }
        }
      }
      
      // update local state with the new points total
      const newPoints = Math.max(0, heartPoints + pointsToAdd);
      setHeartPoints(newPoints);

      // update userStats collection
      const userStatsRef = doc(db, 'userStats', user.uid);
      await updateDoc(userStatsRef, {
        heartPoints: newPoints,
        lastUpdated: new Date().toISOString(),
      });
      // sync to leaderboard for rank updates.
      await syncScoreToLeaderboard(user.uid, newPoints);
      
    } catch (error) {
      console.log('Error adding points:', error);
      setHeartPoints(heartPoints);
    }
  };

  /**
   * Subtract Points
   * 
   * - deducts points from the user's heart points, for example for shop purchases.
   * - validates that user has enough points before deducting.
   * - automatically syncs updated score to leaderboard.
   */
  const subtractPoints = async (points: number): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) return false;
    // validate that the player has enough points.
    if (heartPoints < points) {
      return false;
    }

    try {
      const newPoints = heartPoints - points;
      setHeartPoints(newPoints);

      // update userStats collection.
      const userStatsRef = doc(db, 'userStats', user.uid);
      await updateDoc(userStatsRef, {
        heartPoints: newPoints,
        lastUpdated: new Date().toISOString(),
      });

      // sync to leaderboard.
      await syncScoreToLeaderboard(user.uid, newPoints);
      return true;

    } catch (error) {
      console.log('Error subtracting points:', error);
      setHeartPoints(heartPoints);
      return false;
    }
  };

  /**
   * Increment Tasks Completed Counter
   * 
   * - increases the user's total tasks completed count by 1.
   * - this is separate from points and used for stats and level tracking.
   */
  const incrementTasksCompleted = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const newTotal = totalTasksCompleted + 1;
      setTotalTasksCompleted(newTotal);

      const userStatsRef = doc(db, 'userStats', user.uid);
      await updateDoc(userStatsRef, {
        totalTasksCompleted: newTotal,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.log('Error incrementing tasks completed:', error);
      // reverts to previous state if it errors.
      setTotalTasksCompleted(totalTasksCompleted);
    }
  };

  /**
   * Refresh Points from Firestore
   * 
   * - manually reloads all user statistics from the database.
   * - just used for resolving discrepencies :)
   */
  const refreshPoints = async () => {
    const user = auth.currentUser;
    if (!user) return;

    await loadUserStats(user.uid);
  };

  return (
    <PointsContext.Provider
      value={{
        heartPoints,
        totalTasksCompleted,
        dailyStreak,
        loading,
        addPoints,
        subtractPoints,
        incrementTasksCompleted,
        refreshPoints,
      }}
    >
      {children}
    </PointsContext.Provider>
  );
};

/**
 * usePoints Hook
 * 
 * - custom hook to access the points context.
 */
export const usePoints = () => {
  const context = useContext(PointsContext);
  if (context === undefined) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
};