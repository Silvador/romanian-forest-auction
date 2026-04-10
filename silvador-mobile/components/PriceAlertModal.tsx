import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { speciesTypes } from '../constants/species';
import { regions } from '../constants/regions';
import { useCreatePriceAlert } from '../hooks/useMarket';
import { SearchableSelect } from './SearchableSelect';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Direction = 'price_below' | 'price_above';

export function PriceAlertModal({ visible, onClose }: Props) {
  const [species, setSpecies] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [direction, setDirection] = useState<Direction>('price_below');
  const [threshold, setThreshold] = useState('');

  const { mutate, isPending } = useCreatePriceAlert();

  const isValid = parseFloat(threshold) > 0;

  const handleSave = () => {
    if (!isValid) return;
    mutate(
      {
        species: species || undefined,
        region: region || undefined,
        alertType: direction,
        threshold: parseFloat(threshold),
        active: true,
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          reset();
          onClose();
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  };

  const reset = () => {
    setSpecies('');
    setRegion('');
    setDirection('price_below');
    setThreshold('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Alerta de pret</Text>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* Species */}
          <Text style={styles.label}>Specie (optional)</Text>
          <SearchableSelect
            value={species}
            onChange={setSpecies}
            options={speciesTypes}
            placeholder="Toate speciile"
            allLabel="Toate speciile"
            title="Alege specia"
          />

          {/* Region */}
          <Text style={styles.label}>Județ (optional)</Text>
          <SearchableSelect
            value={region}
            onChange={setRegion}
            options={regions}
            placeholder="Toate județele"
            allLabel="Toate județele"
            title="Alege județul"
          />

          {/* Direction */}
          <Text style={styles.label}>Conditie</Text>
          <View style={styles.directionRow}>
            <Pressable
              style={[styles.directionButton, direction === 'price_below' && styles.directionButtonActive]}
              onPress={() => setDirection('price_below')}
            >
              <Ionicons
                name="arrow-down"
                size={16}
                color={direction === 'price_below' ? Colors.error : Colors.textMuted}
              />
              <Text style={[
                styles.directionText,
                direction === 'price_below' && { color: Colors.error },
              ]}>
                Sub
              </Text>
            </Pressable>
            <Pressable
              style={[styles.directionButton, direction === 'price_above' && styles.directionButtonActive]}
              onPress={() => setDirection('price_above')}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={direction === 'price_above' ? Colors.success : Colors.textMuted}
              />
              <Text style={[
                styles.directionText,
                direction === 'price_above' && { color: Colors.success },
              ]}>
                Peste
              </Text>
            </Pressable>
          </View>

          {/* Threshold */}
          <Text style={styles.label}>Prag (RON/m³)</Text>
          <TextInput
            style={styles.input}
            value={threshold}
            onChangeText={setThreshold}
            placeholder="ex: 200"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
          />
        </ScrollView>

        {/* Save button */}
        <Pressable
          style={[styles.saveButton, !isValid && styles.disabled]}
          onPress={handleSave}
          disabled={!isValid || isPending}
        >
          {isPending ? (
            <ActivityIndicator color={Colors.bg} />
          ) : (
            <Text style={styles.saveText}>Salveaza alerta</Text>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.scrim,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: Colors.bgSoft,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  body: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textStrong,
    marginTop: 12,
    marginBottom: 6,
  },
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
  placeholder: {
    color: Colors.textMuted,
  },
  pickerList: {
    maxHeight: 200,
    marginTop: 4,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  pickerItemText: {
    fontSize: 15,
    color: Colors.text,
  },
  directionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  directionButton: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  directionButtonActive: {
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primarySoft,
  },
  directionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
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
  saveButton: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.bg,
  },
  disabled: {
    opacity: 0.5,
  },
});
