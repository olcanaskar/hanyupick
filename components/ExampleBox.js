import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * @param {{ example?: import('../services/exampleService').ExampleRecord | null }} props
 */
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
    backgroundColor: '#FEF2F2', // Faz 11: kart içi kutu da uygulamanın kırmızı paletinde
    borderColor: '#FCA5A5',
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
    color: '#991B1B',
    letterSpacing: 1.1,
  },
  hanziText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 2,
  },
  pinyinText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 13,
    color: '#7F8C8D',
    fontStyle: 'italic',
  },
});