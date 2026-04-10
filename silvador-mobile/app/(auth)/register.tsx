import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { register } from '../../lib/auth';
import type { UserRole } from '../../types';

type RoleOption = 'buyer' | 'forest_owner' | 'both';

interface RoleData {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  desc: string;
  bullets: string[];
}

const ROLES: Record<RoleOption, RoleData> = {
  buyer: {
    icon: 'cart-outline',
    name: 'Cumparator',
    desc: 'Caut lemn de calitate',
    bullets: ['Liciteaza pe loturi de lemn', 'Preturi live in timp real', 'Notificari de supralicitare'],
  },
  forest_owner: {
    icon: 'storefront-outline',
    name: 'Vanzator',
    desc: 'Am lemn de vandut',
    bullets: ['Publica loturi de lemn', 'Analiza pret de piata', 'Dashboard licitatii active'],
  },
  both: {
    icon: 'repeat-outline',
    name: 'Ambele',
    desc: 'Cumpara si vinde',
    bullets: ['Functii Cumparator + Vanzator', 'Cont unificat complet', 'Acces deplin la platforma'],
  },
};

function toUserRole(r: RoleOption): UserRole {
  // 'both' maps to forest_owner — owners can also access buyer features
  return r === 'both' ? 'forest_owner' : r;
}

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preRole?: string }>();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<RoleOption | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.preRole === 'buyer') {
      setRole('buyer');
      setStep(2);
    } else if (params.preRole === 'forest_owner') {
      setRole('forest_owner');
      setStep(2);
    } else if (params.preRole === 'both') {
      setRole('both');
      setStep(2);
    }
  }, [params.preRole]);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Completeaza toate campurile');
      return;
    }
    if (password.length < 6) {
      setError('Parola trebuie sa aiba minim 6 caractere');
      return;
    }
    if (password !== confirmPassword) {
      setError('Parolele nu coincid');
      return;
    }
    if (!role) return;

    setLoading(true);
    setError('');

    try {
      await register(email.trim(), password, name.trim(), toUserRole(role));
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        setError('Acest email este deja inregistrat');
      } else {
        setError('Eroare la inregistrare. Incearca din nou.');
      }
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 1) {
      router.canGoBack() ? router.back() : router.replace('/(auth)/welcome');
    } else if (step === 2) {
      // If preRole was passed skip back to welcome, else role selection
      if (params.preRole) {
        router.canGoBack() ? router.back() : router.replace('/(auth)/welcome');
      } else {
        setStep(1);
      }
    } else {
      setStep(2);
    }
  };

  // ─── Step 1: Role Selection ───────────────────────────────────────────────
  if (step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Back */}
          <Pressable style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>

          {/* Logo */}
          <View style={styles.logoRow}>
            <Ionicons name="leaf" size={20} color={Colors.primary} />
            <Text style={styles.logoText}>Romanian Forest</Text>
          </View>

          <Text style={styles.stepTitle}>Creeaza cont</Text>
          <Text style={styles.stepSub}>Selecteaza rolul tau in platforma</Text>

          {/* Role cards */}
          <View style={styles.roleList}>
            {(Object.entries(ROLES) as [RoleOption, RoleData][]).map(([key, data]) => {
              const selected = role === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.roleCard, selected && styles.roleCardSelected]}
                  onPress={() => setRole(key)}
                >
                  <View style={styles.roleCardTop}>
                    <View style={[styles.roleIconWrap, selected && styles.roleIconWrapSelected]}>
                      <Ionicons name={data.icon} size={18} color={selected ? Colors.bg : Colors.textSecondary} />
                    </View>
                    <View style={styles.roleCardMeta}>
                      <Text style={[styles.roleName, selected && styles.roleNameSelected]}>{data.name}</Text>
                      <Text style={styles.roleDesc}>{data.desc}</Text>
                    </View>
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>
                  </View>
                  <View style={styles.bullets}>
                    {data.bullets.map((b, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <View style={[styles.bulletDot, selected && styles.bulletDotSelected]} />
                        <Text style={[styles.bulletText, selected && styles.bulletTextSelected]}>{b}</Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Continue */}
          <Pressable
            style={[styles.continueButton, !role && styles.continueButtonDisabled]}
            onPress={() => role && setStep(2)}
            disabled={!role}
          >
            <Text style={styles.continueButtonText}>Continua →</Text>
          </Pressable>

          {/* Login link */}
          <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>
              Am deja cont?{'  '}
              <Text style={styles.loginLinkHighlight}>Conecteaza-te</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Step 2: Display Name ─────────────────────────────────────────────────
  if (step === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Pressable style={styles.backButton} onPress={goBack}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </Pressable>

            {/* Progress bar */}
            <ProgressBar current={2} total={3} />

            <Text style={styles.stepBadge}>PASUL 2 DIN 3 — PROFIL</Text>
            <Text style={styles.stepTitle}>Cum te cheama?</Text>
            <Text style={styles.stepSub}>Numele tau va fi vizibil in licitatii</Text>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ion Popescu"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => name.trim() && setStep(3)}
            />

            <Pressable
              style={[styles.continueButton, !name.trim() && styles.continueButtonDisabled]}
              onPress={() => name.trim() && setStep(3)}
              disabled={!name.trim()}
            >
              <Text style={styles.continueButtonText}>Continua →</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── Step 3: Email + Password ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>

          {/* Progress bar */}
          <ProgressBar current={3} total={3} />

          <Text style={styles.stepBadge}>PASUL 3 DIN 3 — CONT</Text>
          <Text style={styles.stepTitle}>Creeaza cont</Text>
          <Text style={styles.stepSub}>Datele de autentificare</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemplu.ro"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
          />

          <Text style={styles.label}>Parola</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Minim 6 caractere"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />

          <Text style={styles.label}>Confirma parola</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeta parola"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />

          <Pressable
            style={[styles.continueButton, loading && styles.continueButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.bg} />
            ) : (
              <Text style={styles.continueButtonText}>Creeaza cont</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.progressBar}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            i < current ? styles.progressSegmentFilled : styles.progressSegmentEmpty,
            i > 0 && { marginLeft: 4 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  progressBar: {
    flexDirection: 'row',
    marginBottom: 24,
    marginTop: 4,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  progressSegmentFilled: {
    backgroundColor: Colors.primary,
  },
  progressSegmentEmpty: {
    backgroundColor: Colors.border,
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  stepSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 32,
    lineHeight: 20,
  },
  roleList: {
    gap: 12,
    marginBottom: 24,
  },
  roleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  roleCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  roleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  roleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleIconWrapSelected: {
    backgroundColor: Colors.primary,
  },
  roleCardMeta: {
    flex: 1,
  },
  roleName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 1,
  },
  roleNameSelected: {
    color: Colors.primary,
  },
  roleDesc: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  bullets: {
    gap: 6,
    paddingLeft: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  bulletDotSelected: {
    backgroundColor: Colors.primary,
  },
  bulletText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  bulletTextSelected: {
    color: Colors.textSecondary,
  },
  continueButton: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  continueButtonDisabled: {
    opacity: 0.35,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.bg,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLinkHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textStrong,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    height: 52,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.text,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
  },
});
