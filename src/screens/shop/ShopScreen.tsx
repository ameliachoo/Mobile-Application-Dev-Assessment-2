import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors/Colors';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { usePoints } from '../../contexts/PointsContext';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  category: 'pet' | 'theme' | 'powerup' | 'boost';
  duration?: number; 
}

interface UserInventory {
  ownedItems: string[];
  activeBoosts: {
    itemId: string;
    expiresAt: string;
  }[];
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'pet_hat',
    name: 'Fancy Hat',
    description: 'A stylish hat for your pet',
    price: 100,
    icon: 'hat',
    category: 'pet',
  },
  {
    id: 'pet_bow',
    name: 'Cute Bow',
    description: 'An adorable bow tie',
    price: 80,
    icon: 'bowtie',
    category: 'pet',
  },
  {
    id: 'pet_sunglasses',
    name: 'Cool Sunglasses',
    description: 'Your pet will look so cool!',
    price: 150,
    icon: 'glasses',
    category: 'pet',
  },
  {
    id: 'pet_crown',
    name: 'Royal Crown',
    description: 'Fit for a champion pet',
    price: 500,
    icon: 'trophy',
    category: 'pet',
  },
  {
    id: 'double_points',
    name: '2x Points Boost',
    description: 'Earn double points for 24 hours',
    price: 200,
    icon: 'flash',
    category: 'powerup',
    duration: 24,
  },
  {
    id: 'triple_points',
    name: '3x Points Boost',
    description: 'Earn triple points for 12 hours',
    price: 400,
    icon: 'flash',
    category: 'powerup',
    duration: 12,
  },
  {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    description: 'Protect your streak for 1 day',
    price: 150,
    icon: 'shield',
    category: 'powerup',
    duration: 24,
  },
  {
    id: 'auto_complete',
    name: 'Auto-Complete Token',
    description: 'Instantly complete any task',
    price: 300,
    icon: 'checkmark-done',
    category: 'powerup',
  },
  {
    id: 'theme_ocean',
    name: 'Ocean Theme',
    description: 'Cool blue ocean colors',
    price: 250,
    icon: 'water',
    category: 'theme',
  },
  {
    id: 'theme_sunset',
    name: 'Sunset Theme',
    description: 'Warm sunset gradient',
    price: 250,
    icon: 'sunny',
    category: 'theme',
  },
  {
    id: 'theme_forest',
    name: 'Forest Theme',
    description: 'Fresh green forest vibes',
    price: 250,
    icon: 'leaf',
    category: 'theme',
  },
  {
    id: 'energy_drink',
    name: 'Energy Drink',
    description: '+500 bonus steps counted',
    price: 50,
    icon: 'fitness',
    category: 'boost',
  },
  {
    id: 'motivation_boost',
    name: 'Motivation Boost',
    description: 'Unlock 3 random tasks',
    price: 100,
    icon: 'bulb',
    category: 'boost',
  },
];

