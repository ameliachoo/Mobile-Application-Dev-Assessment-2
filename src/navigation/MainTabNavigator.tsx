import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PetScreen } from '../screens/pet/PetScreen';
import { TasksScreen } from '../screens/tasks/TasksScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ShopScreen } from '../screens/shop/ShopScreen';
import { BottomTabBar } from '../components/common/BottomTabBar';

const Tab = createBottomTabNavigator();

/**
 * MainTabNavigator Component
 * 
 * - navigation container for the main application screens.
 * - uses the custom bottom tab bar.
 * 
 * - pet - virtual pet management and interaction
 * - tasks - task list and completion tracking
 * - home - main dashboard (initial route)
 * - shop - in-app shop for purchases
 */
export const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Home"
    >
      <Tab.Screen name="Pet" component={PetScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
    </Tab.Navigator>
  );
};