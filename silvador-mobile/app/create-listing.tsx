import { useState, useMemo, useEffect } from 'react';
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
import { publishAuction, createDraftAuction, extractApv, checkPermitExists } from '../lib/api';
import { formatEuro } from '../lib/formatters';
import { useMarketAnalytics } from '../hooks/useMarket';
import { storage, auth } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const TOTAL_STEPS = 3;

interface DocumentFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

interface FormData {
  title: string;
  description: string;
  region: string;
  location: string;
  gpsLat: string;
  gpsLng: string;
  volumeM3: string;
  startingPricePerM3: string;
  speciesBreakdown: { species: string; percentage: string }[];
  startInMinutes: string;
  durationValue: string;
  durationUnit: 'minute' | 'ore' | 'zile';
  apvFile: DocumentFile | null;
  apvData: Record<string, any> | null;
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

  const stepValid = useMemo(() => {
    if (step === 1) {
      return true; // APV is optional — seller can always proceed
    }
    if (step === 2) {
      const volume = parseFloat(form.volumeM3);
      const price = parseFloat(form.startingPricePerM3);
      const totalPercent = form.speciesBreakdown.reduce(
        (sum, s) => sum + (parseFloat(s.percentage) || 0),
        0
      );
      return (
        form.title.length >= 5 &&
        form.region.length > 0 &&
        form.location.length >= 3 &&
        volume >= 1 &&
        price >= 0.1 &&
        form.speciesBreakdown.every((s) => s.species && parseFloat(s.percentage) > 0) &&
        Math.abs(totalPercent - 100) <= 0.01
      );
    }
    if (step === 3) {
      return parseInt(form.startInMinutes, 10) >= 1 && parseFloat(form.durationValue) >= 1;
    }
    return true;
  }, [step, form]);

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

  const uploadApvFile = async (file: DocumentFile) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `apv-documents/${userId}/${timestamp}_${safeFileName}`;

    // Fetch the local file URI as a blob
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(storageRef);

