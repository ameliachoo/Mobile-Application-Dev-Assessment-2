import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * LoadingScreen Component
 * 
 * - displays a welcome screen with an animated progress bar during app initialisation.
 * - shows loading progress from 0% to 100% like a real app with a smooth anim.
 * - displays while checking auth state and loading app data so it doesn't lag.
 * 
 * - anim timing - updates every 30ms by 2%.
 */
export const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);

  /**
   * Progress Bar Animation Effect
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        // stop at 100% and clear interval.
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // increment by 2% per tick.
        return prev + 2;
      });
    }, 30); // update every 30 ms

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      {/* loading status message.*/}
      <Text style={styles.subtitle}>Loading application...</Text>
      
      {/* progress bar container.*/}
      <View style={styles.progressBarContainer}>
        <View 
          style={[styles.progressBar, { width: `${progress}%` }]} 
        />
      </View>
      
      <Text style={styles.percentage}>{Math.round(progress)}%</Text>
    </View>
  );
};

// style sheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  progressBarContainer: {
    width: '80%',
    height: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
  },
  percentage: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
});