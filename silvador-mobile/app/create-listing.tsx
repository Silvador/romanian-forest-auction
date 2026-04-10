import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '../constants/colors';
import { regions } from '../constants/regions';
import { speciesTypes } from '../constants/species';
import { StepIndicator } from '../components/StepIndicator';
import { useToast } from '../components/Toast';
import { SearchableSelect } from '../components/SearchableSelect';
import { publishAuction, createDraftAuction, extractApv } from '../lib/api';
import { formatEuro } from '../lib/formatters';

const TOTAL_STEPS = 6;

interface DocumentFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

interface FormData {
  // Step 1
  title: string;
  description: string;
  region: string;
  location: string;
  gpsLat: string;
  gpsLng: string;

  // Step 2
  volumeM3: string;
  startingPricePerM3: string;
  speciesBreakdown: { species: string; percentage: string }[];

  // Step 3
  startInMinutes: string;
  durationValue: string;
  durationUnit: 'minute' | 'ore' | 'zile';

  // Step 4
  apvFile: DocumentFile | null;
  apvData: Record<string, any> | null;

  // Step 5
  documents: DocumentFile[];
}

const INITIAL_FORM: FormData = {
  title: '',
  description: '',
  region: '',
  location: '',
  gpsLat: '',
  gpsLng: '',
  volumeM3: '',
  startingPricePerM3: '',
  speciesBreakdown: [{ species: '', percentage: '100' }],
  startInMinutes: '15',
  durationValue: '24',
  durationUnit: 'ore',
  apvFile: null,
  apvData: null,
  documents: [],
};

