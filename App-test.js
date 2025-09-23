import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏢 Mawney Partners</Text>
      <Text style={styles.subtitle}>Company App</Text>
      <Text style={styles.message}>App is working! 🎉</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f7f3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#004b35',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#266b52',
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#2d2926',
  },
});

