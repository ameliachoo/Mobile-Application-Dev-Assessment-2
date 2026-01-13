import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

type BottomTabBarProps = {
  state: any;
  navigation: any;
};

/**
 * BottomTabBar Component
 * 
 *  - a custom bottom navigation bar with an expandable more menu
 *  - circular highlight that appears behind the icon that is selected
 *  - supports light and dark mode
 */
export const BottomTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const { isDarkMode } = useTheme();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // define main navigation tabs and their icons.
  const tabs = [
    { name: 'Pet', icon: 'heart' },
    { name: 'Tasks', icon: 'clipboard' },
    { name: 'Home', icon: 'home' },
    { name: 'Shop', icon: 'gift' },
  ];

  // theme aware colour config.
  const barColor = isDarkMode ? '#ffffff' : '#1a1a1a';
  const menuColor = isDarkMode ? '#f5f5f5' : '#e8e8e8';

  /**
   *  toggles the visibility of the more options in the menu.
   */
  const handleMorePress = () => {
    setShowMoreMenu(!showMoreMenu);
  };

  /**
   *  calculates the horizontal position for the 'currently active' bar circle indicator.
   */
  const totalItems = tabs.length + 1; // 1+ for the 'more' button.
  const getCirclePosition = (index: number) => {
    const itemWidth = 100 / totalItems;
    return itemWidth * index + itemWidth / 2;
  };

  return (
    <View style={styles.container}>
      {/* expandable more menu with additional navigation options. */}
      {showMoreMenu && (
        <View style={[styles.moreMenu, { backgroundColor: menuColor }]}>
          <TouchableOpacity 
            style={styles.moreMenuItem}
            onPress={() => {
              setShowMoreMenu(false);
              navigation.navigate('Competitive');
            }}
          >
            <Ionicons 
              name="trophy" 
              size={26} 
              color={isDarkMode ? '#1a1a1a' : '#666'} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.moreMenuItem}
            onPress={() => {
              setShowMoreMenu(false);
              navigation.navigate('Fitness');
            }}
          >
            <Ionicons 
              name="barbell" 
              size={26} 
              color={isDarkMode ? '#1a1a1a' : '#666'} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.moreMenuItem}
            onPress={() => {
              setShowMoreMenu(false);
              navigation.navigate('Health');
            }}
          >
            <Ionicons 
              name="heart-circle" 
              size={26} 
              color={isDarkMode ? '#1a1a1a' : '#666'} 
            />
          </TouchableOpacity>
        </View>
      )}

      {/* circle indicator layer that highlights the active part of the bar. */}
      <View style={styles.circleLayer}>
        {tabs.map((tab, index) => {
          const isFocused = state.index === index;
          const position = getCirclePosition(index);
          
          // only render circle for the currently active tab.
          return isFocused ? (
            <View
              key={tab.name}
              style={[
                styles.activeCircle,
                { 
                  backgroundColor: barColor,
                  left: `${position}%`,
                }
              ]}
            />
          ) : null;
        })}
      </View>

      {/* main nav bar. */}
      <View style={[styles.bottomNav, { 
        backgroundColor: barColor,}]}>
        {/* render the main nav tabs. */}
        {tabs.map((tab, index) => {
          const isFocused = state.index === index;
          
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.navItem}
              onPress={() => navigation.navigate(tab.name)}
            >
              <Ionicons 
                name={tab.icon as any}
                size={28} 
                color={isFocused 
                  ? (isDarkMode ? '#1a1a1a' : '#fff')
                  : (isDarkMode ? '#666' : '#b0b0b0')
                } 
              />
              <Text style={[
                styles.navText, 
                { 
                  color: isFocused 
                    ? (isDarkMode ? '#1a1a1a' : '#fff')
                    : (isDarkMode ? '#666' : '#b0b0b0'),
                  fontWeight: isFocused ? '600' : 'normal'
                }
              ]}>
                {tab.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* more button that opens additional nav options (fitness heath competitive etc.) */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={handleMorePress}
        >
          <Ionicons 
            name="ellipsis-horizontal-circle" 
            size={28} 
            color={showMoreMenu 
              ? (isDarkMode ? '#1a1a1a' : '#fff')
              : (isDarkMode ? '#666' : '#b0b0b0')
            } 
          />
          <Text style={[
            styles.navText, 
            { 
              color: showMoreMenu 
                ? (isDarkMode ? '#1a1a1a' : '#fff')
                : (isDarkMode ? '#666' : '#b0b0b0'),
              fontWeight: showMoreMenu ? '600' : 'normal'
            }
          ]}>
            More
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// style sheet
const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  moreMenu: {
    position: 'absolute',
    right: '2%',
    bottom: 115,
    width: 60,
    borderRadius: 15,
    padding: 10,
    flexDirection: 'column',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  moreMenuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  circleLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 1,
  },
  activeCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    top: -20,
    transform: [{ translateX: -45 }],
  },
  bottomNav: {
    flexDirection: 'row',
    height: 110,
    paddingBottom: 0,
    paddingTop: 20,
    marginBottom: 0,
    zIndex: 2,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  navText: {
    fontSize: 12,
    marginTop: 8,
  },
});