export const ShopScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const { heartPoints, subtractPoints, refreshPoints } = usePoints();

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'pet' | 'theme' | 'powerup' | 'boost'>('all');
  const [inventory, setInventory] = useState<UserInventory>({ ownedItems: [], activeBoosts: [] });
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const inventoryRef = doc(db, 'userInventory', user.uid);
      const docSnap = await getDoc(inventoryRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserInventory;
        
        const activeBoosts = data.activeBoosts?.filter(boost => 
          new Date(boost.expiresAt) > new Date()
        ) || [];

        setInventory({
          ownedItems: data.ownedItems || [],
          activeBoosts: activeBoosts,
        });

        if (activeBoosts.length !== data.activeBoosts?.length) {
          await updateDoc(inventoryRef, { activeBoosts });
        }
      } else {
        const initialInventory: UserInventory = {
          ownedItems: [],
          activeBoosts: [],
        };
        await setDoc(inventoryRef, initialInventory);
      }
    } catch (error) {
      console.log('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to purchase items');
      return;
    }

    if (heartPoints < item.price) {
      Alert.alert('Insufficient Points', `You need ${item.price - heartPoints} more points to purchase this item.`);
      return;
    }

    if (item.category !== 'boost' && item.category !== 'powerup') {
      if (inventory.ownedItems.includes(item.id)) {
        Alert.alert('Already Owned', 'You already own this item!');
        return;
      }
    }

    try {
      const success = await subtractPoints(item.price);
      
      if (!success) {
        Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.');
        return;
      }

      const inventoryRef = doc(db, 'userInventory', user.uid);

      if (item.category === 'powerup' && item.duration) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + item.duration);

        const newBoost = {
          itemId: item.id,
          expiresAt: expiresAt.toISOString(),
        };

        const updatedBoosts = [...inventory.activeBoosts, newBoost];
        
        await updateDoc(inventoryRef, {
          activeBoosts: updatedBoosts,
        });

        setInventory(prev => ({
          ...prev,
          activeBoosts: updatedBoosts,
        }));
      } else {
        const updatedItems = [...inventory.ownedItems, item.id];
        
        await updateDoc(inventoryRef, {
          ownedItems: updatedItems,
        });

        setInventory(prev => ({
          ...prev,
          ownedItems: updatedItems,
        }));
      }
      await refreshPoints();

      Alert.alert('Purchase Successful! 🎉', `You bought ${item.name}!`);
      setShowPurchaseModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.log('Error purchasing item:', error);
      Alert.alert('Error', 'Failed to complete purchase. Please try again.');
    }
  };

  const getIconColor = (isDark: boolean) => {
    return isDark ? '#888' : '#666';
  };

  const filteredItems = selectedCategory === 'all' 
    ? SHOP_ITEMS 
    : SHOP_ITEMS.filter(item => item.category === selectedCategory);

  const isItemOwned = (itemId: string) => {
    return inventory.ownedItems.includes(itemId);
  };

  const isBoostActive = (itemId: string) => {
    return inventory.activeBoosts.some(boost => boost.itemId === itemId);
  };

  const getBoostTimeRemaining = (itemId: string): string => {
    const boost = inventory.activeBoosts.find(b => b.itemId === itemId);
    if (!boost) return '';

    const now = new Date();
    const expires = new Date(boost.expiresAt);
    const hoursLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60));

    return `${hoursLeft}h left`;
  };

  const categories = [
    { id: 'all', name: 'All', icon: 'apps' },
    { id: 'pet', name: 'Pet', icon: 'paw' },
    { id: 'powerup', name: 'Power-ups', icon: 'flash' },
    { id: 'theme', name: 'Themes', icon: 'color-palette' },
    { id: 'boost', name: 'Boosts', icon: 'rocket' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading shop...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.pointsContainer}>
        <View style={[styles.pointsBox, {
          backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8',
        }]}>
          <Ionicons 
            name="heart" 
            size={24} 
            color="#e74c3c"
          />
          <Text style={[styles.pointsText, { color: theme.text }]}>
            {heartPoints}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color={theme.text} />
      </TouchableOpacity>

      <View style={styles.themeToggleContainer}>
        <ThemeToggle />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          SHOP
        </Text>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryTab,
                {
                  backgroundColor: selectedCategory === category.id
                    ? (isDarkMode ? '#fff' : '#1a1a1a')
                    : (isDarkMode ? '#2a2a2a' : '#e8e8e8'),
                },
              ]}
              onPress={() => setSelectedCategory(category.id as any)}
            >
              <Ionicons
                name={category.icon as any}
                size={20}
                color={selectedCategory === category.id
                  ? (isDarkMode ? '#1a1a1a' : '#fff')
                  : (isDarkMode ? '#888' : '#666')
                }
              />
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: selectedCategory === category.id
                      ? (isDarkMode ? '#1a1a1a' : '#fff')
                      : (isDarkMode ? '#888' : '#666'),
                  },
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {inventory.activeBoosts.length > 0 && (
          <View style={[styles.activeBoostsBanner, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
          }]}>
            <Ionicons name="flash" size={20} color={isDarkMode ? '#888' : '#666'} />
            <Text style={[styles.activeBoostsText, { color: theme.text }]}>
              {inventory.activeBoosts.length} active boost{inventory.activeBoosts.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        <View style={styles.itemsGrid}>
          {filteredItems.map((item) => {
            const owned = isItemOwned(item.id);
            const active = isBoostActive(item.id);
            const canAfford = heartPoints >= item.price;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.shopItem, {
                  backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
                  opacity: (owned && item.category !== 'boost' && item.category !== 'powerup') ? 0.6 : 1,
                }]}
                onPress={() => {
                  setSelectedItem(item);
                  setShowPurchaseModal(true);
                }}
              >
                <View style={[styles.itemIconContainer, { 
                  backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0',
                }]}>
                  <Ionicons name={item.icon as any} size={40} color={getIconColor(isDarkMode)} />
                </View>

                <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.itemDescription, { color: isDarkMode ? '#888' : '#666' }]} numberOfLines={2}>
                  {item.description}
                </Text>

                <View style={styles.itemFooter}>
                  {owned && item.category !== 'boost' && item.category !== 'powerup' ? (
                    <View style={styles.ownedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={styles.ownedText}>Owned</Text>
                    </View>
                  ) : active ? (
                    <View style={styles.activeBadge}>
                      <Ionicons name="flash" size={16} color={isDarkMode ? '#888' : '#666'} />
                      <Text style={[styles.activeText, { color: isDarkMode ? '#888' : '#666' }]}>
                        {getBoostTimeRemaining(item.id)}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.priceContainer, {
                      backgroundColor: canAfford ? (isDarkMode ? '#3a3a3a' : '#e0e0e0') : '#ff4444',
                    }]}>
                      <Ionicons name="heart" size={14} color={canAfford ? '#e74c3c' : '#fff'} />
                      <Text style={[styles.priceText, { color: canAfford ? theme.text : '#fff' }]}>
                        {item.price}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={showPurchaseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {
            backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
          }]}>
            {selectedItem && (
              <>
                <View style={[styles.modalIcon, { 
                  backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
                }]}>
                  <Ionicons name={selectedItem.icon as any} size={60} color={getIconColor(isDarkMode)} />
                </View>

                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {selectedItem.name}
                </Text>

                <Text style={[styles.modalDescription, { color: isDarkMode ? '#888' : '#666' }]}>
                  {selectedItem.description}
                </Text>

                {selectedItem.duration && (
                  <Text style={[styles.modalDuration, { color: isDarkMode ? '#888' : '#666' }]}>
                    Duration: {selectedItem.duration} hours
                  </Text>
                )}

                <View style={[styles.modalPrice, {
                  backgroundColor: isDarkMode ? '#2a2a2a' : '#f5f5f5',
                }]}>
                  <Ionicons name="heart" size={24} color="#e74c3c" />
                  <Text style={[styles.modalPriceText, { color: theme.text }]}>
                    {selectedItem.price} points
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, {
                      backgroundColor: isDarkMode ? '#2a2a2a' : '#e0e0e0',
                    }]}
                    onPress={() => {
                      setShowPurchaseModal(false);
                      setSelectedItem(null);
                    }}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.purchaseButton, {
                      backgroundColor: heartPoints >= selectedItem.price ? '#4CAF50' : '#ff4444',
                    }]}
                    onPress={() => handlePurchase(selectedItem)}
                  >
                    <Text style={styles.purchaseButtonText}>
                      {heartPoints >= selectedItem.price ? 'Purchase' : 'Not Enough Points'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  themeToggleContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pointsContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  pointsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    right: 80,
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  categoryScroll: {
    maxHeight: 60,
    marginBottom: 20,
  },
  categoryContainer: {
    gap: 10,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeBoostsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    borderRadius: 15,
  },
  activeBoostsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  shopItem: {
    width: '47%',
    borderRadius: 15,
    padding: 15,
  },
  itemIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  itemDescription: {
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
    minHeight: 32,
  },
  itemFooter: {
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  modalIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  modalDuration: {
    fontSize: 14,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  modalPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    marginBottom: 25,
  },
  modalPriceText: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {},
  purchaseButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});