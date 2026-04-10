import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Logo */}
        <View style={styles.logoRow}>
          <Ionicons name="leaf" size={28} color={Colors.primary} />
          <Text style={styles.logoText}>Romanian Forest</Text>
        </View>

        <Text style={styles.tagline}>Piata de licitatii live pentru lemn din Romania</Text>

        {/* Badges */}
        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <View style={styles.activeDot} />
            <Text style={styles.badgeText}>Licitatii active acum</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.badgeText}>Platforma conforma SUMAL</Text>
          </View>
        </View>

        {/* Role cards */}
        <View style={styles.roles}>
          <Pressable
            style={styles.roleCard}
            onPress={() => router.push({ pathname: '/(auth)/register', params: { preRole: 'buyer' } })}
          >
            <View style={styles.roleIconWrap}>
              <Ionicons name="cart-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>Sunt Cumparator</Text>
              <Text style={styles.roleDesc}>Caut lemn de calitate</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>

          <Pressable
            style={styles.roleCard}
            onPress={() => router.push({ pathname: '/(auth)/register', params: { preRole: 'forest_owner' } })}
          >
            <View style={styles.roleIconWrap}>
              <Ionicons name="storefront-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>Sunt Vanzator</Text>
              <Text style={styles.roleDesc}>Am lemn de vandut</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push({ pathname: '/(auth)/register', params: { preRole: 'buyer' } })}
        >
          <Text style={styles.bothLink}>Sunt ambele →</Text>
        </Pressable>

      </View>

      {/* Bottom links */}
      <View style={styles.bottom}>
        <Pressable onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.bottomText}>
            Am deja cont?{'  '}
            <Text style={styles.bottomLink}>Conecteaza-te</Text>
          </Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.exploreText}>Exploreaza fara cont</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  roles: {
    gap: 12,
    marginBottom: 20,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  roleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  roleDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  bothLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  bottomText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  bottomLink: {
    color: Colors.primary,
    fontWeight: '700',
  },
  exploreText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
