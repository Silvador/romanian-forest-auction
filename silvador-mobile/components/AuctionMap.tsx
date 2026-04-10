import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps';
import { Colors } from '../constants/colors';
import { formatVolume } from '../lib/formatters';
import type { Auction } from '../types';

interface Props {
  auctions: Auction[];
}

// Romania bounds — center of country
const ROMANIA_REGION: Region = {
  latitude: 45.9432,
  longitude: 24.9668,
  latitudeDelta: 4.5,
  longitudeDelta: 6.5,
};

function statusColor(status: Auction['status']): string {
  if (status === 'active') return Colors.success;
  if (status === 'upcoming') return Colors.warning;
  return Colors.textMuted;
}

export function AuctionMap({ auctions }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Auction | null>(null);

  const auctionsWithGps = useMemo(
    () => auctions.filter((a) => a.gpsCoordinates?.lat && a.gpsCoordinates?.lng),
    [auctions]
  );

  // Compute initial region based on auctions, fallback to Romania
  const initialRegion = useMemo<Region>(() => {
    if (auctionsWithGps.length === 0) return ROMANIA_REGION;
    const lats = auctionsWithGps.map((a) => a.gpsCoordinates!.lat);
    const lngs = auctionsWithGps.map((a) => a.gpsCoordinates!.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.5, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.5, (maxLng - minLng) * 1.5),
    };
  }, [auctionsWithGps]);

  if (auctionsWithGps.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Nicio licitatie pe harta</Text>
        <Text style={styles.emptySubtitle}>
          Licitatiile fara coordonate GPS nu pot fi afisate aici
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {auctionsWithGps.map((auction) => (
          <Marker
            key={auction.id}
            coordinate={{
              latitude: auction.gpsCoordinates!.lat,
              longitude: auction.gpsCoordinates!.lng,
            }}
            pinColor={statusColor(auction.status)}
            onPress={() => setSelected(auction)}
          />
        ))}
      </MapView>

      {/* Mini card popup */}
      {selected && (
        <View style={styles.popupWrapper} pointerEvents="box-none">
          <View style={styles.popup}>
            <Pressable
              style={styles.popupClose}
              onPress={() => setSelected(null)}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={Colors.textMuted} />
            </Pressable>
            <Text style={styles.popupTitle} numberOfLines={2}>{selected.title}</Text>
            <Text style={styles.popupLocation}>
              {selected.location}, {selected.region}
            </Text>
            <View style={styles.popupStats}>
              <View>
                <Text style={styles.popupLabel}>Pret</Text>
                <Text style={styles.popupValue}>
                  {(selected.currentPricePerM3 ?? 0).toLocaleString('ro-RO')} RON/m³
                </Text>
              </View>
              <View>
                <Text style={styles.popupLabel}>Volum</Text>
                <Text style={styles.popupValue}>{formatVolume(selected.volumeM3)}</Text>
              </View>
            </View>
            <Pressable
              style={styles.popupButton}
              onPress={() => {
                router.push(`/auction/${selected.id}`);
                setSelected(null);
              }}
            >
              <Text style={styles.popupButtonText}>Vezi detalii</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  // Popup
  popupWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    paddingHorizontal: 16,
  },
  popup: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  popupClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  popupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    paddingRight: 24,
  },
  popupLocation: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  popupStats: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  popupLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  popupValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  popupButton: {
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  popupButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.bg,
  },
});
