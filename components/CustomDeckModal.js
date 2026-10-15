import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  DeviceEventEmitter,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  getCustomDecks,
  pickAndParseJSON,
  saveCustomDeck,
  deleteCustomDeck,
} from '../services/importService';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SAMPLE_JSON_TEXT = `[
  {
    "id": 1,
    "hanzi": "爱",
    "pinyin": "ài",
    "meaning": "to love"
  },
  {
    "id": 2,
    "hanzi": "八",
    "pinyin": "bā",
    "meaning": "eight"
  }
]`;

export default function CustomDeckModal({ visible, onClose }) {
  const [decks, setDecks] = useState({});
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // İsim alma ve silme adımları için state'ler
  const [pendingDeck, setPendingDeck] = useState(null);
  const [customDeckName, setCustomDeckName] = useState('');
  const [deckToDelete, setDeckToDelete] = useState(null);

  // Animasyon Değerleri
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const translateYAnim = useRef(new Animated.Value(35)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const loadDecks = async () => {
    const data = await getCustomDecks();
    setDecks(data);
  };

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85);
      translateYAnim.setValue(35);
      opacityAnim.setValue(0);

      setShowGuide(false);
      setCopied(false);
      setPendingDeck(null);
      setCustomDeckName('');
      setDeckToDelete(null);
      loadDecks();

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          bounciness: 9,
          speed: 12,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          bounciness: 9,
          speed: 12,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Kopyalama fonksiyonu
  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(SAMPLE_JSON_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dosyayı seç ve isim girme adımına geç
  const handlePickFile = async () => {
    const result = await pickAndParseJSON();
    if (result.success) {
      setPendingDeck(result);
      // Dosya adından türetilen öneriyi (örn. "kelimeler") isim alanına önceden doldur.
      setCustomDeckName(result.defaultName || '');
    } else if (result.reason !== 'canceled') {
      Alert.alert('Import Error', result.error || 'Failed to parse JSON file.');
    }
  };

  // Verilen özel isimle kaydet
  const handleConfirmSave = async () => {
    const trimmedName = customDeckName.trim();
    if (!trimmedName) {
      Alert.alert('Invalid Name', 'Please enter a valid name for your deck.');
      return;
    }

    const saveResult = await saveCustomDeck(trimmedName, pendingDeck.validWords);
    if (saveResult.success) {
      setPendingDeck(null);
      setCustomDeckName('');
      await loadDecks();
      DeviceEventEmitter.emit('onCustomDeckImported');
    } else {
      Alert.alert('Save Error', saveResult.error || 'Failed to save deck.');
    }
  };

  // Silme Onayı
  const handleConfirmDelete = async () => {
    if (!deckToDelete) return;
    await deleteCustomDeck(deckToDelete);
    setDeckToDelete(null);
    await loadDecks();
    DeviceEventEmitter.emit('onCustomDeckImported');
  };

  const deckNames = Object.keys(decks);

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        {/* Kararan Arka Plan Overlay */}
        <AnimatedPressable
          style={[styles.overlay, { opacity: opacityAnim }]}
          onPress={handleClose}
        />

        {/* Animasyonlu İçerik Kartı */}
        <Animated.View
          style={[
            styles.contentCard,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>CUSTOM WORD DECKS</Text>
              {!pendingDeck && !deckToDelete && (
                <TouchableOpacity onPress={() => setShowGuide((prev) => !prev)}>
                  <Text style={styles.guideToggleText}>
                    {showGuide ? '← Back to Decks' : 'ℹ️ How to format JSON?'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Adım 1: Silme Onayı Ekranı */}
          {deckToDelete ? (
            <View style={styles.confirmContainer}>
              <Text style={styles.confirmTitle}>Delete Deck</Text>
              <Text style={styles.confirmDesc}>
                Are you sure you want to delete <Text style={styles.boldText}>&quot;{deckToDelete}&quot;</Text>? This action cannot be undone.
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setDeckToDelete(null)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteConfirmBtn}
                  onPress={handleConfirmDelete}
                >
                  <Text style={styles.deleteConfirmBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : pendingDeck ? (
            /* Adım 2: İsim Girme Ekranı */
            <View style={styles.nameStepContainer}>
              <Text style={styles.nameStepTitle}>Name Your Deck</Text>
              <Text style={styles.nameStepDesc}>
                Enter a title for this deck to easily identify it in your level menu ({pendingDeck.validWords.length} words found).
              </Text>
              <TextInput
                style={styles.nameInput}
                value={customDeckName}
                onChangeText={setCustomDeckName}
                placeholder="Deck Name (e.g., My HSK Words)"
                placeholderTextColor="#9CA3AF"
                autoFocus={true}
                maxLength={30}
              />
              <View style={styles.nameStepActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setPendingDeck(null)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleConfirmSave}
                >
                  <Text style={styles.saveBtnText}>Save Deck</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : showGuide ? (
            /* Adım 3: Rehber Ekranı */
            <ScrollView style={styles.body} contentContainerStyle={styles.guideContainer} showsVerticalScrollIndicator={false}>
              <Text style={styles.guideHeader}>JSON File Schema</Text>
              <Text style={styles.guideDesc}>
                Your JSON file must be an array of word objects following this format:
              </Text>

              {/* Kod Bloğu ve Sağ Alt Kopyalama Butonu */}
              <View style={styles.codeBlockContainer}>
                <View style={styles.codeBlock}>
                  <Text style={styles.codeText}>{SAMPLE_JSON_TEXT}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.copyBtnText, copied && styles.copyBtnTextSuccess]}>
                    {copied ? '✓ Copied!' : '📋 Copy Format'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldsList}>
                <Text style={styles.fieldItem}>
                  • <Text style={styles.bold}>id</Text>: Unique number or string
                </Text>
                <Text style={styles.fieldItem}>
                  • <Text style={styles.bold}>hanzi</Text> (Required): Chinese character (e.g. &quot;爱&quot;)
                </Text>
                <Text style={styles.fieldItem}>
                  • <Text style={styles.bold}>pinyin</Text> (Required): Pronunciation with tones (e.g. &quot;ài&quot;)
                </Text>
                <Text style={styles.fieldItem}>
                  • <Text style={styles.bold}>meaning</Text> (Required): English definition (e.g. &quot;to love&quot;)
                </Text>
              </View>
            </ScrollView>
          ) : (
            /* Adım 4: Deste Listesi */
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
              {deckNames.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No custom decks imported yet.</Text>
                  <Text style={styles.emptySubtext}>
                    Upload a JSON file containing your vocabulary words.
                  </Text>
                </View>
              ) : (
                deckNames.map((name) => (
                  <View key={name} style={styles.deckCard}>
                    <View style={styles.deckInfo}>
                      <Text style={styles.deckName} numberOfLines={1}>
                        📁 {name}
                      </Text>
                      <Text style={styles.deckCount}>{decks[name].length} words</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setDeckToDelete(name)}
                      style={styles.deleteBtn}
                    >
                      <Text style={styles.deleteBtnText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* Footer Import Button */}
          {!pendingDeck && !deckToDelete && (
            <TouchableOpacity style={styles.importBtn} onPress={handlePickFile} activeOpacity={0.85}>
              <Text style={styles.importBtnText}>+ Import JSON Deck</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  contentCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 1.5,
  },
  guideToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
    marginTop: 4,
  },
  closeBtn: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  body: {
    maxHeight: 320,
  },
  bodyContent: {
    gap: 10,
    paddingVertical: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  deckCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  deckInfo: {
    flex: 1,
    marginRight: 10,
  },
  deckName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  deckCount: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  deleteBtnText: {
    fontSize: 14,
  },
  importBtn: {
    backgroundColor: '#D97706',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  /* Custom Delete Confirmation Styles */
  confirmContainer: {
    paddingVertical: 12,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 6,
  },
  confirmDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 16,
  },
  boldText: {
    fontWeight: '700',
    color: '#1F2937',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteConfirmBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  deleteConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  /* Name Step Styles */
  nameStepContainer: {
    paddingVertical: 8,
  },
  nameStepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 4,
  },
  nameStepDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  nameInput: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  nameStepActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  /* Guide Styles */
  guideContainer: {
    paddingVertical: 4,
  },
  guideHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 6,
  },
  guideDesc: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 10,
    lineHeight: 16,
  },
  codeBlockContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  codeBlock: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    paddingBottom: 42,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#F8FAFC',
    lineHeight: 16,
  },
  copyBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#334155',
    borderColor: '#475569',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  copyBtnSuccess: {
    backgroundColor: '#065F46',
    borderColor: '#10B981',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  copyBtnTextSuccess: {
    color: '#A7F3D0',
  },
  fieldsList: {
    gap: 6,
  },
  fieldItem: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  bold: {
    fontWeight: '700',
    color: '#92400E',
  },
});