export default function CreateListingScreen() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // --- Validation ---
  const stepValid = useMemo(() => {
    if (step === 1) {
      return (
        form.title.length >= 5 &&
        form.description.length >= 20 &&
        form.region &&
        form.location.length >= 3
      );
    }
    if (step === 2) {
      const volume = parseFloat(form.volumeM3);
      const price = parseFloat(form.startingPricePerM3);
      const totalPercent = form.speciesBreakdown.reduce(
        (sum, s) => sum + (parseFloat(s.percentage) || 0),
        0
      );
      return (
        volume >= 1 &&
        price >= 0.1 &&
        form.speciesBreakdown.every((s) => s.species && parseFloat(s.percentage) > 0) &&
        Math.abs(totalPercent - 100) <= 0.01
      );
    }
    if (step === 3) {
      return parseInt(form.startInMinutes, 10) >= 1 && parseFloat(form.durationValue) >= 1;
    }
    return true; // Steps 4-5 optional, 6 always valid
  }, [step, form]);

  // --- Step navigation ---
  const goNext = () => {
    if (!stepValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  // --- Submit ---
  const buildPayload = () => {
    const startTime = Date.now() + parseInt(form.startInMinutes, 10) * 60 * 1000;
    const durationMs =
      parseFloat(form.durationValue) *
      (form.durationUnit === 'minute' ? 60_000 : form.durationUnit === 'ore' ? 3_600_000 : 86_400_000);

    const speciesBreakdown = form.speciesBreakdown.map((s) => ({
      species: s.species,
      percentage: parseFloat(s.percentage),
    }));

    const dominant = [...speciesBreakdown].sort((a, b) => b.percentage - a.percentage)[0]?.species;

    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      region: form.region,
      location: form.location,
      volumeM3: parseFloat(form.volumeM3),
      startingPricePerM3: parseFloat(form.startingPricePerM3),
      speciesBreakdown,
      dominantSpecies: dominant,
      startTime,
      endTime: startTime + durationMs,
    };

    if (form.gpsLat && form.gpsLng) {
      payload.gpsCoordinates = {
        lat: parseFloat(form.gpsLat),
        lng: parseFloat(form.gpsLng),
      };
    }

    // Merge APV data if present
    if (form.apvData) {
      Object.assign(payload, form.apvData);
    }

    return payload;
  };

  const handleSaveDraft = async () => {
    // Hard guard — Pressable's `disabled` doesn't fully block rapid taps on web
    if (submitting) return;
    setSubmitting(true);
    try {
      await createDraftAuction(buildPayload());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({
        type: 'success',
        title: 'Ciorna salvata',
        message: 'Poti reveni la ea oricand din panou',
      });
      // Navigate immediately so the button can't be re-tapped
      router.back();
      // Don't reset submitting — we're leaving this screen
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show({
        type: 'error',
        title: 'Eroare',
        message: err?.message || 'Nu s-a putut salva ciorna',
      });
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    // Hard guard — Pressable's `disabled` doesn't fully block rapid taps on web
    if (submitting) return;
    setSubmitting(true);
    try {
      await publishAuction(buildPayload());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({
        type: 'success',
        title: 'Licitatie publicata',
        message: 'Va fi vizibila in feed',
      });
      // Navigate immediately so the button can't be re-tapped
      router.back();
      // Don't reset submitting — we're leaving this screen
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show({
        type: 'error',
        title: 'Eroare',
        message: err?.message || 'Nu s-a putut publica licitatia',
      });
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={8} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <StepIndicator current={step} total={TOTAL_STEPS} />
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && <Step1 form={form} setForm={setForm} />}
          {step === 2 && <Step2 form={form} setForm={setForm} />}
          {step === 3 && <Step3 form={form} setForm={setForm} />}
          {step === 4 && <Step4 form={form} setForm={setForm} />}
          {step === 5 && <Step5 form={form} setForm={setForm} />}
          {step === 6 && <Step6 form={form} />}
        </ScrollView>

        {/* Action bar */}
        <View style={styles.actionBar}>
          <Pressable
            style={[styles.actionButton, styles.actionButtonGhost]}
            onPress={goBack}
          >
            <Text style={styles.actionButtonGhostText}>
              {step === 1 ? 'Anuleaza' : 'Inapoi'}
            </Text>
          </Pressable>
          {step < TOTAL_STEPS ? (
            <Pressable
              style={[styles.actionButton, styles.actionButtonPrimary, !stepValid && styles.disabled]}
              onPress={goNext}
              disabled={!stepValid}
            >
              <Text style={styles.actionButtonPrimaryText}>Inainte</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.bg} />
            </Pressable>
          ) : (
            <View style={styles.publishRow}>
              <Pressable
                style={[styles.actionButton, styles.actionButtonGhost]}
                onPress={handleSaveDraft}
                disabled={submitting}
              >
                <Text style={styles.actionButtonGhostText}>Ciorna</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={handlePublish}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.bg} />
                ) : (
                  <Text style={styles.actionButtonPrimaryText}>Publica</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =====================================================
// STEP 1 — Basic Info
// =====================================================
function Step1({
  form,
  setForm,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  const [locating, setLocating] = useState(false);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisiune', 'Avem nevoie de acces la locatie');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setForm({
        ...form,
        gpsLat: loc.coords.latitude.toFixed(6),
        gpsLng: loc.coords.longitude.toFixed(6),
      });
    } catch (err) {
      Alert.alert('Eroare', 'Nu s-a putut obtine locatia');
    } finally {
      setLocating(false);
    }
  };

  return (
    <View>
      <Text style={styles.stepCounter}>Pasul 1 din {TOTAL_STEPS}</Text>
      <Text style={styles.stepTitle}>Informatii de baza</Text>
      <Text style={styles.stepSubtitle}>Completeaza detaliile principale ale licitatiei tale.</Text>

      <Field label="Titlu">
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={(t) => setForm({ ...form, title: t })}
          placeholder="ex: Lot 45 — Molid si Brad"
          placeholderTextColor={Colors.textMuted}
        />
        {form.title.length > 0 && form.title.length < 5 && (
          <Text style={styles.errorText}>Minim 5 caractere</Text>
        )}
      </Field>

      <Field label="Descriere">
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={form.description}
          onChangeText={(t) => setForm({ ...form, description: t })}
          placeholder="Descriere detaliata a lotului..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
        />
        {form.description.length > 0 && form.description.length < 20 && (
          <Text style={styles.errorText}>Minim 20 caractere ({form.description.length}/20)</Text>
        )}
      </Field>

      <Field label="Județ">
        <SearchableSelect
          value={form.region || ''}
          onChange={(r) => setForm({ ...form, region: r })}
          options={regions}
          placeholder="Alege județul"
          allLabel="Alege județul"
          title="Alege județul"
        />
      </Field>

      <Field label="Locatie">
        <TextInput
          style={styles.input}
          value={form.location}
          onChangeText={(t) => setForm({ ...form, location: t })}
          placeholder="ex: Hunedoara"
          placeholderTextColor={Colors.textMuted}
        />
      </Field>

      <Field label="Coordonate GPS (optional)">
        <View style={styles.gpsRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={form.gpsLat}
            onChangeText={(t) => setForm({ ...form, gpsLat: t })}
            placeholder="Latitudine"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={form.gpsLng}
            onChangeText={(t) => setForm({ ...form, gpsLng: t })}
            placeholder="Longitudine"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
        <Pressable
          style={styles.locationButton}
          onPress={useCurrentLocation}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <>
              <Ionicons name="location" size={16} color={Colors.primary} />
              <Text style={styles.locationButtonText}>Foloseste locatia curenta</Text>
            </>
          )}
        </Pressable>
      </Field>
    </View>
  );
}

