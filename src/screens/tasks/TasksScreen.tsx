import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../styles/colors/Colors';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { auth, db } from '../../config/firebaseConfig';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { usePoints, POINTS_PER_TASK } from '../../contexts/PointsContext';

interface Task {
  id: string;
  title: string;
  subtitle: string;
  completed: boolean;
  icon: string;
  userId: string;
  createdAt: string;
  dueDate?: string;
  repeatType: 'DAILY' | 'WEEKLY' | 'CUSTOM';
  lastCompletedDate?: string;
}

export const TasksScreen = ({ navigation }: any) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const { addPoints, incrementTasksCompleted, dailyStreak } = usePoints();

  const [newTask, setNewTask] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [calendarView, setCalendarView] = useState<'WEEKLY' | 'DAILY' | 'CUSTOM'>('CUSTOM');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadTasks();
    checkAndResetTasks();
  }, []);

  const checkAndResetTasks = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const todayString = new Date().toDateString();

    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (taskDoc) => {
        const task = taskDoc.data() as Task;
        
        if (task.completed && task.lastCompletedDate) {
          const lastCompleted = new Date(task.lastCompletedDate);
          const now = new Date();

          let shouldReset = false;

          if (task.repeatType === 'DAILY') {
            shouldReset = lastCompleted.toDateString() !== now.toDateString();
          } else if (task.repeatType === 'WEEKLY') {
            const daysDiff = Math.floor((now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));
            shouldReset = daysDiff >= 7;
          }

          if (shouldReset) {
            await updateDoc(doc(db, 'tasks', taskDoc.id), {
              completed: false,
              lastCompletedDate: null
            });
          }
        }
      });

      await loadTasks();
    } catch (error) {
      console.log('Error checking task resets:', error);
    }
  };

  const loadTasks = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to view tasks');
      return;
    }

    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const loadedTasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        loadedTasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      
      setTasks(loadedTasks);
    } catch (error) {
      console.log('Error loading tasks:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create tasks');
      return;
    }

    setLoading(true);

    try {
      const taskData = {
        title: newTask,
        subtitle: selectedFilter || 'Keep going!',
        completed: false,
        icon: getIconForFilter(selectedFilter),
        userId: user.uid,
        createdAt: new Date().toISOString(),
        dueDate: calendarView === 'CUSTOM' ? `${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}-${selectedDate}` : null,
        repeatType: calendarView,
        lastCompletedDate: null,
      };

      await addDoc(collection(db, 'tasks'), taskData);
      
      await loadTasks();
      
      setNewTask('');
      setSelectedFilter('');
      
      Alert.alert('Success', 'Task created successfully!');
    } catch (error) {
      console.log('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string, task: Task) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const newCompletedStatus = !task.completed;
      
      await updateDoc(taskRef, {
        completed: newCompletedStatus,
        lastCompletedDate: newCompletedStatus ? new Date().toISOString() : null
      });
      
      if (newCompletedStatus) {
        const isDailyTask = task.repeatType === 'DAILY';
        await addPoints(POINTS_PER_TASK, isDailyTask);
        await incrementTasksCompleted();
      } else {
        await addPoints(-POINTS_PER_TASK, false);
      }
      
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, completed: newCompletedStatus, lastCompletedDate: newCompletedStatus ? new Date().toISOString() : undefined } : t
      ));
    } catch (error) {
      console.log('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const confirmDeleteTask = (taskId: string, taskTitle: string) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${taskTitle}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTask(taskId)
        }
      ]
    );
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      await loadTasks();
    } catch (error) {
      console.log('Error deleting task:', error);
      Alert.alert('Error', 'Failed to delete task');
    }
  };

  const getIconForFilter = (filter: string) => {
    switch (filter) {
      case 'STUDY': return 'book';
      case 'HEALTH': return 'fitness';
      case 'TIDY UP': return 'home';
      default: return 'checkmark-circle';
    }
  };

  const suggestions = [
    { id: 1, title: 'Laundry', filter: 'TIDY UP' },
    { id: 2, title: 'Wash Bed Sheets', filter: 'TIDY UP' },
    { id: 3, title: 'Declutter My Desk', filter: 'TIDY UP' },
    { id: 4, title: 'Take Out Trash', filter: 'TIDY UP' },
    { id: 5, title: 'Read for 30 minutes', filter: 'STUDY' },
    { id: 6, title: 'Do 20 minute workout', filter: 'HEALTH' },
  ];

  const filters = ['STUDY', 'HEALTH', 'TIDY UP'];

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const isToday = (day: number) => {
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return checkDate.toDateString() === today.toDateString();
  };

  const isSelected = (day: number) => {
    return day === selectedDate && 
           currentMonth.getMonth() === today.getMonth() &&
           currentMonth.getFullYear() === today.getFullYear();
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const tasksRemaining = tasks.filter(t => !t.completed).length;

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const monthName = monthNames[date.getMonth()];
    return `${monthName} ${day}, ${year}`;
  };

  const getRepeatText = (task: Task) => {
    if (task.repeatType === 'DAILY') {
      return 'Repeats daily';
    } else if (task.repeatType === 'WEEKLY') {
      return 'Repeats weekly';
    } else if (task.dueDate) {
      return `Due: ${formatDate(task.dueDate)}`;
    }
    return 'One-time task';
  };

  const addSuggestion = async (suggestion: any) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const taskData = {
        title: suggestion.title,
        subtitle: suggestion.filter,
        completed: false,
        icon: getIconForFilter(suggestion.filter),
        userId: user.uid,
        createdAt: new Date().toISOString(),
        dueDate: calendarView === 'CUSTOM' ? `${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}-${selectedDate}` : null,
        repeatType: calendarView,
        lastCompletedDate: null,
      };

      await addDoc(collection(db, 'tasks'), taskData);
      await loadTasks();
      Alert.alert('Success', 'Task added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add task');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemeToggle />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.goalCard, { 
          backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8' 
        }]}>
          <TextInput
            style={[styles.input, { 
              color: theme.text,
              backgroundColor: isDarkMode ? '#3a3a3a' : '#d8d8d8'
            }]}
            placeholder="Enter a new goal..."
            placeholderTextColor={isDarkMode ? '#888' : '#999'}
            value={newTask}
            onChangeText={setNewTask}
            editable={!loading}
          />

          <View style={styles.goalOptions}>
            <View style={styles.optionRow}>
              <Ionicons 
                name="calendar" 
                size={20} 
                color={isDarkMode ? '#888' : '#666'} 
              />
              <Text style={[styles.optionText, { color: isDarkMode ? '#888' : '#666' }]}>
                {calendarView === 'DAILY' && 'Daily task'}
                {calendarView === 'WEEKLY' && 'Weekly task'}
                {calendarView === 'CUSTOM' && `${monthNames[currentMonth.getMonth()]} ${selectedDate}, ${currentMonth.getFullYear()}`}
              </Text>
            </View>
            <View style={styles.optionRow}>
              <Ionicons 
                name="pricetag" 
                size={20} 
                color={isDarkMode ? '#888' : '#666'} 
              />
              <Text style={[styles.optionText, { color: isDarkMode ? '#888' : '#666' }]}>
                {selectedFilter || 'No category'}
              </Text>
            </View>
          </View>
        </View>

        {calendarView === 'CUSTOM' && (
          <View style={[styles.calendarCard, {
            backgroundColor: isDarkMode ? '#2a2a2a' : '#ffffff',
            borderWidth: isDarkMode ? 0 : 1,
            borderColor: isDarkMode ? 'transparent' : '#e0e0e0',
          }]}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity 
                onPress={() => changeMonth(-1)}
                style={[styles.monthArrow, {
                  backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
                }]}
              >
                <Ionicons name="chevron-back" size={20} color={isDarkMode ? '#fff' : '#000'} />
              </TouchableOpacity>
              
              <Text style={[styles.monthText, { color: isDarkMode ? '#fff' : '#000' }]}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              
              <TouchableOpacity 
                onPress={() => changeMonth(1)}
                style={[styles.monthArrow, {
                  backgroundColor: isDarkMode ? '#1a1a1a' : '#f0f0f0',
                }]}
              >
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDaysRow}>
              {weekDays.map((day, index) => (
                <Text key={index} style={[styles.weekDayText, {
                  color: isDarkMode ? '#888' : '#666',
                }]}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {days.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dayCell}
                  onPress={() => day && setSelectedDate(day)}
                  disabled={!day}
                >
                  {day ? (
                    <View style={[
                      styles.dayButton,
                      isSelected(day) && styles.selectedDay,
                      isSelected(day) && isDarkMode && styles.selectedDayDark,
                      isSelected(day) && !isDarkMode && styles.selectedDayLight,
                      isToday(day) && !isSelected(day) && styles.todayDay,
                      isToday(day) && !isSelected(day) && isDarkMode && styles.todayDayDark,
                      isToday(day) && !isSelected(day) && !isDarkMode && styles.todayDayLight,
                    ]}>
                      <Text style={[
                        styles.dayText,
                        { color: isDarkMode ? '#fff' : '#000' },
                        isSelected(day) && styles.selectedDayText,
                        isToday(day) && !isSelected(day) && styles.todayDayText,
                      ]}>
                        {day}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0' },
              calendarView === 'WEEKLY' && styles.toggleButtonActive,
              calendarView === 'WEEKLY' && isDarkMode && styles.toggleButtonActiveDark,
              calendarView === 'WEEKLY' && !isDarkMode && styles.toggleButtonActiveLight,
            ]}
            onPress={() => setCalendarView('WEEKLY')}
          >
            <Text style={[
              styles.toggleButtonText,
              { color: isDarkMode ? '#888' : '#666' },
              calendarView === 'WEEKLY' && styles.toggleButtonTextActive,
              calendarView === 'WEEKLY' && isDarkMode && styles.toggleButtonTextActiveDark,
              calendarView === 'WEEKLY' && !isDarkMode && styles.toggleButtonTextActiveLight,
            ]}>
              WEEKLY
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0' },
              calendarView === 'DAILY' && styles.toggleButtonActive,
              calendarView === 'DAILY' && isDarkMode && styles.toggleButtonActiveDark,
              calendarView === 'DAILY' && !isDarkMode && styles.toggleButtonActiveLight,
            ]}
            onPress={() => setCalendarView('DAILY')}
          >
            <Text style={[
              styles.toggleButtonText,
              { color: isDarkMode ? '#888' : '#666' },
              calendarView === 'DAILY' && styles.toggleButtonTextActive,
              calendarView === 'DAILY' && isDarkMode && styles.toggleButtonTextActiveDark,
              calendarView === 'DAILY' && !isDarkMode && styles.toggleButtonTextActiveLight,
            ]}>
              DAILY
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: isDarkMode ? '#3a3a3a' : '#e0e0e0' },
              calendarView === 'CUSTOM' && styles.toggleButtonActive,
              calendarView === 'CUSTOM' && isDarkMode && styles.toggleButtonActiveDark,
              calendarView === 'CUSTOM' && !isDarkMode && styles.toggleButtonActiveLight,
            ]}
            onPress={() => setCalendarView('CUSTOM')}
          >
            <Text style={[
              styles.toggleButtonText,
              { color: isDarkMode ? '#888' : '#666' },
              calendarView === 'CUSTOM' && styles.toggleButtonTextActive,
              calendarView === 'CUSTOM' && isDarkMode && styles.toggleButtonTextActiveDark,
              calendarView === 'CUSTOM' && !isDarkMode && styles.toggleButtonTextActiveLight,
            ]}>
              CUSTOM
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.suggestionsSection}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#888' : '#666' }]}>
            SUGGESTIONS
          </Text>

          {suggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={[styles.suggestionItem, {
                backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8',
              }]}
              onPress={() => addSuggestion(suggestion)}
            >
              <Text style={[styles.suggestionText, { color: theme.text }]}>
                {suggestion.title}
              </Text>
              <Ionicons 
                name="add-circle" 
                size={28} 
                color={isDarkMode ? '#fff' : '#1a1a1a'} 
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filtersSection}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterButton, {
                backgroundColor: selectedFilter === filter 
                  ? (isDarkMode ? '#fff' : '#1a1a1a')
                  : (isDarkMode ? '#3a3a3a' : '#d0d0d0')
              }]}
              onPress={() => setSelectedFilter(filter === selectedFilter ? '' : filter)}
            >
              <Text style={[styles.filterText, {
                color: selectedFilter === filter 
                  ? (isDarkMode ? '#1a1a1a' : '#fff')
                  : (isDarkMode ? '#888' : '#666')
              }]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.confirmButton, {
            backgroundColor: isDarkMode ? '#f5f5f5' : '#1a1a1a',
            opacity: loading ? 0.5 : 1,
          }]}
          onPress={handleCreateTask}
          disabled={loading}
        >
          <Text style={[styles.confirmText, { color: isDarkMode ? '#1a1a1a' : '#fff' }]}>
            {loading ? 'CREATING...' : 'CONFIRM'}
          </Text>
        </TouchableOpacity>

        {tasks.length > 0 && (
          <View style={styles.myTasksSection}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#888' : '#666' }]}>
              MY TASKS ({tasksRemaining} remaining)
            </Text>

            {tasks.map((task) => (
              <View
                key={task.id}
                style={[styles.taskItem, {
                  backgroundColor: isDarkMode ? '#2a2a2a' : '#e8e8e8',
                }]}
              >
                <TouchableOpacity
                  style={styles.taskLeft}
                  onPress={() => toggleTask(task.id, task)}
                >
                  <View style={[styles.taskIcon, {
                    backgroundColor: isDarkMode ? '#3a3a3a' : '#d0d0d0',
                  }]}>
                    <Ionicons 
                      name={task.icon as any}
                      size={24} 
                      color={isDarkMode ? '#888' : '#666'} 
                    />
                  </View>
                  <View style={styles.taskContent}>
                    <View style={styles.taskTitleRow}>
                      <Text style={[styles.taskTitle, { 
                        color: theme.text,
                        textDecorationLine: task.completed ? 'line-through' : 'none',
                      }]}>
                        {task.title}
                      </Text>
                      {task.repeatType === 'DAILY' && (
                        <View style={styles.streakBadge}>
                          <Ionicons 
                            name="flame" 
                            size={16} 
                            color="#ff6b35"
                          />
                          <Text style={styles.streakText}>{dailyStreak}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.taskSubtitle, { color: isDarkMode ? '#888' : '#666' }]}>
                      {task.subtitle}
                    </Text>
                    <View style={styles.dueDateContainer}>
                      <Ionicons 
                        name={task.repeatType === 'CUSTOM' ? 'calendar-outline' : 'repeat-outline'}
                        size={14} 
                        color={isDarkMode ? '#888' : '#666'} 
                      />
                      <Text style={[styles.dueDateText, { color: isDarkMode ? '#888' : '#666' }]}>
                        {getRepeatText(task)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                
                <View style={styles.taskRight}>
                  <TouchableOpacity onPress={() => toggleTask(task.id, task)}>
                    <View style={[
                      styles.checkbox,
                      {
                        borderColor: task.completed ? 'transparent' : (isDarkMode ? '#666' : '#999'),
                        borderWidth: task.completed ? 0 : 2,
                        backgroundColor: task.completed 
                          ? (isDarkMode ? '#fff' : '#1a1a1a')
                          : 'transparent'
                      }
                    ]}>
                      {task.completed && (
                        <Ionicons 
                          name="checkmark" 
                          size={24} 
                          color={isDarkMode ? '#1a1a1a' : '#fff'} 
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => confirmDeleteTask(task.id, task.title)}>
                    <Ionicons 
                      name="trash-outline" 
                      size={24} 
                      color={isDarkMode ? '#ff6b6b' : '#e74c3c'} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 130,
  },
  goalCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  input: {
    fontSize: 16,
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  goalOptions: {
    gap: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: {
    fontSize: 14,
  },
  calendarCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDayText: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDay: {},
  selectedDayDark: {
    backgroundColor: '#fff',
  },
  selectedDayLight: {
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#000',
  },
  todayDay: {},
  todayDayDark: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  todayDayLight: {
    borderWidth: 2,
    borderColor: '#000',
  },
  dayText: {
    fontSize: 14,
  },
  selectedDayText: {
    fontWeight: '600',
  },
  todayDayText: {
    fontWeight: '600',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {},
  toggleButtonActiveDark: {
    backgroundColor: '#fff',
  },
  toggleButtonActiveLight: {
    backgroundColor: '#000',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleButtonTextActive: {},
  toggleButtonTextActiveDark: {
    color: '#000',
  },
  toggleButtonTextActiveLight: {
    color: '#fff',
  },
  suggestionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 15,
    letterSpacing: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
    marginBottom: 10,
  },
  suggestionText: {
    fontSize: 16,
  },
  filtersSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmButton: {
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  myTasksSection: {
    marginTop: 20,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 25,
    marginBottom: 10,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flex: 1,
  },
  taskIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff6b35',
  },
  taskSubtitle: {
    fontSize: 14,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  dueDateText: {
    fontSize: 12,
  },
  taskRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});