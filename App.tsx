import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';

import { ThemeProvider } from './src/contexts/ThemeContext';
import { PointsProvider } from './src/contexts/PointsContext';

import { LoadingScreen } from './src/screens/LoadingScreen';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { MainTabNavigator } from './src/navigation/MainTabNavigator';
import { ForgotPasswordScreen } from './src/screens/auth/ForgotPasswordScreen';

import { HealthScreen } from './src/screens/more/HealthScreen';
import { FitnessScreen } from './src/screens/more/FitnessScreen';
import { CompetitiveScreen } from './src/screens/more/CompetitiveScreen';
import { ProfileScreen } from './src/screens/profile/ProfileScreen';
import { SettingsScreen } from './src/screens/settings/SettingsScreen';

import { auth } from './src/config/firebaseConfig';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser ? 'User logged in' : 'No user');
      setUser(currentUser);
      if (initializing) setInitializing(false);
    });

    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => {
      clearTimeout(loadingTimer);
      unsubscribe();
    };
  }, [initializing]);

  if (isLoading || initializing) {
    return <LoadingScreen />;
  }

  console.log('Rendering App with user:', user ? 'Logged in' : 'Not logged in');

  return (
    <ThemeProvider>
      <PointsProvider>
        <NavigationContainer>
          <Stack.Navigator 
            screenOptions={{ headerShown: false }}
          >
            {user ? (
              // User is logged in - show Main screens
              <>
                <Stack.Screen name="Main" component={MainTabNavigator} />
                <Stack.Screen name="Health" component={HealthScreen} />
                <Stack.Screen name="Fitness" component={FitnessScreen} />
                <Stack.Screen name="Competitive" component={CompetitiveScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              </>
            ) : (
              // User is not logged in - show Auth screens
              <Stack.Screen name="Auth" component={AuthNavigator} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PointsProvider>
    </ThemeProvider>
  );
}