// =====================================================
// STEP 2 — Timber Details
// =====================================================
function Step2({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const [pickerOpenIdx, setPickerOpenIdx] = useState<number | null>(null);

  const totalPercent = form.speciesBreakdown.reduce(
    (sum, s) => sum + (parseFloat(s.percentage) || 0),
    0
  );

  const addSpecies = () => {
    setForm({
      ...form,
      speciesBreakdown: [...form.speciesBreakdown, { species: '', percentage: '0' }],
    });
  };

  const removeSpecies = (idx: number) => {
    setForm({
      ...form,
      speciesBreakdown: form.speciesBreakdown.filter((_, i) => i !== idx),
    });
  };

  const updateSpecies = (idx: number, key: 'species' | 'percentage', value: string) => {
    const updated = [...form.speciesBreakdown];
    updated[idx] = { ...updated[idx], [key]: value };
    setForm({ ...form, speciesBreakdown: updated });
  };

  const normalize = () => {
    if (totalPercent === 0) return;
    const factor = 100 / totalPercent;
    setForm({
      ...form,
      speciesBreakdown: form.speciesBreakdown.map((s) => ({
        ...s,
        percentage: (parseFloat(s.percentage) * factor).toFixed(1),
      })),
    });
  };

  return (
    <View>
      <Text style={styles.stepTitle}>Detalii lemn</Text>
      <Text style={styles.stepSubtitle}>Volume, pret si compozitie</Text>

      <Field label="Volum total (m³)">
        <TextInput
          style={styles.input}
          value={form.volumeM3}
          onChangeText={(t) => setForm({ ...form, volumeM3: t })}
          placeholder="ex: 520"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
        />
      </Field>

      <Field label="Pret de pornire (RON/m³)">
        <TextInput
          style={styles.input}
          value={form.startingPricePerM3}
          onChangeText={(t) => setForm({ ...form, startingPricePerM3: t })}
          placeholder="ex: 185"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
        />
        {form.volumeM3 && form.startingPricePerM3 && (
          <Text style={styles.helperText}>
            Total proiectat: {formatEuro(parseFloat(form.volumeM3) * parseFloat(form.startingPricePerM3))}
          </Text>
        )}
      </Field>

      <View style={styles.speciesSection}>
        <View style={styles.speciesSectionHeader}>
          <Text style={styles.fieldLabel}>Compozitie specii</Text>
          <View style={[
            styles.percentBadge,
            Math.abs(totalPercent - 100) > 0.01 && styles.percentBadgeError,
          ]}>
            <Text style={[
              styles.percentBadgeText,
              Math.abs(totalPercent - 100) > 0.01 && styles.percentBadgeErrorText,
            ]}>
              Total: {totalPercent.toFixed(1)}%
            </Text>
          </View>
        </View>

        {form.speciesBreakdown.map((s, idx) => (
          <View key={idx} style={styles.speciesRow}>
            <Pressable
              style={[styles.speciesPicker, { flex: 2 }]}
              onPress={() => setPickerOpenIdx(pickerOpenIdx === idx ? null : idx)}
            >
              <Text style={[
                styles.speciesPickerText,
                !s.species && styles.placeholderText,
              ]}>
                {s.species || 'Alege specie'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
            </Pressable>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={s.percentage}
              onChangeText={(t) => updateSpecies(idx, 'percentage', t)}
              placeholder="%"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
            {form.speciesBreakdown.length > 1 && (
              <Pressable onPress={() => removeSpecies(idx)} style={styles.removeButton}>
                <Ionicons name="close-circle" size={20} color={Colors.error} />
              </Pressable>
            )}
          </View>
        ))}

        {pickerOpenIdx !== null && (
          <ScrollView
            style={styles.speciesDropdown}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {speciesTypes.map((sp) => (
              <Pressable
                key={sp}
                style={styles.dropdownItem}
                onPress={() => {
                  updateSpecies(pickerOpenIdx, 'species', sp);
                  setPickerOpenIdx(null);
                }}
              >
                <Text style={styles.dropdownItemText}>{sp}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.speciesActions}>
          <Pressable style={styles.addButton} onPress={addSpecies}>
            <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.addButtonText}>Adauga specie</Text>
          </Pressable>
          {Math.abs(totalPercent - 100) > 0.01 && totalPercent > 0 && (
            <Pressable style={styles.normalizeButton} onPress={normalize}>
              <Text style={styles.normalizeButtonText}>Normalizeaza la 100%</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// =====================================================
// STEP 3 — Schedule
// =====================================================
function Step3({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const presets: { label: string; value: string; unit: 'minute' | 'ore' | 'zile' }[] = [
    { label: '1 ora', value: '1', unit: 'ore' },
    { label: '4 ore', value: '4', unit: 'ore' },
    { label: '24 ore', value: '24', unit: 'ore' },
    { label: '3 zile', value: '3', unit: 'zile' },
    { label: '7 zile', value: '7', unit: 'zile' },
  ];

  const startMs = parseInt(form.startInMinutes, 10) * 60 * 1000;
  const durationMs =
    parseFloat(form.durationValue) *
    (form.durationUnit === 'minute' ? 60_000 : form.durationUnit === 'ore' ? 3_600_000 : 86_400_000);
  const endTime = new Date(Date.now() + startMs + durationMs);

  return (
    <View>
      <Text style={styles.stepTitle}>Programare licitatie</Text>
      <Text style={styles.stepSubtitle}>Cand incepe si cat dureaza</Text>

      <Field label="Incepe in (minute)">
        <TextInput
          style={styles.input}
          value={form.startInMinutes}
          onChangeText={(t) => setForm({ ...form, startInMinutes: t })}
          placeholder="15"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
        />
      </Field>

      <Field label="Durata">
        <View style={styles.durationRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={form.durationValue}
            onChangeText={(t) => setForm({ ...form, durationValue: t })}
            placeholder="24"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
          />
          <View style={styles.unitToggle}>
            {(['minute', 'ore', 'zile'] as const).map((u) => (
              <Pressable
                key={u}
                style={[styles.unitButton, form.durationUnit === u && styles.unitButtonActive]}
                onPress={() => setForm({ ...form, durationUnit: u })}
              >
                <Text style={[
                  styles.unitButtonText,
                  form.durationUnit === u && styles.unitButtonTextActive,
                ]}>
                  {u}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Field>

      <Field label="Presetari">
        <View style={styles.presetsRow}>
          {presets.map((p) => (
            <Pressable
              key={p.label}
              style={styles.preset}
              onPress={() => setForm({ ...form, durationValue: p.value, durationUnit: p.unit })}
            >
              <Text style={styles.presetText}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <View style={styles.endTimeCard}>
        <Text style={styles.endTimeLabel}>Se incheie la</Text>
        <Text style={styles.endTimeValue}>
          {endTime.toLocaleString('ro-RO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={16} color={Colors.info} />
        <Text style={styles.infoBoxText}>
          Licitatia se prelungeste automat cu 3 minute daca se plaseaza o oferta in ultimele 15 minute
        </Text>
      </View>
    </View>
  );
}

// =====================================================
// STEP 4 — APV Document
// =====================================================
function Step4({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const [extracting, setExtracting] = useState(false);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
    });
    if (result.canceled || !result.assets[0]) return;
    const file = result.assets[0];
    const docFile: DocumentFile = {
      uri: file.uri,
      name: file.name,
      size: file.size ?? 0,
      mimeType: file.mimeType ?? 'application/octet-stream',
    };
    setForm({ ...form, apvFile: docFile });
    await runOcr(docFile);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisiune', 'Avem nevoie de acces la camera');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const docFile: DocumentFile = {
      uri: asset.uri,
      name: `apv_${Date.now()}.jpg`,
      size: asset.fileSize ?? 0,
      mimeType: 'image/jpeg',
    };
    setForm({ ...form, apvFile: docFile });
    await runOcr(docFile);
  };

  const runOcr = async (file: DocumentFile) => {
    if (!file.mimeType.startsWith('image/')) {
      // PDFs are accepted for upload but can't be OCR-processed client-side
      Alert.alert(
        'PDF detectat',
        'Extragerea automata a datelor functioneaza doar pe fotografii. Te rugam sa fotografiezi documentul APV cu camera pentru completare automata.',
        [{ text: 'OK' }]
      );
      return;
    }
    setExtracting(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const data = await extractApv(base64);
      setForm({ ...form, apvFile: file, apvData: data });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('OCR esuat', 'Poti completa manual datele in pasul urmator');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <View>
      <Text style={styles.stepTitle}>Document APV</Text>
      <Text style={styles.stepSubtitle}>Permis de exploatare (optional)</Text>

      {!form.apvFile ? (
        <View style={styles.uploadOptions}>
          <Pressable style={styles.uploadButton} onPress={takePhoto}>
            <Ionicons name="camera" size={32} color={Colors.primary} />
            <Text style={styles.uploadButtonText}>Fotografiaza APV</Text>
          </Pressable>
          <Pressable style={styles.uploadButton} onPress={pickFile}>
            <Ionicons name="document" size={32} color={Colors.primary} />
            <Text style={styles.uploadButtonText}>Incarca fisier</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.uploadedCard}>
          <Ionicons
            name={form.apvFile.mimeType.includes('pdf') ? 'document-text' : 'image'}
            size={32}
            color={Colors.primary}
          />
          <View style={styles.uploadedInfo}>
            <Text style={styles.uploadedName} numberOfLines={1}>{form.apvFile.name}</Text>
            <Text style={styles.uploadedSize}>{(form.apvFile.size / 1024).toFixed(0)} KB</Text>
          </View>
          <Pressable
            onPress={() => setForm({ ...form, apvFile: null, apvData: null })}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={24} color={Colors.error} />
          </Pressable>
        </View>
      )}

      {extracting && (
        <View style={styles.extractingBox}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.extractingText}>Extragem date din APV...</Text>
        </View>
      )}

      {form.apvData && (
        <View style={styles.apvDataCard}>
          <Text style={styles.apvDataTitle}>Date extrase</Text>
          {Object.entries(form.apvData).slice(0, 8).map(([k, v]) => (
            <View key={k} style={styles.apvDataRow}>
              <Text style={styles.apvDataKey}>{k}</Text>
              <Text style={styles.apvDataValue} numberOfLines={1}>{String(v)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={16} color={Colors.info} />
        <Text style={styles.infoBoxText}>
          Acest pas este optional. Poti continua si fara document APV.
        </Text>
      </View>
    </View>
  );
}

// =====================================================
// STEP 5 — Support Documents
// =====================================================
function Step5({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: true,
    });
    if (result.canceled) return;
    const newDocs: DocumentFile[] = result.assets.map((f) => ({
      uri: f.uri,
      name: f.name,
      size: f.size ?? 0,
      mimeType: f.mimeType ?? 'application/octet-stream',
    }));
    setForm({ ...form, documents: [...form.documents, ...newDocs] });
  };

  const removeDoc = (idx: number) => {
    setForm({
      ...form,
      documents: form.documents.filter((_, i) => i !== idx),
    });
  };

  return (
    <View>
      <Text style={styles.stepTitle}>Documente suport</Text>
      <Text style={styles.stepSubtitle}>Rapoarte, fotografii, harti (optional)</Text>

      <Pressable style={styles.uploadFullButton} onPress={pickFiles}>
        <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary} />
        <Text style={styles.uploadFullText}>Adauga documente</Text>
      </Pressable>

      {form.documents.map((doc, idx) => (
        <View key={idx} style={styles.docRow}>
          <Ionicons
            name={doc.mimeType.includes('pdf') ? 'document-text' : 'image'}
            size={20}
            color={Colors.textSecondary}
          />
          <View style={styles.docInfo}>
            <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
            <Text style={styles.docSize}>{(doc.size / 1024).toFixed(0)} KB</Text>
          </View>
          <Pressable onPress={() => removeDoc(idx)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </Pressable>
        </View>
      ))}

      {form.documents.length === 0 && (
        <Text style={styles.emptyHint}>Niciun document adaugat</Text>
      )}
    </View>
  );
}

// =====================================================
// STEP 6 — Review & Publish
// =====================================================
function Step6({ form }: { form: FormData }) {
  const totalValue =
    parseFloat(form.volumeM3 || '0') * parseFloat(form.startingPricePerM3 || '0');

  const sortedSpecies = [...form.speciesBreakdown].sort(
    (a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)
  );

  return (
    <View>
      <Text style={styles.stepTitle}>Verificare</Text>
      <Text style={styles.stepSubtitle}>Verifica detaliile si publica</Text>

      {/* Basic info */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardTitle}>Informatii de baza</Text>
        <SummaryRow label="Titlu" value={form.title} />
        <SummaryRow label="Județ" value={form.region} />
        <SummaryRow label="Locatie" value={form.location} />
        {form.gpsLat && form.gpsLng && (
          <SummaryRow label="GPS" value={`${form.gpsLat}, ${form.gpsLng}`} />
        )}
      </View>

      {/* Timber details */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardTitle}>Detalii lemn</Text>
        <SummaryRow label="Volum" value={`${form.volumeM3} m³`} />
        <SummaryRow label="Pret pornire" value={`${form.startingPricePerM3} RON/m³`} />
        <SummaryRow
          label="Valoare proiectata"
          value={formatEuro(totalValue)}
          highlight
        />
        <View style={{ marginTop: 8 }}>
          <Text style={styles.summarySubLabel}>Specii</Text>
          {sortedSpecies.map((s, i) => (
            <Text key={i} style={styles.summarySpecies}>
              {s.species}: {parseFloat(s.percentage).toFixed(1)}%
            </Text>
          ))}
        </View>
      </View>

      {/* Schedule */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardTitle}>Programare</Text>
        <SummaryRow label="Incepe in" value={`${form.startInMinutes} min`} />
        <SummaryRow label="Durata" value={`${form.durationValue} ${form.durationUnit}`} />
      </View>

      {/* APV */}
      {form.apvFile && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Document APV</Text>
          <SummaryRow label="Fisier" value={form.apvFile.name} />
          {form.apvData && (
            <SummaryRow label="OCR" value="Date extrase cu succes" highlight />
          )}
        </View>
      )}

      {/* Documents */}
      {form.documents.length > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Documente suport</Text>
          <Text style={styles.summarySubLabel}>{form.documents.length} fisiere</Text>
        </View>
      )}
    </View>
  );
}

// --- Shared sub-components ---

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  stepCounter: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.04 * 28,
    lineHeight: 28 * 1.15,
  },
  stepSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 18,
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textStrong,
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.text,
  },
  inputMulti: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 11,
    color: Colors.error,
    marginTop: 4,
  },
  helperText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  // Dropdown
  dropdown: {
    height: 48,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 15,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textMuted,
  },
  dropdownMenu: {
    marginTop: 4,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.text,
  },
  dropdownItemSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  // GPS
  gpsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  locationButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  locationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Species section
  speciesSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  speciesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.30)',
  },
  percentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  percentBadgeError: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.30)',
  },
  percentBadgeErrorText: {
    color: Colors.error,
  },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  speciesPicker: {
    height: 48,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speciesPickerText: {
    fontSize: 13,
    color: Colors.text,
  },
  removeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speciesDropdown: {
    maxHeight: 240,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
  },
  speciesActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  normalizeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  normalizeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  // Schedule
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: Colors.primarySoft,
  },
  unitButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  unitButtonTextActive: {
    color: Colors.primary,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  endTimeCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: 'center',
  },
  endTimeLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  endTimeValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.20)',
    marginTop: 16,
  },
  infoBoxText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  // Step 4 — APV
  uploadOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  uploadButton: {
    flex: 1,
    height: 120,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  uploadedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  uploadedInfo: {
    flex: 1,
  },
  uploadedName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  uploadedSize: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  extractingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginTop: 12,
  },
  extractingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  apvDataCard: {
    marginTop: 12,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  apvDataTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  apvDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  apvDataKey: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
  },
  apvDataValue: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  // Step 5 — Documents
  uploadFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primaryBorder,
    marginTop: 8,
  },
  uploadFullText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  docSize: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  // Step 6 — Summary
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  summaryCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  summaryValueHighlight: {
    color: Colors.primary,
  },
  summarySubLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summarySpecies: {
    fontSize: 13,
    color: Colors.text,
    marginVertical: 2,
  },
  // Action bar
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: Colors.bgSoft,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  publishRow: {
    flex: 2,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    gap: 6,
  },
  actionButtonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonGhostText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  actionButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.bg,
  },
  disabled: {
    opacity: 0.5,
  },
});
