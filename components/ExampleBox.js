import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ExampleBox({ example }) {
  if (!example) return null;

  // Erişilebilirlik (Faz 4.5b): Android'de düz <Text> odaklanamaz (RN `accessible=false`
  // verir → `isFocusable=false`), bu yüzden kutu TEK bir erişilebilirlik öğesi olur ve
  // örnek cümleyi bir bütün olarak okur (görünüm değişmez; metinler a11y ağacında birleşir).
  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Example sentence: ${example.hanzi}, ${example.pinyin}, ${example.meaning}`}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>EXAMPLE SENTENCE</Text>
      </View>
      <Text style={styles.hanziText}>{example.hanzi}</Text>
      <Text style={styles.pinyinText}>{example.pinyin}</Text>
      <Text style={styles.meaningText}>{example.meaning}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBEB', // Sıcak, açık altın/krem zemin
    borderColor: '#FCD34D',     // Yumuşak altın sarısı kenarlık
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginVertical: 12,
    width: '100%',
  },
  header: {
    marginBottom: 6,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',            // Asil bronz/altın başlık
    letterSpacing: 1.1,
  },
  hanziText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  pinyinText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',            // Altın/Kehribar Pinyin vurgusu
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
});