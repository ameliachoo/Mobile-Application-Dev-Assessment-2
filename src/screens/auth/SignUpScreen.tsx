import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors/Colors';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';

export const SignUpScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !username || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match!');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        username: username,
        email: email,
        createdAt: new Date().toISOString(),
      });

      console.log('User created successfully:', user.uid);
      
      Alert.alert('Success', 'Account created successfully!');

    } catch (error: any) {
      console.error('Sign up error:', error);
      
      let errorMessage = 'Failed to create account. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please login or use a different email.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use a stronger password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
      }
      
      Alert.alert('Sign Up Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>
          Create your account
        </Text>
        
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.inputBackground,
            color: theme.text 
          }]}
          placeholder="Email"
          placeholderTextColor={isDarkMode ? '#888' : '#999'}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.inputBackground,
            color: theme.text 
          }]}
          placeholder="Username"
          placeholderTextColor={isDarkMode ? '#888' : '#999'}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!loading}
        />
        
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.inputBackground,
            color: theme.text 
          }]}
          placeholder="Password"
          placeholderTextColor={isDarkMode ? '#888' : '#999'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />
        
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.inputBackground,
            color: theme.text 
          }]}
          placeholder="Repeat Password"
          placeholderTextColor={isDarkMode ? '#888' : '#999'}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />
        
        <TouchableOpacity 
          style={[
            styles.button, 
            { backgroundColor: theme.buttonPrimary },
            loading && styles.buttonDisabled
          ]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.buttonPrimaryText} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>
              Sign Up
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.loginText, { color: theme.textSecondary }]}>
          Already have an account? <Text style={styles.loginTextBold}>Login</Text>
        </Text>
        
        <TouchableOpacity 
          style={[styles.loginButton, { 
            backgroundColor: theme.buttonSecondary,
            borderColor: theme.buttonSecondaryBorder 
          }]}
          onPress={handleBackToLogin}
          disabled={loading}
        >
          <Text style={[styles.loginButtonText, { color: theme.buttonSecondaryBorder }]}>
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  loginText: {
    fontSize: 14,
    marginTop: 20,
    marginBottom: 10,
  },
  loginTextBold: {
    fontWeight: 'bold',
  },
  loginButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});