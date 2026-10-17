// src/screens/SettingsScreen.js
//
// Faz 11: Ayarlar ekranı. Üç ayar + iki eylem:
//   1. Titreşim (dokunsal geri bildirim) aç/kapa      -> services/hapticsService.js okur
//   2. Sesli okuma seviyesi (slider)                  -> services/speechService.js okur
//   3. İlerlemeyi sıfırla (istatistik + hata havuzu)  -> services/statsManager.js
//   4. GitHub sayfasını aç (tarayıcı)
//
// Tüm ayarlar tek kaynaktan gelir (services/settingsService.js): buradaki
// değişiklikler `onSettingsChange` olayıyla yayılır ve ses/titreşim servisleri
// anlık (senkron) önbelleği okuduğu için quiz ekranına dönmeye gerek kalmaz.

import React, { useEffect, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';

import FloatingBackground from '../components/FloatingBackground';
import {
  SETTINGS_CHANGED_EVENT,
  SPEECH_VOLUME_MAX,
  SPEECH_VOLUME_MIN,
  getCachedSettings,
  getSettings,
  updateSettings,
} from '../services/settingsService';
import { clearAllStats } from '../services/statsManager';
import { speakHanzi } from '../services/speechService';

// Repo şu an private olsa da adres sabittir; ileride public yapılınca da aynı
// buton çalışır. (Butona basan kişinin erişimi yoksa tarayıcı 404 gösterir.)
const REPOSITORY_URL = 'https://github.com/olcanasqar/ChineseQuizApp';

// Slider adımı: %5'lik dilimler (0.00–1.00 aralığı).
const VOLUME_STEP = 0.05;
const TEST_TEXT = '你好';

export default function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(getCachedSettings());
  const [resetConfirm, setResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Diskteki güncel ayarları oku + başka bir yerden değişirse ekranı tazele.
  useEffect(() => {
    let cancelled = false;
    getSettings().then((loaded) => {
      if (!cancelled) setSettings(loaded);
    });

    const sub = DeviceEventEmitter.addListener(SETTINGS_CHANGED_EVENT, (next) => {
      setSettings(next);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const volumePercent = Math.round(settings.speechVolume * 100);

  const handleToggleHaptics = (value) => {
    updateSettings({ haptics: value });
  };

  // Slider sürüklenirken yalnızca ekran güncellenir; diske yazım parmak
  // kaldırılınca tek seferde yapılır (sürükleme başına onlarca yazma olmasın).
  const handleVolumePreview = (value) => {
    setSettings((prev) => ({ ...prev, speechVolume: value }));
  };

  const handleVolumeCommit = (value) => {
    updateSettings({ speechVolume: value });
  };

  // İstatistikler burada silinir; hata havuzu uygulamanın sahibi olan
  // App.js'te `onProgressReset` ile boşaltılır (Faz 4'ten beri aynı akış).
  const handleResetProgress = async () => {
    if (isResetting) return;
    setIsResetting(true);

    await clearAllStats();
    DeviceEventEmitter.emit('onProgressReset');

    setIsResetting(false);
    setResetConfirm(false);
  };

  const openRepository = async () => {
    try {
      const supported = await Linking.canOpenURL(REPOSITORY_URL);
      if (!supported) {
        Alert.alert('Could not open link', 'No app on this device can open the repository page.');
        return;
      }
      await Linking.openURL(REPOSITORY_URL);
    } catch (error) {
      console.error('Bağlantı açılamadı:', error);
      Alert.alert('Could not open link', 'Please try again later.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FBF5EB' }}>
      <FloatingBackground />

      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FBF5EB" translucent={false} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle} accessibilityRole="header">
              SETTINGS
            </Text>
            <Text style={styles.headerSubtitle}>Sound, feedback and app info</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* 1. Dokunsal geri bildirim */}
          <Text style={styles.sectionHeader} accessible={true} accessibilityRole="header">
            FEEDBACK
          </Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Vibration</Text>
                <Text style={styles.rowDesc}>
                  Vibrate when an answer is correct or wrong during a quiz
                </Text>
              </View>
              <Switch
                value={settings.haptics}
                onValueChange={handleToggleHaptics}
                accessibilityLabel="Vibration"
                trackColor={{ false: '#E2E8F0', true: '#FCA5A5' }}
                thumbColor={settings.haptics ? '#DC2626' : '#FFFFFF'}
              />
            </View>
          </View>

          {/* 2. Sesli okuma seviyesi */}
          <Text style={styles.sectionHeader} accessible={true} accessibilityRole="header">
            SOUND
          </Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Speech volume</Text>
                <Text style={styles.rowDesc}>
                  {volumePercent === 0
                    ? 'Muted — the 🔊 buttons will not play any sound'
                    : 'Used by the 🔊 buttons on the quiz card and in Vocabulary'}
                </Text>
              </View>
              <Text style={styles.volumeValue} accessible={false}>
                {volumePercent}%
              </Text>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={SPEECH_VOLUME_MIN}
              maximumValue={SPEECH_VOLUME_MAX}
              step={VOLUME_STEP}
              value={settings.speechVolume}
              onValueChange={handleVolumePreview}
              onSlidingComplete={handleVolumeCommit}
              minimumTrackTintColor="#DC2626"
              maximumTrackTintColor="#E2E8F0"
              thumbTintColor="#DC2626"
              accessibilityLabel="Speech volume"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: volumePercent,
                text: `${volumePercent} percent`,
              }}
            />

            <TouchableOpacity
              style={styles.testButton}
              onPress={() => speakHanzi(TEST_TEXT)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Play a sample word at the current volume"
            >
              <Text style={styles.testButtonIcon}>🔊</Text>
              <Text style={styles.testButtonText}>Test volume</Text>
            </TouchableOpacity>
          </View>

          {/* 3. İlerlemeyi sıfırla (tehlikeli işlem: iki adımlı onay) */}
          <Text style={styles.sectionHeader} accessible={true} accessibilityRole="header">
            DATA
          </Text>
          <View style={styles.card}>
            {!resetConfirm ? (
              <>
                <Text style={styles.rowDesc} accessible={true}>
                  Deleting progress removes all statistics and the mistake pool. Custom decks are
                  kept.
                </Text>
                <TouchableOpacity
                  style={styles.dangerButton}
                  onPress={() => setResetConfirm(true)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Reset progress"
                >
                  <Text style={styles.dangerButtonText}>RESET PROGRESS</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmTitle} accessible={true} accessibilityRole="header">
                  Reset all progress?
                </Text>
                <Text style={styles.confirmText} accessible={true}>
                  All word statistics, daily activity, your streak and the mistake pool will be
                  deleted. This cannot be undone.
                </Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setResetConfirm(false)}
                    disabled={isResetting}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text style={styles.cancelButtonText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleResetProgress}
                    disabled={isResetting}
                    accessibilityRole="button"
                    accessibilityLabel="Yes, reset all progress"
                  >
                    <Text style={styles.confirmButtonText}>
                      {isResetting ? 'RESETTING…' : 'YES, RESET'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* 4. Hakkında */}
          <Text style={styles.sectionHeader} accessible={true} accessibilityRole="header">
            ABOUT
          </Text>
          <View style={styles.card}>
            <Text style={styles.rowDesc} accessible={true}>
              Source code, issue tracker and release notes live on GitHub.
            </Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={openRepository}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Open the GitHub repository in your browser"
            >
              <Text style={styles.linkButtonIcon}>🐙</Text>
              <Text style={styles.linkButtonText}>Open GitHub repository</Text>
            </TouchableOpacity>
            <Text style={styles.linkUrl} accessible={true}>
              {REPOSITORY_URL}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 16,
  },
  backBtn: {
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 1.5,
    marginTop: 18,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  rowDesc: {
    fontSize: 12,
    color: '#7F8C8D',
    lineHeight: 17,
    marginTop: 3,
  },
  volumeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
    minWidth: 48,
    textAlign: 'right',
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 6,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  testButtonIcon: {
    fontSize: 15,
  },
  testButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
    letterSpacing: 0.5,
  },
  dangerButton: {
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 12,
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
    letterSpacing: 0.5,
  },
  confirmBox: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    textAlign: 'center',
    marginBottom: 6,
  },
  confirmText: {
    fontSize: 12,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  confirmButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  linkButtonIcon: {
    fontSize: 15,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C3E50',
    letterSpacing: 0.5,
  },
  linkUrl: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});
