/**
 * LocationPickerSection — native (iOS/Android)
 * Shows a MapView with the public APV pin (green) and optional seller manual pin (blue).
 * Tapping the map sets a seller pin.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { setSellerPin } from '../lib/api';
import type { ApvLocationResult } from '../lib/api';

export type { ApvLocationResult };

export interface LocationPickerProps {
  resolution: ApvLocationResult | null;
  resolving: boolean;
  sellerPin: { lat: number; lng: number } | null;
  attestationAccepted: boolean;
  draftAuctionId: string | null;
  onSellerPinSet: (pin: { lat: number; lng: number }) => void;
  onAttestationChange: (v: boolean) => void;
}

const ROMANIA_REGION = {
  latitude: 45.9,
  longitude: 24.9,
  latitudeDelta: 5,
  longitudeDelta: 5,
};

export function LocationPickerSection({
  resolution,
  resolving,
  sellerPin,
  attestationAccepted,
  draftAuctionId,
  onSellerPinSet,
  onAttestationChange,
}: LocationPickerProps) {
  const status = resolution?.locationResolutionStatus ?? (resolving ? 'resolving' : null);
  const publicPoint = resolution?.publicApvPoint ?? null;
  const eligibility = resolution?.listingEligibility ?? null;
  const [savingPin, setSavingPin] = useState(false);

  const mapRegion = publicPoint
    ? { latitude: publicPoint.lat, longitude: publicPoint.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }
    : sellerPin
    ? { latitude: sellerPin.lat, longitude: sellerPin.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }
    : ROMANIA_REGION;

  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const pin = { lat: latitude, lng: longitude };
    onSellerPinSet(pin);
    setSavingPin(true);
    if (draftAuctionId) {
      try {
        await setSellerPin(draftAuctionId, latitude, longitude);
      } catch (err) {
        console.warn('[SELLER-PIN] Save failed:', err);
      }
    }
    setSavingPin(false);
  };

  let statusIcon: 'checkmark-circle' | 'time-outline' | 'location-outline' | 'alert-circle-outline' | 'cloud-offline-outline' = 'location-outline';
  let statusColor: string = Colors.textMuted;
  let statusText = 'Locatie neselectata';

  if (resolving) {
    statusIcon = 'time-outline';
    statusColor = Colors.primary;
    statusText = 'Cautare locatie din registrul public...';
  } else if (status === 'auto_accepted' && publicPoint) {
    statusIcon = 'checkmark-circle';
    statusColor = Colors.success;
    statusText = `APV gasit in registrul public (scor ${resolution?.matchScore ?? 0}/100)`;
  } else if (status === 'review_required' && publicPoint) {
    statusIcon = 'alert-circle-outline';
    statusColor = Colors.warning;
    statusText = `Locatie gasita, necesita verificare (scor ${resolution?.matchScore ?? 0}/100)`;
  } else if (status === 'not_found') {
    const subtype = resolution?.notFoundSubtype;
    statusIcon = 'location-outline';
    statusColor = Colors.warning;
    if (subtype === 'index_lag') {
      statusText = 'APV recent — incearca din nou in cateva zile sau marcheaza manual';
    } else if (subtype === 'internal_state') {
      statusText = 'APV în etapă internă SUMAL – nu este vizibil public încă. Poți marca manual.';
    } else {
      statusText = 'Locatia nu a putut fi determinata automat. Marcheaza manual.';
    }
  } else if (status === 'provider_error') {
    statusIcon = 'cloud-offline-outline';
    statusColor = Colors.textMuted;
    statusText = 'Registrul public indisponibil momentan.';
  } else if (sellerPin) {
    statusIcon = 'location-outline';
    statusColor = Colors.info;
    statusText = 'Locatie marcata manual';
  }

  const canPickManually = status !== 'resolving';

  return (
    <View style={styles.locationSection}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>Locatie GPS</Text>
        {publicPoint && (
          <View style={[styles.apvBadge, { borderColor: Colors.success }]}>
            <Text style={[styles.apvBadgeText, { color: Colors.success }]}>· APV Public</Text>
          </View>
        )}
      </View>

      <View style={styles.locationStatusRow}>
        {resolving ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name={statusIcon} size={16} color={statusColor} />
        )}
        <Text style={[styles.locationStatusText, { color: statusColor }]} numberOfLines={2}>
          {statusText}
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={mapRegion}
          onPress={canPickManually ? handleMapPress : undefined}
        >
          {publicPoint && (
            <Marker
              coordinate={{ latitude: publicPoint.lat, longitude: publicPoint.lng }}
              title="Punct APV public"
              description="Coordonate din registrul Inspectorul Pădurii"
              pinColor="green"
            />
          )}
          {sellerPin && (
            <Marker
              coordinate={{ latitude: sellerPin.lat, longitude: sellerPin.lng }}
              title="Pin vânzător"
              description="Locatie marcata manual"
              pinColor="blue"
            />
          )}
        </MapView>
        {canPickManually && (
          <View style={styles.mapHint} pointerEvents="none">
            <Text style={styles.mapHintText}>
              {sellerPin ? 'Atinge harta pentru a muta pinul' : 'Atinge harta pentru a marca locatia'}
            </Text>
          </View>
        )}
        {savingPin && (
          <View style={styles.mapSaving} pointerEvents="none">
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}
      </View>

      {eligibility === 'eligible' && publicPoint && (
        <View style={[styles.eligibilityBanner, styles.eligibilityGreen]}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
          <Text style={[styles.eligibilityText, { color: Colors.success }]}>
            APV verificat. Date confirmate din registrul public.
          </Text>
        </View>
      )}

      {eligibility === 'eligible_with_warning' && (
        <View style={[styles.eligibilityBanner, styles.eligibilityAmber]}>
          <Ionicons name="warning" size={14} color={Colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.eligibilityText, { color: Colors.warning }]}>
              APV cu avertizare: {resolution?.eligibilityReasons?.join(', ')}
            </Text>
            <Pressable
              style={[styles.attestationRow, attestationAccepted && styles.attestationRowChecked]}
              onPress={() => onAttestationChange(!attestationAccepted)}
            >
              <Ionicons
                name={attestationAccepted ? 'checkbox' : 'square-outline'}
                size={18}
                color={attestationAccepted ? Colors.success : Colors.textMuted}
              />
              <Text style={styles.attestationText}>
                Confirm că dețin dreptul legal de exploatare pentru acest APV și că nu există alte contracte active pentru aceeași parcelă.
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {eligibility === 'review_before_publish' && (
        <View style={[styles.eligibilityBanner, styles.eligibilityAmber]}>
          <Ionicons name="hourglass" size={14} color={Colors.warning} />
          <Text style={[styles.eligibilityText, { color: Colors.warning }]}>
            Publicarea necesita verificare suplimentara. Poti salva ca ciorna.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  locationSection: {
    marginBottom: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  apvBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  apvBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  locationStatusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
  },
  locationStatusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapHint: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mapHintText: {
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
  },
  mapSaving: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    padding: 4,
  },
  eligibilityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  eligibilityGreen: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.30)',
  },
  eligibilityAmber: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.30)',
  },
  eligibilityText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  attestationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  attestationRowChecked: {
    borderColor: 'rgba(34,197,94,0.40)',
    backgroundColor: 'rgba(34,197,94,0.06)',
  },
  attestationText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
