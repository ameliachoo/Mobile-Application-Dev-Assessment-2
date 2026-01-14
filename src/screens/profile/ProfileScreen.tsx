import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors/Colors';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';

export const ProfileScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;

  // username state - username is editable.
  const [username, setUsername] = useState('');
  const [displayUsername, setDisplayUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // password change.
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /**
   * Component Initialization Hook
   * 
   * - fetches user data from Firestore when component mounts.
   */
  useEffect(() => {
    fetchUserData();
  }, []);

  /**
   * Fetch User Data
   * 
   * - retrieves the users profile information from Firestore.
   * - currently loads username.
   * - sets loading to false once data is retrieved or if error occurs.
   */
  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // set both username (editable) and displayUsername (saved version).
          setUsername(userData.username || 'User');
          setDisplayUsername(userData.username || 'User');
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Update Username
   * 
   * - validates and updates the user's username in Firestore.
   * - shows confirmation dialog before updating.
   * - reverts to previous username if update fails.
   */
  const handleUpdateUsername = async () => {
    // validate username is not empty.
    if (!username.trim()) {
      Alert.alert('Invalid Username', 'Username cannot be empty.');
      return;
    }

    // check if username has actually changed.
    if (username === displayUsername) {
      Alert.alert('No Changes', 'Username is the same.');
      return;
    }

    // show confirmation dialog.
    Alert.alert(
      'Update Username',
      `Change username to "${username}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setUpdating(true);
            try {
              const user = auth.currentUser;
              if (user) {
                // update username in Firestore.
                await updateDoc(doc(db, 'users', user.uid), {
                  username: username.trim()
                });
                setDisplayUsername(username.trim());
                Alert.alert('Success', 'Username updated successfully.');
              }
            } catch (error) {
              console.error('Error updating username:', error);
              Alert.alert('Error', 'Failed to update username.');
              setUsername(displayUsername);
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  /**
   * Handle Change Password
   *
   * - checks all fields filled.
   * - checks new password at least 6 characters.
   * - checks new password matches confirmation.
   * 
   * - includes error handling
   */
  const handleChangePassword = async () => {
    // validate all password fields are filled.
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }

    // validate minimum password length.
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }

    // validate passwords match.
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    setUpdating(true);
    try {
      const user = auth.currentUser;
      if (user && user.email) {
        // reauthenticate user with current password for security.
        const credential = EmailAuthProvider.credential(
          user.email,
          currentPassword
        );
        await reauthenticateWithCredential(user, credential);

        // update password in Firebase Auth.
        await updatePassword(user, newPassword);

        Alert.alert('Success', 'Password updated successfully.');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      let errorMsg = 'Failed to update password.';
      
      // handle specific Firebase auth error codes.
      switch (error.code) {
        case 'auth/wrong-password':
          errorMsg = 'Current password is incorrect.';
          break;
        case 'auth/weak-password':
          errorMsg = 'New password is too weak.';
          break;
        case 'auth/requires-recent-login':
          errorMsg = 'Please log out and log in again to change password.';
          break;
      }
      
      Alert.alert('Error', errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Handle Logout
   * 
   * - signs out the current user from Firebase Auth.
   */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              console.log('User logged out successfully');
              // navigation will be handled by onAuthStateChanged
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  // show loading indicator while fetching user data.
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* theme toggle button. */}
      <ThemeToggle />
      
      {/* back navigation button. */}
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* screen title. */}
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          PROFILE
        </Text>

        {/* profile picture section - just placeholder :( */}
        <View style={styles.profilePictureSection}>
          <View style={[styles.profilePicture, { 
            backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8' 
          }]}>
            <Ionicons 
              name="person" 
              size={80} 
              color={isDarkMode ? '#666' : '#999'} 
            />
          </View>
          {/* change profile picture button - just placeholder :( */}
          <TouchableOpacity>
            <Text style={[styles.changeText, { color: isDarkMode ? '#888' : '#666' }]}>
              Change Profile Picture
            </Text>
          </TouchableOpacity>
        </View>

        {/* username section with editable input. */}
        <Text style={[styles.label, { color: theme.text }]}>Username</Text>
        <View style={[styles.inputContainer, {
          backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8',
        }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={username}
            onChangeText={setUsername}
            placeholderTextColor={isDarkMode ? '#888' : '#999'}
            editable={!updating}
          />
        </View>

        {/* update username button - disabled if no changes or updating. */}
        <TouchableOpacity 
          onPress={handleUpdateUsername}
          disabled={updating || username === displayUsername}
        >
          <Text style={[
            styles.changeText, 
            { 
              color: (updating || username === displayUsername) 
                ? isDarkMode ? '#444' : '#ccc'
                : isDarkMode ? '#888' : '#666' 
            }
          ]}>
            {updating ? 'Updating...' : 'Update Username'}
          </Text>
        </TouchableOpacity>

        {/* change password button. */}
        <TouchableOpacity 
          style={styles.changeButton}
          onPress={() => setShowPasswordModal(true)}
          disabled={updating}
        >
          <Text style={[styles.changeText, { color: isDarkMode ? '#888' : '#666' }]}>
            Change Password
          </Text>
        </TouchableOpacity>

        {/* logout button with confirmation. */}
        <TouchableOpacity 
          style={[styles.logoutButton, {
            backgroundColor: isDarkMode ? '#f5f5f5' : '#1a1a1a'
          }]}
          onPress={handleLogout}
          disabled={updating}
        >
          <Text style={[styles.logoutText, { color: isDarkMode ? '#1a1a1a' : '#fff' }]}>
            LOGOUT
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* password change modal. */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Change Password
            </Text>

            {/* current password input for reauthentication. */}
            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8',
                color: theme.text 
              }]}
              placeholder="Current Password"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {/* new password input. */}
            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8',
                color: theme.text 
              }]}
              placeholder="New Password"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {/* confirm new password input. */}
            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8',
                color: theme.text 
              }]}
              placeholder="Confirm New Password"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, {
                  backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0'
                }]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={updating}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, {
                  backgroundColor: isDarkMode ? '#f5f5f5' : '#1a1a1a'
                }]}
                onPress={handleChangePassword}
                disabled={updating}
              >
                {/* show loading indicator while updating. */}
                {updating ? (
                  <ActivityIndicator color={isDarkMode ? '#1a1a1a' : '#fff'} />
                ) : (
                  <Text style={[styles.modalButtonText, { 
                    color: isDarkMode ? '#1a1a1a' : '#fff' 
                  }]}>
                    Update
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </View>
  );
};

// style sheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 30,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 5,
  },
  changeText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
  inputContainer: {
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 5,
    marginBottom: 10,
  },
  input: {
    fontSize: 16,
    paddingVertical: 15,
    textAlign: 'center',
  },
  changeButton: {
    marginBottom: 20,
    marginTop: 20,
  },
  logoutButton: {
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 30,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {},
  confirmButton: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});