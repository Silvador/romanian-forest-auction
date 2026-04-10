import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import type { Auction } from '../types';

interface Props {
  auctions: Auction[];
}

// Web fallback — react-native-maps doesn't support web.
// Show a friendly message; native build gets the real map.
export function AuctionMap({ auctions }: Props) {
  const withGps = auctions.filter((a) => a.gpsCoordinates?.lat).length;

  return (
    <View style={styles.container}>
      <Ionicons name="map-outline" size={64} color={Colors.textMuted} />
      <Text style={styles.title}>Harta disponibila pe mobil</Text>
      <Text style={styles.subtitle}>
        {withGps > 0
          ? `${withGps} licitatii cu coordonate GPS`
          : 'Foloseste aplicatia pe iOS sau Android pentru harta'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
