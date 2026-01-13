import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Loading application...</Text>
      
      <View style={styles.progressBarContainer}>
        <View 
          style={[styles.progressBar, { width: `${progress}%` }]} 
        />
      </View>
      
      <Text style={styles.percentage}>{Math.round(progress)}%</Text>
    </View>
  );
};

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