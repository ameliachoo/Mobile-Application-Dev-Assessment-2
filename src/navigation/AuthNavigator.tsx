import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

const AuthStack = createNativeStackNavigator();

/**
 * AuthNavigator Component
 * 
 * - navigation container for authentication related screens.
 * - manages the stack navigation between login, signup, and password recovery.
 * 
 * nav flow >
 * - login (initial route) - once you login you get taken to the home page
 * - signup
 * - forgotPassword
 * 
 * - theme aware backgrounds.
 * - headerless screen navigation.
 * - automatic status bar styling based on theme.
 */
export const AuthNavigator = () => {
  const { isDarkMode } = useTheme();

  return (
    <View style={[styles.container, { 
      backgroundColor: isDarkMode ? '#1a1a1a' : '#fff' 
    }]}>
      <ThemeToggle />
      
      <AuthStack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName="Login"
      >
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="SignUp" component={SignUpScreen} />
        <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </AuthStack.Navigator>
      
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});