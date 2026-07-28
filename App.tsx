import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme as RNDarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CalculatorScreen from './src/screens/CalculatorScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import VoiceScreen from './src/screens/VoiceScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import StairScreen from './src/screens/StairScreen';

const Stack = createNativeStackNavigator();

const theme = {
  ...RNDarkTheme,
  colors: {
    ...RNDarkTheme.colors,
    primary: '#F59E0B',
    background: '#0A0A0A',
    card: '#141414',
    text: '#FAFAFA',
    border: 'rgba(255,255,255,0.08)',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={theme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0A0A0A' },
          }}
        >
          <Stack.Screen name="Projects" component={ProjectsScreen} />
          <Stack.Screen name="Calculator" component={CalculatorScreen} />
          <Stack.Screen name="Voice" component={VoiceScreen} />
          <Stack.Screen name="Stair" component={StairScreen} />
          <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'modal' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
