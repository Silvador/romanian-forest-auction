import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useToast } from './Toast';
import { usePlaceBid } from '../hooks/useBids';
import { useAuthContext } from '../lib/AuthContext';
import { getSpeciesIncrement, calculateNextBidPerM3 } from '../lib/incrementLadder';
import type { Auction } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  auction: Auction | null;
  prefillAmount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface BidResult {
  pricePerM3: number;
  totalValue: number;
}

export function BidModal({ visible, auction, prefillAmount, onClose, onSuccess }: Props) {
  const [proxyInput, setProxyInput] = useState('');
  const [bidResult, setBidResult] = useState<BidResult | null>(null);
  const { mutate: submitBid, isPending } = usePlaceBid();
  const { isBuyer } = useAuthContext();
  const toast = useToast();

  // Pre-populate the proxy input when the modal opens
  useEffect(() => {
    if (!visible || !auction) return;
    setBidResult(null);
    const initial = prefillAmount ?? calculateNextBidPerM3(
      auction.currentPricePerM3 ?? 0,
      auction.dominantSpecies
    );
    setProxyInput(String(initial));
  }, [visible, auction?.id, prefillAmount]);

  if (!auction) return null;

  const increment = getSpeciesIncrement(auction.dominantSpecies);
  const currentPrice = auction.currentPricePerM3 ?? 0;
  const minBid = calculateNextBidPerM3(currentPrice, auction.dominantSpecies);

  // Quick bid amounts: +1x, +3x, +5x increment
  const quickBids = [
    { label: '+1×', amount: currentPrice + increment },
    { label: '+3×', amount: currentPrice + increment * 3 },
    { label: '+5×', amount: currentPrice + increment * 5 },
  ];

  const parsed = parseFloat(proxyInput);
  const proxyValue = !isNaN(parsed) ? parsed : 0;
  const isValid = proxyValue >= minBid;
  const totalValue = proxyValue * (auction.volumeM3 ?? 0);

  const handleQuickBid = (amount: number) => {
    setProxyInput(amount.toString());
  };

  const handleSubmit = () => {
    if (isPending) return;
    // Defense in depth — only buyers can bid. UI should hide this modal
    // for owners, but block here too in case it ever slips through.
    if (!isBuyer) {
      toast.show({
        type: 'error',
        title: 'Doar cumparatorii pot licita',
        message: 'Conturile de proprietar padure nu pot plasa oferte.',
      });
      onClose();
      return;
    }
    if (!isValid) {
      // Inline error is already shown below the input — no toast needed
      return;
    }

    submitBid(
      {
        auctionId: auction.id,
        amountPerM3: minBid,
        maxProxyPerM3: proxyValue,
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setBidResult({
            pricePerM3: minBid,
            totalValue: minBid * (auction.volumeM3 ?? 0),
          });
          setProxyInput('');
          // Don't call onSuccess() here — wait for user to dismiss the success view
        },
        onError: (err: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          toast.show({
            type: 'error',
            title: 'Oferta esuata',
            message: err?.message || 'Incearca din nou',
          });
        },
      }
    );
  };

  const handleClose = () => {
    setProxyInput('');
    setBidResult(null);
    onClose();
  };

  const handleSuccessClose = () => {
    setProxyInput('');
    setBidResult(null);
    onSuccess();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        style={styles.sheetWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {bidResult ? (
            /* ── SUCCESS STATE ─────────────────────────────── */
            <SuccessView auction={auction} result={bidResult} onClose={handleSuccessClose} />
          ) : (
            /* ── BID FORM ──────────────────────────────────── */
            <>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Plasare Oferta</Text>
                <Pressable onPress={handleClose} hitSlop={8} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>

              {/* Auction info card */}
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle} numberOfLines={1}>{auction.title}</Text>
                <Text style={styles.infoCurrent}>
                  Pret curent: {(auction.currentPricePerM3 ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON/m³
                </Text>
                <Text style={styles.infoVolume}>
                  Volum: {(auction.volumeM3 ?? 0).toLocaleString('ro-RO')} m³
                </Text>
              </View>

              {/* Quick bid buttons */}
              <View style={styles.quickRow}>
                {quickBids.map((qb) => (
                  <Pressable
                    key={qb.label}
                    style={[
                      styles.quickButton,
                      proxyValue === qb.amount && styles.quickButtonSelected,
                    ]}
                    onPress={() => handleQuickBid(qb.amount)}
                  >
                    <Text style={[
                      styles.quickLabel,
                      proxyValue === qb.amount && styles.quickLabelSelected,
                    ]}>
                      {qb.label}
                    </Text>
                    <Text style={[
                      styles.quickPrice,
                      proxyValue === qb.amount && styles.quickPriceSelected,
                    ]}>
                      {qb.amount} RON/m³
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Proxy input */}
              <Text style={styles.inputLabel}>Oferta maxima proxy (RON/m³)</Text>
              <TextInput
                style={[
                  styles.proxyInput,
                  !isValid && proxyInput.length > 0 && styles.proxyInputError,
                ]}
                value={proxyInput}
                onChangeText={setProxyInput}
                placeholder={`Minim ${minBid} RON/m³`}
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
              />

              {/* Total value — prominent */}
              {proxyValue > 0 && (
                <Text style={styles.totalValue}>
                  Valoare totala: {(totalValue || 0).toLocaleString('ro-RO', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })} RON
                </Text>
              )}

              {/* Inline validation error */}
              {!isValid && proxyInput.length > 0 && (
                <Text style={styles.errorText}>
                  Oferta minima este {minBid} RON/m³
                </Text>
              )}

              {/* Helper text */}
              <Text style={styles.helperText}>
                Ofertele proxy liciteaza automat pana la suma maxima setata de tine.
              </Text>

              {/* Submit */}
              <Pressable
                style={[styles.submitButton, (!isValid || isPending) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!isValid || isPending}
              >
                {isPending ? (
                  <ActivityIndicator color={Colors.bg} />
                ) : (
                  <Text style={styles.submitText}>Plaseaza Oferta</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Success View ─────────────────────────────────────────────────────────────
function SuccessView({
  auction,
  result,
  onClose,
}: {
  auction: Auction;
  result: BidResult;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.successContainer}>
      {/* Checkmark */}
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={36} color={Colors.success} />
      </View>

      {/* Title */}
      <Text style={styles.successTitle}>Oferta plasata!</Text>
      <Text style={styles.successMeta}>
        {result.pricePerM3.toLocaleString('ro-RO')} RON/m³ · Valoare:{' '}
        {result.totalValue.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RON
      </Text>

      {/* Lot card */}
      <View style={styles.successCard}>
        <Text style={styles.successCardTitle} numberOfLines={1}>{auction.title}</Text>
        <View style={styles.successCardRow}>
          <View style={styles.successCardStat}>
            <Text style={styles.successCardLabel}>Pret curent</Text>
            <Text style={styles.successCardValue}>
              {(auction.currentPricePerM3 ?? 0).toLocaleString('ro-RO')} RON/m³
            </Text>
          </View>
          <View style={styles.successCardStat}>
            <Text style={styles.successCardLabel}>Volum</Text>
            <Text style={styles.successCardValue}>
              {(auction.volumeM3 ?? 0).toLocaleString('ro-RO')} m³
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.successHelper}>
        Vei fi notificat daca esti depasit.
      </Text>

      <Pressable style={styles.successButton} onPress={onClose}>
        <Text style={styles.successButtonText}>Inchide</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.scrim,
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: Colors.bgSoft,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.85,
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
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    padding: 14,
    marginBottom: 16,
    gap: 4,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  infoCurrent: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  infoVolume: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.surface,
  },
  quickButtonSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  quickLabelSelected: {
    color: Colors.primary,
  },
  quickPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  quickPriceSelected: {
    color: Colors.primary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textStrong,
    marginBottom: 6,
  },
  proxyInput: {
    height: 60,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  proxyInputError: {
    borderColor: Colors.error,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    marginTop: 6,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 17,
  },
  submitButton: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.bg,
  },
  // Success view
  successContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.30)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  successMeta: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  successCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  successCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  successCardRow: {
    flexDirection: 'row',
    gap: 16,
  },
  successCardStat: {
    gap: 2,
  },
  successCardLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  successCardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  successHelper: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  successButton: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  successButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
});
