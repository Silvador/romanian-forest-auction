import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '../../constants/colors';
import { useAuthContext } from '../../lib/AuthContext';
import { logout } from '../../lib/auth';
import { usePreferences } from '../../hooks/usePreferences';
import { EditNameModal } from '../../components/EditNameModal';
import { ChangePasswordModal } from '../../components/ChangePasswordModal';
import type { KycStatus } from '../../types';

export default function ProfileScreen() {
  const { user, firebaseUser, refreshUser } = useAuthContext();
  const prefs = usePreferences();
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

  const handleLogout = () => {
    // Alert.alert is unreliable on react-native-web — use the native
    // browser confirm there, and the real Alert on iOS/Android.
    if (Platform.OS === 'web') {
      if (window.confirm('Esti sigur ca vrei sa te deconectezi?')) {
        logout();
      }
      return;
    }
    Alert.alert('Deconectare', 'Esti sigur ca vrei sa te deconectezi?', [
      { text: 'Anuleaza', style: 'cancel' },
      {
        text: 'Deconecteaza-te',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const handleNotificationToggle = async (value: boolean) => {
    const ok = await prefs.setNotificationsEnabled(value);
    if (!ok && value) {
      Alert.alert('Permisiune refuzata', 'Activeaza notificarile din setarile telefonului');
    }
  };

  const initial = (user?.displayName || firebaseUser?.email || '?')[0].toUpperCase();
  const displayName = user?.displayName || firebaseUser?.displayName || 'Utilizator';
  const appVersion = (Constants.expoConfig?.version as string) || '1.0.0';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{firebaseUser?.email}</Text>

          <View style={styles.badgesRow}>
            {user && (
              <View style={styles.roleBadge}>
                <Ionicons
                  name={user.role === 'forest_owner' ? 'shield-checkmark' : 'person-circle'}
                  size={13}
                  color={Colors.primary}
                />
                <Text style={styles.roleText}>
                  {user.role === 'forest_owner' ? 'PROPRIETAR VERIFICAT' : 'CUMPARATOR'}
                </Text>
              </View>
            )}
            {user?.kycStatus === 'verified' && (
              <View style={styles.kycVerifiedBadge}>
                <Ionicons name="checkmark-circle" size={11} color={Colors.success} />
                <Text style={styles.kycVerifiedText}>KYC Verificat</Text>
              </View>
            )}
          </View>
        </View>

        {/* Profile completion card */}
        {user && <ProfileCompletionCard displayName={user.displayName} />}

        {/* Account section */}
        <SettingsSection title="Cont">
          <SettingRow
            icon="person-outline"
            label="Editare nume"
            value={displayName}
            onPress={() => setEditNameVisible(true)}
          />
          <SettingRow
            icon="lock-closed-outline"
            label="Schimbare parola"
            onPress={() => setChangePasswordVisible(true)}
          />
          <SettingRow
            icon="mail-outline"
            label="Email"
            value={firebaseUser?.email || ''}
            disabled
          />
        </SettingsSection>

        {/* Preferences section */}
        <SettingsSection title="Preferinte">
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.toggleLabel}>Notificari</Text>
            </View>
            <Switch
              value={prefs.notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: Colors.surfaceElevated, true: Colors.primary }}
              thumbColor={Colors.bg}
            />
          </View>

        </SettingsSection>

        {/* App info section */}
        <SettingsSection title="Aplicatie">
          <SettingRow
            icon="information-circle-outline"
            label="Despre Romanian Forest"
            onPress={() => {
              Alert.alert(
                'Romanian Forest',
                `Versiunea ${appVersion}\n\nMarketplace pentru licitatii de lemn din Romania.`
              );
            }}
          />
          <SettingRow
            icon="document-text-outline"
            label="Termeni si conditii"
            onPress={() => Linking.openURL('https://roforest.ro/terms')}
          />
          <SettingRow
            icon="shield-outline"
            label="Politica de confidentialitate"
            onPress={() => Linking.openURL('https://roforest.ro/privacy')}
          />
          <SettingRow
            icon="code-slash-outline"
            label="Versiune"
            value={appVersion}
            disabled
          />
        </SettingsSection>

        {/* Logout */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Deconecteaza-te</Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>

      <EditNameModal
        visible={editNameVisible}
        currentName={displayName}
        onClose={() => setEditNameVisible(false)}
        onSuccess={refreshUser}
      />
      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
        onSuccess={() => {
          Alert.alert('Succes', 'Parola a fost schimbata');
        }}
      />
    </SafeAreaView>
  );
}

// --- Sub-components ---

function ProfileCompletionCard({ displayName }: { displayName?: string | null }) {
  const items = useMemo(() => [
    { label: 'Cont creat', done: true },
    { label: 'Profil completat', done: !!displayName },
    { label: 'Adauga firma (CUI)', done: false },
    { label: 'Incarca documente SUMAL', done: false },
  ], [displayName]);

  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <View style={styles.completionCard}>
      <View style={styles.completionHeader}>
        <Text style={styles.completionTitle}>Profil {pct}% complet</Text>
        <Text style={styles.completionPct}>{pct}%</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
      </View>
      <View style={styles.completionList}>
        {items.map((item) => (
          <Pressable
            key={item.label}
            style={styles.completionItem}
            onPress={item.done ? undefined : () => Alert.alert('In curand', 'Aceasta functionalitate va fi disponibila in curand.')}
            disabled={item.done}
          >
            <Ionicons
              name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={item.done ? Colors.success : Colors.textMuted}
            />
            <Text style={[styles.completionItemText, item.done && styles.completionItemDone]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function KycBadge({ status }: { status: KycStatus }) {
  const config: Record<KycStatus, { color: string; bg: string; border: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    pending: {
      color: Colors.warning,
      bg: 'rgba(245,158,11,0.10)',
      border: 'rgba(245,158,11,0.30)',
      label: 'KYC in asteptare',
      icon: 'time-outline',
    },
    verified: {
      color: Colors.success,
      bg: 'rgba(34,197,94,0.10)',
      border: 'rgba(34,197,94,0.30)',
      label: 'KYC verificat',
      icon: 'checkmark-circle',
    },
    rejected: {
      color: Colors.error,
      bg: 'rgba(239,68,68,0.10)',
      border: 'rgba(239,68,68,0.30)',
      label: 'KYC respins',
      icon: 'close-circle',
    },
  };

  const c = config[status];
  return (
    <View style={[styles.kycBadge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Ionicons name={c.icon} size={11} color={c.color} />
      <Text style={[styles.kycText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.settingRow, disabled && styles.settingRowDisabled]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={20} color={Colors.textSecondary} />
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {value && (
          <Text style={styles.settingValue} numberOfLines={1}>{value}</Text>
        )}
      </View>
      {!disabled && <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
    </Pressable>
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
  scroll: {
    flex: 1,
  },
  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 38,
    fontWeight: '700',
    color: Colors.bg,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  email: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  kycVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.40)',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  kycVerifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  kycText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Profile completion card
  completionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    padding: 16,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  completionPct: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  completionList: {
    gap: 10,
  },
  completionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completionItemText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  completionItemDone: {
    color: Colors.text,
  },
  // Sections
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  // Setting rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  settingRowDisabled: {
    opacity: 0.7,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  settingValue: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  // Logout
  logoutButton: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
});
