import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * ThemeToggle Component
 * 
 * - button that allows for the theme to be changed from dark to light.
 * - displays a sun icon in dark mode and a moon icon in light mode.
 * - positioned in the top-right corner of the screen.
 */
export const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
      <Ionicons 
        name={isDarkMode ? 'sunny' : 'moon'} 
        size={24} 
        color={isDarkMode ? '#fff' : '#000'} 
      />
    </TouchableOpacity>
  );
};

// style sheet
const styles = StyleSheet.create({
  themeToggle: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});