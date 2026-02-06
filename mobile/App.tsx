import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useCourierStore } from './store';
import AppNavigator from './screens/AppNavigator';
import Toast from 'react-native-toast-message';

export default function App() {
  const { token, loadToken, connect } = useCourierStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await loadToken();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (token) {
      connect();
    }
  }, [token]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppNavigator />
      <Toast />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