    return {
      id: `apv_${timestamp}`,
      fileName: file.name,
      storagePath: downloadUrl,
      fileSize: file.size,
      mimeType: file.mimeType,
      uploadedAt: timestamp,
      isApvDocument: true,
    };
  };

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

    if (form.apvData) {
      const apv = form.apvData;
      // Map OCR fields to schema's apv-prefixed fields — never overwrite form-entered fields
      if (apv.permitNumber) payload.apvPermitNumber = String(apv.permitNumber);
      if (apv.permitCode) payload.apvPermitCode = String(apv.permitCode);
      if (apv.upLocation) payload.apvUpLocation = String(apv.upLocation);
      if (apv.uaLocation) payload.apvUaLocation = String(apv.uaLocation);
      if (apv.forestCompany) payload.apvForestCompany = String(apv.forestCompany);
      if (apv.dateOfMarking) payload.apvDateOfMarking = String(apv.dateOfMarking);
      if (apv.dimensionalSorting) payload.apvDimensionalSorting = String(apv.dimensionalSorting);
      if (apv.volumePerSpecies) payload.apvVolumePerSpecies = apv.volumePerSpecies;
      if (apv.numberOfTrees) payload.apvNumberOfTrees = Number(apv.numberOfTrees);
      if (apv.averageHeight) payload.apvAverageHeight = Number(apv.averageHeight);
      if (apv.averageDiameter) payload.apvAverageDiameter = Number(apv.averageDiameter);
      if (apv.netVolume) payload.apvNetVolume = Number(apv.netVolume);
      if (apv.grossVolume) payload.apvGrossVolume = Number(apv.grossVolume);
      if (apv.surfaceHa) payload.apvSurfaceHa = Number(apv.surfaceHa);
      if (apv.firewoodVolume) payload.apvFirewoodVolume = Number(apv.firewoodVolume);
      if (apv.barkVolume) payload.apvBarkVolume = Number(apv.barkVolume);
      if (apv.treatmentType) payload.apvTreatmentType = String(apv.treatmentType);
      if (apv.extractionMethod) payload.apvExtractionMethod = String(apv.extractionMethod);
      if (apv.sortVolumes) payload.apvSortVolumes = apv.sortVolumes;
      if (apv.productType) payload.apvProductType = String(apv.productType);
      if (apv.harvestYear) payload.apvHarvestYear = Number(apv.harvestYear);
      if (apv.inventoryMethod) payload.apvInventoryMethod = String(apv.inventoryMethod);
      if (apv.hammerMark) payload.apvHammerMark = String(apv.hammerMark);
      if (apv.accessibility) payload.apvAccessibility = String(apv.accessibility);
      if (apv.averageAge) payload.apvAverageAge = Number(apv.averageAge);
      if (apv.slopePercent) payload.apvSlopePercent = Number(apv.slopePercent);
      if (apv.dendrometryPerSpecies) payload.apvDendrometryPerSpecies = apv.dendrometryPerSpecies;
      if (apv.sortVolumesPerSpecies) payload.apvSortVolumesPerSpecies = apv.sortVolumesPerSpecies;
      if (apv.rottenTreesCount) payload.apvRottenTreesCount = Number(apv.rottenTreesCount);
      if (apv.rottenTreesVolume) payload.apvRottenTreesVolume = Number(apv.rottenTreesVolume);
      if (apv.dryTreesCount) payload.apvDryTreesCount = Number(apv.dryTreesCount);
      if (apv.dryTreesVolume) payload.apvDryTreesVolume = Number(apv.dryTreesVolume);
      if (apv.exploitationDeadline) payload.apvExploitationDeadline = String(apv.exploitationDeadline);
    }

    return payload;
  };

  const buildPayloadWithDocs = async () => {
    const payload = buildPayload();
    if (form.apvFile) {
      try {
        const docMeta = await uploadApvFile(form.apvFile);
        payload.documents = [docMeta];
        payload.apvDocumentId = docMeta.id;
      } catch (e) {
        // Upload failed — proceed without document rather than blocking publish
        console.warn('[create-listing] APV document upload failed:', e);
      }
    }
    return payload;
  };

  const handleSaveDraft = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await createDraftAuction(await buildPayloadWithDocs());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({
        type: 'success',
        title: 'Ciorna salvata',
        message: 'Poti reveni la ea oricand din panou',
      });
      router.back();
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
    if (submitting) return;
    setSubmitting(true);
    try {
      await publishAuction(await buildPayloadWithDocs());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({
        type: 'success',
        title: 'Licitatie publicata',
        message: 'Va fi vizibila in feed',
      });
      router.back();
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
        </ScrollView>

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
// STEP 1 — APV Scan
// =====================================================
function Step1({
  form,
  setForm,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  const [extracting, setExtracting] = useState(false);

  // Auto-open camera when step mounts
  useEffect(() => {
    if (!form.apvFile) {
      takePhoto();
    }
  }, []);

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
    await runOcr(docFile);
  };

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
    await runOcr(docFile);
  };

  const runOcr = async (file: DocumentFile) => {
    setExtracting(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const dataUrl = `data:${file.mimeType};base64,${base64}`;
      const data = await extractApv(dataUrl, file.mimeType);

      // Build pre-filled form values from OCR
      const apvSpecies = (data as any).speciesBreakdown?.map((s: any) => ({
        species: String(s.species),
        percentage: String(s.percentage),
      }));

      const autoTitle = (data as any).permitNumber
        ? `Lot APV ${(data as any).permitNumber} — ${(data as any).species || ''}`
        : '';

      setForm({
        ...form,
        apvFile: file,
        apvData: data as Record<string, any>,
        title: autoTitle || form.title,
        volumeM3: (data as any).volumeM3 > 0 ? String((data as any).volumeM3) : form.volumeM3,
        speciesBreakdown:
          apvSpecies && apvSpecies.length > 0 ? apvSpecies : form.speciesBreakdown,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Check for duplicate permit
      const permitNumber = (data as any).permitNumber;
      if (permitNumber) {
        try {
          const check = await checkPermitExists(String(permitNumber));
          if (check.exists) {
            Alert.alert(
              'APV deja listat',
              `Acest APV a mai fost folosit intr-o licitatie anterioara. Verifica datele inainte sa continui.`,
              [{ text: 'Am inteles' }]
            );
          }
        } catch {
          // permit check is non-blocking
        }
      }
    } catch (err: any) {
      console.error('[OCR] error object:', JSON.stringify(err), err);
      const msg = err?.message || err?.error || (typeof err === 'string' ? err : JSON.stringify(err));
      Alert.alert(
        'OCR esuat',
        msg || 'Nu am putut extrage datele. Poti completa manual in pasul urmator.',
        [{ text: 'OK' }]
      );
    } finally {
      setExtracting(false);
    }
  };

  const resetScan = () => {
    setForm({ ...form, apvFile: null, apvData: null });
  };

  return (
    <View>
      <Text style={styles.stepCounter}>Pasul 1 din {TOTAL_STEPS}</Text>
      <Text style={styles.stepTitle}>Scaneaza APV</Text>
      <Text style={styles.stepSubtitle}>
        Extrage automat volumul, specia si datele permisului. Optional — poti sari peste.
      </Text>

      {extracting ? (
        <View style={styles.scanningBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.scanningTitle}>Analizam documentul...</Text>
          <Text style={styles.scanningSubtitle}>Extragere date cu AI</Text>
        </View>
      ) : form.apvFile && form.apvData ? (
        // Success card
        <View style={styles.apvSuccessCard}>
          <View style={styles.apvSuccessHeader}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
            <Text style={styles.apvSuccessTitle}>Date extrase</Text>
            <Pressable onPress={resetScan} hitSlop={8}>
              <Ionicons name="refresh-outline" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>
          {(form.apvData.permitNumber) && (
            <View style={styles.apvDataRow}>
              <Text style={styles.apvDataKey}>Nr. APV</Text>
              <Text style={styles.apvDataValue}>{String(form.apvData.permitNumber)}</Text>
            </View>
          )}
          {form.apvData.volumeM3 > 0 && (
            <View style={styles.apvDataRow}>
              <Text style={styles.apvDataKey}>Volum</Text>
              <Text style={styles.apvDataValue}>{form.apvData.volumeM3} m³</Text>
            </View>
          )}
          {form.apvData.species && (
            <View style={styles.apvDataRow}>
              <Text style={styles.apvDataKey}>Specie principala</Text>
              <Text style={styles.apvDataValue}>{String(form.apvData.species)}</Text>
            </View>
          )}
          {form.apvData.speciesBreakdown?.length > 1 && (
            <View style={styles.apvDataRow}>
              <Text style={styles.apvDataKey}>Compozitie</Text>
              <Text style={styles.apvDataValue}>{form.apvData.speciesBreakdown.length} specii</Text>
            </View>
          )}
          <Text style={styles.apvSuccessHint}>Datele au fost pre-completate. Verifica in pasul urmator.</Text>
        </View>
      ) : (
        // Scan buttons (shown if camera was dismissed without scanning)
        <View style={styles.uploadOptions}>
          <Pressable style={styles.uploadButton} onPress={takePhoto}>
            <Ionicons name="camera" size={32} color={Colors.primary} />
            <Text style={styles.uploadButtonText}>Fotografiaza APV</Text>
          </Pressable>
          <Pressable style={styles.uploadButton} onPress={pickFile}>
            <Ionicons name="document-attach-outline" size={32} color={Colors.primary} />
            <Text style={styles.uploadButtonText}>PDF / Galerie</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={16} color={Colors.info} />
        <Text style={styles.infoBoxText}>
          Apasa "Inainte" pentru a continua fara APV si completa manual.
        </Text>
      </View>
    </View>
  );
}

// =====================================================
// STEP 2 — Review & Edit
// =====================================================
function Step2({
  form,
  setForm,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  const [locating, setLocating] = useState(false);
  const { data: marketData } = useMarketAnalytics('30d');

  const hasApvData = !!form.apvData;

  const totalPercent = form.speciesBreakdown.reduce(
    (sum, s) => sum + (parseFloat(s.percentage) || 0),
    0
  );

  // Market price hint for selected region
  const marketHint = form.region
    ? marketData?.avgPriceByRegion?.find((r: any) => r.region === form.region)
    : null;
  const suggestedPrice = marketHint
    ? Math.round((marketHint as any).avgPricePerM3 * 0.9)
    : null;

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
    } catch {
      Alert.alert('Eroare', 'Nu s-a putut obtine locatia');
    } finally {
      setLocating(false);
    }
  };

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
      <Text style={styles.stepCounter}>Pasul 2 din {TOTAL_STEPS}</Text>
      <Text style={styles.stepTitle}>Verifica datele</Text>
      <Text style={styles.stepSubtitle}>
        {hasApvData ? 'Date pre-completate din APV. Editeaza daca e necesar.' : 'Completeaza detaliile licitatiei.'}
      </Text>

      {/* Title */}
      <Field label="Titlu" apvFilled={hasApvData && form.title.length > 0}>
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

      {/* Region */}
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

      {/* Location */}
      <Field label="Locatie">
        <TextInput
          style={styles.input}
          value={form.location}
          onChangeText={(t) => setForm({ ...form, location: t })}
          placeholder="ex: Hunedoara, Valea Mare"
          placeholderTextColor={Colors.textMuted}
        />
      </Field>

      {/* Volume */}
      <Field label="Volum total (m³)" apvFilled={hasApvData && parseFloat(form.volumeM3) > 0}>
        <TextInput
          style={styles.input}
          value={form.volumeM3}
          onChangeText={(t) => setForm({ ...form, volumeM3: t })}
          placeholder="ex: 520"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
        />
      </Field>

      {/* Species breakdown */}
      <View style={styles.speciesSection}>
        <View style={styles.speciesSectionHeader}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Compozitie specii</Text>
            {hasApvData && form.speciesBreakdown.some((s) => s.species) && (
              <View style={styles.apvBadge}>
                <Text style={styles.apvBadgeText}>· APV</Text>
              </View>
            )}
          </View>
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
            <View style={{ flex: 2 }}>
              <SearchableSelect
                value={s.species}
                onChange={(val) => updateSpecies(idx, 'species', val)}
                options={speciesTypes}
                placeholder="Alege specia"
                allLabel="Alege specia"
                title="Alege specia"
              />
            </View>
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

        <View style={styles.speciesActions}>
          <Pressable style={styles.addButton} onPress={addSpecies}>
            <Ionicons name="add" size={14} color={Colors.primary} />
            <Text style={styles.addButtonText}>Adauga specie</Text>
          </Pressable>
          {Math.abs(totalPercent - 100) > 0.01 && totalPercent > 0 && (
            <Pressable style={styles.normalizeButton} onPress={normalize}>
              <Text style={styles.normalizeButtonText}>Normalizeaza la 100%</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Starting price */}
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
        {suggestedPrice && !form.startingPricePerM3 && (
          <Pressable
            style={styles.priceSuggestion}
            onPress={() => setForm({ ...form, startingPricePerM3: String(suggestedPrice) })}
          >
            <Ionicons name="trending-up" size={13} color={Colors.primary} />
            <Text style={styles.priceSuggestionText}>
              Piata {form.region}: avg {Math.round((marketHint as any).avgPricePerM3)} RON/m³ · Sugestie: {suggestedPrice} RON
            </Text>
          </Pressable>
        )}
      </Field>

      {/* GPS */}
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

      {/* Description */}
      <Field label="Descriere (optional)">
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={form.description}
          onChangeText={(t) => setForm({ ...form, description: t })}
          placeholder="Descriere detaliata a lotului: acces auto, calitate, alte informatii..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
        />
        {form.description.length > 0 && form.description.length < 20 && (
          <Text style={styles.errorText}>Minim 20 caractere ({form.description.length}/20)</Text>
        )}
      </Field>

      {/* Support documents */}
      <SupportDocs form={form} setForm={setForm} />
    </View>
  );
}

// =====================================================
// STEP 3 — Schedule & Launch
// =====================================================
function Step3({
  form,
  setForm,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
}) {
  const presets = [
    { label: '1 ora', value: '1', unit: 'ore' as const },
    { label: '6 ore', value: '6', unit: 'ore' as const },
    { label: '24 ore', value: '24', unit: 'ore' as const },
    { label: '3 zile', value: '3', unit: 'zile' as const },
    { label: '7 zile', value: '7', unit: 'zile' as const },
  ];

  const startMs = parseInt(form.startInMinutes, 10) * 60 * 1000;
  const durationMs =
    parseFloat(form.durationValue) *
    (form.durationUnit === 'minute' ? 60_000 : form.durationUnit === 'ore' ? 3_600_000 : 86_400_000);
  const endTime = new Date(Date.now() + startMs + durationMs);

  const totalValue =
    parseFloat(form.volumeM3 || '0') * parseFloat(form.startingPricePerM3 || '0');

  return (
    <View>
      <Text style={styles.stepCounter}>Pasul 3 din {TOTAL_STEPS}</Text>
      <Text style={styles.stepTitle}>Programare</Text>
      <Text style={styles.stepSubtitle}>Cand incepe si cat dureaza licitatia</Text>

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

      {/* Summary recap */}
      <View style={[styles.summaryCard, { marginTop: 16 }]}>
        <Text style={styles.summaryCardTitle}>Rezumat lot</Text>
        <SummaryRow label="Titlu" value={form.title} />
        <SummaryRow label="Județ" value={form.region} />
        <SummaryRow label="Volum" value={`${form.volumeM3} m³`} />
        <SummaryRow label="Pret pornire" value={`${form.startingPricePerM3} RON/m³`} />
        {totalValue > 0 && (
          <SummaryRow label="Valoare proiectata" value={formatEuro(totalValue)} highlight />
        )}
        {form.apvData?.permitNumber && (
          <SummaryRow label="APV" value={String(form.apvData.permitNumber)} />
        )}
      </View>
    </View>
  );
}

// =====================================================
// Support documents (reusable section in Step 2)
// =====================================================
function SupportDocs({
  form,
  setForm,
}: {
  form: FormData;
  setForm: (f: FormData) => void;
}) {
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
    setForm({ ...form, documents: form.documents.filter((_, i) => i !== idx) });
  };

  return (
    <Field label="Documente suport (optional)">
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
    </Field>
  );
}

// --- Shared sub-components ---

function Field({
  label,
  children,
  apvFilled,
}: {
  label: string;
  children: React.ReactNode;
  apvFilled?: boolean;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {apvFilled && (
          <View style={styles.apvBadge}>
            <Text style={styles.apvBadgeText}>· APV</Text>
          </View>
        )}
      </View>
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
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textStrong,
  },
  apvBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  apvBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
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
  priceSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  priceSuggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
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
    marginBottom: 20,
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
  removeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Step 1 — APV scan
  scanningBox: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  scanningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  scanningSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 12,
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
  apvSuccessCard: {
    padding: 16,
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  apvSuccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  apvSuccessTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
  },
  apvDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  apvDataKey: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  apvDataValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    flex: 1,
  },
  apvSuccessHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 10,
    fontStyle: 'italic',
  },
  // Documents
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
  // Summary
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
