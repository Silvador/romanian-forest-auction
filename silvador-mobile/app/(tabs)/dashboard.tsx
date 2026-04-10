import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { useAuthContext } from '../../lib/AuthContext';
import { OwnerDashboard } from '../../components/OwnerDashboard';
import { BuyerDashboard } from '../../components/BuyerDashboard';

export default function DashboardScreen() {
  const { user, loading } = useAuthContext();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Panou</Text>
        {user && (
          <Text style={styles.subtitle}>
            {user.role === 'forest_owner' ? 'Proprietar padure' : 'Cumparator'}
          </Text>
        )}
      </View>

      {loading || !user ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : user.role === 'forest_owner' ? (
        <OwnerDashboard />
      ) : (
        <BuyerDashboard />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.05 * 24,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
