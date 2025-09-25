import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UserService from '../services/userService';

const colors = {
  primary: '#004b35',
  secondary: '#266b52',
  accent: '#4d8b70',
  background: '#f9f7f3',
  surface: '#ffffff',
  text: '#2d2926',
  textSecondary: '#4d4742',
  error: '#4c1f28',
  success: '#266b52',
};

export default function TodosScreen() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [editText, setEditText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      // Load from server first
      const serverTodos = await UserService.loadUserTodosFromServer();
      if (serverTodos && serverTodos.length > 0) {
        setTodos(serverTodos);
      } else {
        // Fallback to local storage
        const localTodos = await UserService.loadUserData('todos', []);
        if (localTodos && localTodos.length > 0) {
          setTodos(localTodos);
          // Sync to server
          await UserService.saveUserTodosToServer(localTodos);
        } else {
          // Initialize with default todos
          const defaultTodos = [
            { id: 1, text: 'Review Q4 credit reports', completed: false },
            { id: 2, text: 'Schedule client calls', completed: false },
            { id: 3, text: 'Update candidate profiles', completed: false },
          ];
          setTodos(defaultTodos);
          await saveTodos(defaultTodos);
        }
      }
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  };

  const saveTodos = async (todosToSave) => {
    try {
      // Save to local storage
      await UserService.saveUserData('todos', todosToSave);
      // Save to server
      await UserService.saveUserTodosToServer(todosToSave);
    } catch (error) {
      console.error('Error saving todos:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodos();
    setRefreshing(false);
  };

  const addTodo = async () => {
    if (!newTodo.trim()) {
      Alert.alert('Error', 'Please enter a todo item');
      return;
    }

    const newTodoItem = {
      id: Date.now(),
      text: newTodo.trim(),
      completed: false,
    };

    const updatedTodos = [...todos, newTodoItem];
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
    setNewTodo('');
    setIsAddingTodo(false);
  };

  const toggleTodo = async (id) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  };

  const deleteTodo = async (id) => {
    Alert.alert(
      'Delete Todo',
      'Are you sure you want to delete this todo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedTodos = todos.filter(todo => todo.id !== id);
            setTodos(updatedTodos);
            await saveTodos(updatedTodos);
          },
        },
      ]
    );
  };

  const startEditing = (todo) => {
    setEditingTodo(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = async () => {
    if (!editText.trim()) {
      Alert.alert('Error', 'Please enter a todo item');
      return;
    }

    const updatedTodos = todos.map(todo =>
      todo.id === editingTodo ? { ...todo, text: editText.trim() } : todo
    );
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
    setEditingTodo(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingTodo(null);
    setEditText('');
  };

  const pendingCount = todos.filter(todo => !todo.completed).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Todos</Text>
        <Text style={styles.headerSubtitle}>
          {pendingCount} pending • {todos.length - pendingCount} completed
        </Text>
      </View>

      {!isAddingTodo ? (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddingTodo(true)}
        >
          <Text style={styles.addButtonText}>+ Add New Todo</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.addTodoContainer}>
          <TextInput
            style={styles.addTodoInput}
            placeholder="Enter new todo..."
            placeholderTextColor={colors.textSecondary}
            value={newTodo}
            onChangeText={setNewTodo}
            autoFocus
          />
          <View style={styles.addTodoActions}>
            <TouchableOpacity
              style={[styles.addTodoButton, styles.cancelButton]}
              onPress={() => {
                setIsAddingTodo(false);
                setNewTodo('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addTodoButton, styles.saveButton]}
              onPress={addTodo}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView 
        style={styles.todosContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {todos.map((todo, index) => (
          <View key={`todo-${todo.id}-${index}`} style={styles.todoItem}>
            <TouchableOpacity
              style={styles.todoCheckbox}
              onPress={() => toggleTodo(todo.id)}
            >
              <Text style={styles.checkboxText}>
                {todo.completed ? '■' : '□'}
              </Text>
            </TouchableOpacity>
            
            {editingTodo === todo.id ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  autoFocus
                  multiline
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.editButton, styles.cancelEditButton]}
                    onPress={cancelEdit}
                  >
                    <Text style={styles.cancelEditButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editButton, styles.saveEditButton]}
                    onPress={saveEdit}
                  >
                    <Text style={styles.saveEditButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.todoTextContainer}
                  onPress={() => startEditing(todo)}
                >
                  <Text style={[
                    styles.todoText,
                    todo.completed && styles.todoTextCompleted
                  ]}>
                    {todo.text}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteTodo(todo.id)}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ))}
        
        {todos.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No todos yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your first task to get started</Text>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    padding: 18,
    margin: 20,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 16,
  },
  addButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  addTodoContainer: {
    backgroundColor: colors.surface,
    margin: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  addTodoInput: {
    borderWidth: 1,
    borderColor: colors.accent + '30',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 15,
  },
  addTodoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  addTodoButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.textSecondary + '20',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveButtonText: {
    color: colors.surface,
    fontWeight: '600',
  },
  todosContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  todoItem: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  todoCheckbox: {
    marginRight: 15,
  },
  checkboxText: {
    fontSize: 20,
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
    color: colors.error,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  todoTextContainer: {
    flex: 1,
    paddingVertical: 4,
  },
  editContainer: {
    flex: 1,
    marginRight: 10,
  },
  editInput: {
    borderWidth: 1,
    borderColor: colors.accent + '30',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelEditButton: {
    backgroundColor: colors.textSecondary + '20',
  },
  saveEditButton: {
    backgroundColor: colors.primary,
  },
  cancelEditButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveEditButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
});
