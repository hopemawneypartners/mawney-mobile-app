import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mawney Partners</Text>
      <Text style={styles.subtitle}>Web App is Working!</Text>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4d4742',
  },
});