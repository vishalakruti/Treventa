import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';

export default function RootLayout() {
  const checkAuth = useAuthStore(state => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
        <Stack.Screen name="(auth)/verify-otp" />
        <Stack.Screen name="(auth)/request-invite" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="venture/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="onboarding" />
      </Stack>
    </>
  );
}
