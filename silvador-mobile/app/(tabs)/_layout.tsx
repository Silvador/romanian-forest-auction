import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';
import { CustomTabBar } from '../../components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Licitatii' }} />
      <Tabs.Screen name="dashboard" options={{ title: 'Panou' }} />
      <Tabs.Screen name="market" options={{ title: 'Piata' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerte' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
