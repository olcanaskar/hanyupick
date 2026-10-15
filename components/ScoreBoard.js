import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export default function ScoreBoard({ correct, wrong }) {
  // Erişilebilirlik (Faz 4.5b): rozetler tek öğe olur (Android'de düz <Text> okunmaz);
  // böylece ekran okuyucu "Correct: 3" / "Wrong: 1" diye okur.
  return (
    <View style={styles.scoreRow}>
      <View
        style={[styles.badge, styles.correctBadge]}
        accessible={true}
        accessibilityLabel={`Correct: ${correct}`}
      >
        <Text style={styles.badgeLabel}>Correct</Text>
        <Text style={[styles.badgeValue, styles.correctBadgeValue]}>{correct}</Text>
      </View>
      <View
        style={[styles.badge, styles.wrongBadge]}
        accessible={true}
        accessibilityLabel={`Wrong: ${wrong}`}
      >
        <Text style={styles.badgeLabel}>Wrong</Text>
        <Text style={[styles.badgeValue, styles.wrongBadgeValue]}>{wrong}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12, // Yuvarlak hap yerine hafif köşeli mühür formu
    borderWidth: 1.5,
    gap: 8,
  },
  correctBadge: {
    backgroundColor: '#ECFDF5', // Yeşim zemin
    borderColor: '#059669', // Yeşim taşı yeşili
  },
  wrongBadge: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626', // Mühür kırmızısı
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#44403C',
    letterSpacing: 0.5,
  },
  badgeValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  correctBadgeValue: {
    color: '#047857',
  },
  wrongBadgeValue: {
    color: '#B91C1C',
  },
});