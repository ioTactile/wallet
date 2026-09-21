import { Stack } from 'expo-router/stack';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="accounts" />
      <Stack.Screen name="bank/callback" />
      <Stack.Screen name="records/index" />
      <Stack.Screen name="records/[id]" />
      <Stack.Screen name="records/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="records/category" />
      <Stack.Screen name="records/select-accounts" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
