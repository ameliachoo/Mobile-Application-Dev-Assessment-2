import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors/Colors';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';

export const LoginScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');
    
    if (!email || !password) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      console.log('Attempting login with email:', email);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log('User logged in successfully:', userCredential.user.uid);
      console.log('Waiting for auth state to update to trigger navigation...');
      
    } catch (error: any) {
      console.log('Login error:', error.code);
      
      let errorMsg = 'Failed to log in. Please try again.';
      
      switch (error.code) {
        case 'auth/invalid-credential':
          errorMsg = 'Invalid email or password.';
          break;
        case 'auth/user-not-found':
          errorMsg = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMsg = 'Incorrect password.';
          break;
        case 'auth/invalid-email':
          errorMsg = 'Invalid email format.';
          break;
        case 'auth/network-request-failed':
          errorMsg = 'Network error. Check your connection.';
          break;
        case 'auth/too-many-requests':
          errorMsg = 'Too many attempts. Try again later';
          break;
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

const handleForgotPassword = () => {
  navigation.navigate('ForgotPassword');
};

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>
          Sign into your account
        </Text>

        {errorMessage ? (
          <View style={[styles.errorContainer, { 
            backgroundColor: isDarkMode ? '#ff4444' : '#ffebee',
          }]}>
            <Text style={[styles.errorText, { 
              color: isDarkMode ? '#fff' : '#c62828',
            }]}>
              {errorMessage}
            </Text>
          </View>
        ) : null}
        
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
          placeholder="Password"
          placeholderTextColor={isDarkMode ? '#888' : '#999'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />
        
        <TouchableOpacity 
          style={styles.forgotButton}
          onPress={handleForgotPassword}
          disabled={loading}
        >
          <Text style={[styles.forgotText, { color: theme.textSecondary }]}>
            Forgot your password?
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.button, 
            { backgroundColor: theme.buttonPrimary },
            loading && styles.buttonDisabled
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.buttonPrimaryText} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>
              Login
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.signupText, { color: theme.textSecondary }]}>
          Don't have an account? <Text style={styles.signupTextBold}>Sign up</Text>
        </Text>
        
        <TouchableOpacity 
          style={[styles.signupButton, { 
            backgroundColor: theme.buttonSecondary,
            borderColor: theme.buttonSecondaryBorder 
          }]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={[styles.signupButtonText, { color: theme.buttonSecondaryBorder }]}>
            Sign Up
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
  errorContainer: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
  },
  forgotButton: {
    alignSelf: 'center',
    marginBottom: 15,
  },
  forgotText: {
    fontSize: 14,
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
  signupText: {
    fontSize: 14,
    marginTop: 20,
    marginBottom: 10,
  },
  signupTextBold: {
    fontWeight: 'bold',
  },
  signupButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});