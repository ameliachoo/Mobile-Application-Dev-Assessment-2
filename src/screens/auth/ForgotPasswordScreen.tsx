import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors/Colors';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig';

/**
 * ForgotPasswordScreen Component
 * 
 * - password recovery screen that allows users to request a password reset email.
 * - validates email format and handles Firebase password reset flow.
 * 
 * - firebase password reset email sending.
 * - success message with automatic navigation back after 3 seconds
 * - still can't tell if this is working o.o
 * 
 */
export const ForgotPasswordScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  
  // form state management
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Handle Password Reset Request
   * 
   * validates email input and sends password reset email via Firebase.
   */
  const handleResetPassword = async () => {
    // clear previous messages
    setErrorMessage('');
    setSuccessMessage('');
    
    // validate that email has an account 
    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    // regex email format validation 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    setLoading(true);

    try {
      // send password reset email with Firebase
      await sendPasswordResetEmail(auth, email);
      
      setSuccessMessage('Password reset email sent! Check your inbox.');
      setEmail('');
      
      setTimeout(() => {
        navigation.goBack();
      }, 3000);
      
    } catch (error: any) {
      console.log('Password reset error:', error.code);
      
      // default error message
      let errorMsg = 'Failed to send reset email. Please try again.';
      
      // different error messages to help the user or me identify the issue
      switch (error.code) {
        case 'auth/user-not-found':
          errorMsg = 'No account found with this email address.';
          break;
        case 'auth/invalid-email':
          errorMsg = 'Invalid email address format.';
          break;
        case 'auth/too-many-requests':
          errorMsg = 'Too many requests. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMsg = 'Network error. Check your connection.';
          break;
      }
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.iconContainer, {
          backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8',
        }]}>
          <Ionicons name="lock-closed" size={60} color={theme.text} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          Forgot Password?
        </Text>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Don't worry! Enter your email address and we will send you a link to reset your password.
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

        {successMessage ? (
          <View style={[styles.successContainer, { 
            backgroundColor: isDarkMode ? '#4CAF50' : '#e8f5e9',
          }]}>
            <Ionicons name="checkmark-circle" size={20} color={isDarkMode ? '#fff' : '#2E7D32'} />
            <Text style={[styles.successText, { 
              color: isDarkMode ? '#fff' : '#2E7D32',
            }]}>
              {successMessage}
            </Text>
          </View>
        ) : null}
        
        {/* email input field - disabled during loading or after success */}
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
          editable={!loading && !successMessage}
        />
        
        {/* send reset link button - shows loading circle of death when active */}
        <TouchableOpacity 
          style={[
            styles.button, 
            { backgroundColor: theme.buttonPrimary },
            (loading || successMessage) && styles.buttonDisabled
          ]}
          onPress={handleResetPassword}
          disabled={loading || !!successMessage}
        >
          {loading ? (
            <ActivityIndicator color={theme.buttonPrimaryText} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>
              Send Reset Link
            </Text>
          )}
        </TouchableOpacity>

        {/* return to login screen link */}
        <TouchableOpacity 
          style={styles.backToLoginButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backToLoginText, { color: theme.textSecondary }]}>
            Remember your password? <Text style={styles.backToLoginTextBold}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// style sheet
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 40,
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 24,
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
  successContainer: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  successText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  backToLoginButton: {
    alignSelf: 'center',
  },
  backToLoginText: {
    fontSize: 14,
    textAlign: 'center',
  },
  backToLoginTextBold: {
    fontWeight: 'bold',
  },
});