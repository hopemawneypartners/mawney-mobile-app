import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🌐 Web app starting...');
    console.log('Platform:', Platform.OS);
    
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Mawney Partners</Text>
        <Text style={styles.subtitle}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mawney Partners</Text>
      <Text style={styles.subtitle}>Web App is Working!</Text>
      <Text style={styles.info}>Platform: {Platform.OS}</Text>
      <Text style={styles.info}>Ready for cross-platform features</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f7f3',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#004b35',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4d4742',
    marginBottom: 4,
  },
  info: {
    fontSize: 14,
    color: '#6b6b6b',
    marginBottom: 2,
  },
});
