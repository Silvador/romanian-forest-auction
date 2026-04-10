import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { speciesTypes } from '../constants/species';
import { regions } from '../constants/regions';
import type { AuctionFilters, SortOption } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  filters: AuctionFilters;
  onApply: (filters: AuctionFilters) => void;
  onClose: () => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'endTime', label: 'Expira in curand' },
  { value: 'priceAsc', label: 'Pret crescator' },
  { value: 'priceDesc', label: 'Pret descrescator' },
  { value: 'volumeDesc', label: 'Volum descrescator' },
  { value: 'volumeAsc', label: 'Volum crescator' },
];

export function FilterSheet({ visible, filters, onApply, onClose }: Props) {
  const [local, setLocal] = useState<AuctionFilters>(filters);
  const [speciesSearch, setSpeciesSearch] = useState('');

  const filteredSpecies = useMemo(
    () =>
      speciesSearch
        ? speciesTypes.filter((s) =>
            s.toLowerCase().includes(speciesSearch.toLowerCase())
          )
        : speciesTypes.slice(0, 12), // Show first 12 by default
    [speciesSearch]
  );

  const activeCount = useMemo(() => {
    let count = 0;
    if (local.species) count++;
    if (local.region) count++;
    if (local.minPrice !== undefined) count++;
    if (local.maxPrice !== undefined) count++;
    if (local.minVolume !== undefined) count++;
    if (local.maxVolume !== undefined) count++;
    if (local.sortBy && local.sortBy !== 'endTime') count++;
    return count;
  }, [local]);

  const handleReset = () => {
    setLocal({});
    setSpeciesSearch('');
  };

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Filtre</Text>
            {activeCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{activeCount}</Text>
              </View>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Species */}
          <Text style={styles.sectionLabel}>Specii</Text>
          <TextInput
            style={styles.searchInput}
            value={speciesSearch}
            onChangeText={setSpeciesSearch}
            placeholder="Cauta specie..."
            placeholderTextColor={Colors.textMuted}
          />
          <View style={styles.chipGrid}>
            {filteredSpecies.map((sp) => {
              const selected = local.species === sp;
              return (
                <Pressable
                  key={sp}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() =>
                    setLocal((prev) => ({
                      ...prev,
                      species: selected ? undefined : sp,
                    }))
                  }
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {sp}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Region */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Regiune</Text>
          <View style={styles.chipGrid}>
            {regions.map((r) => {
              const selected = local.region === r;
              return (
                <Pressable
                  key={r}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() =>
                    setLocal((prev) => ({
                      ...prev,
                      region: selected ? undefined : r,
                    }))
                  }
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Price range */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Pret (RON/m³)</Text>
          <View style={styles.rangeRow}>
            <TextInput
              style={styles.rangeInput}
              value={local.minPrice !== undefined ? String(local.minPrice) : ''}
              onChangeText={(t) =>
                setLocal((prev) => ({
                  ...prev,
                  minPrice: t ? Number(t) : undefined,
                }))
              }
              placeholder="Min"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
            <Text style={styles.rangeDash}>—</Text>
            <TextInput
              style={styles.rangeInput}
              value={local.maxPrice !== undefined ? String(local.maxPrice) : ''}
              onChangeText={(t) =>
                setLocal((prev) => ({
                  ...prev,
                  maxPrice: t ? Number(t) : undefined,
                }))
              }
              placeholder="Max"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          {/* Volume range */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Volum (m³)</Text>
          <View style={styles.rangeRow}>
            <TextInput
              style={styles.rangeInput}
              value={local.minVolume !== undefined ? String(local.minVolume) : ''}
              onChangeText={(t) =>
                setLocal((prev) => ({
                  ...prev,
                  minVolume: t ? Number(t) : undefined,
                }))
              }
              placeholder="Min"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
            <Text style={styles.rangeDash}>—</Text>
            <TextInput
              style={styles.rangeInput}
              value={local.maxVolume !== undefined ? String(local.maxVolume) : ''}
              onChangeText={(t) =>
                setLocal((prev) => ({
                  ...prev,
                  maxVolume: t ? Number(t) : undefined,
                }))
              }
              placeholder="Max"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          {/* Sort */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Sortare</Text>
          {sortOptions.map((opt) => {
            const selected = (local.sortBy || 'endTime') === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={styles.radioRow}
                onPress={() => setLocal((prev) => ({ ...prev, sortBy: opt.value }))}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Action row */}
        <View style={styles.actions}>
          <Pressable style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetText}>Reseteaza</Text>
          </Pressable>
          <Pressable style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyText}>Aplica</Text>
          </Pressable>
        </View>
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
    maxHeight: SCREEN_HEIGHT * 0.8,
    backgroundColor: Colors.bgSoft,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34, // Safe area
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textStrong,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  searchInput: {
    height: 40,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primaryBorder,
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.text,
  },
  rangeDash: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  radioLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  radioLabelSelected: {
    color: Colors.text,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resetButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  applyButton: {
    flex: 2,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  applyText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.bg,
  },
});
