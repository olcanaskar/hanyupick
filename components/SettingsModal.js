// src/components/SettingsModal.js
//
// Faz 11: Ayarlar pop-up'ı (İstatistikler ile aynı kabuk: karartılmış zemin,
// ölçek/kayma animasyonu, sağ üstte ✕). Üç ayar + iki eylem:
//   1. Titreşim (dokunsal geri bildirim) aç/kapa      -> services/hapticsService.js okur
//   2. Sesli okuma seviyesi (slider)                  -> services/speechService.js okur
//   3. İlerlemeyi sıfırla (istatistik + hata havuzu)  -> services/statsManager.js
//   4. Hakkında: uygulama adı + sürüm + geliştirici + GitHub bağlantısı
//      (Faz 23 — adın uygulamada görünmesi ders projesi kriteri).
//
// Tüm ayarlar tek kaynaktan gelir (services/settingsService.js): buradaki
// değişiklikler `onSettingsChange` olayıyla yayılır ve ses/titreşim servisleri
// anlık (senkron) önbelleği okuduğu için quiz ekranına dönmeye gerek kalmaz.

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  DeviceEventEmitter,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path } from 'react-native-svg';

import appConfig from '../app.json';
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
import { showAlert } from '../services/dialogService';
import { WEB_FRAME_WIDTH } from './layout';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Repo şu an private olsa da adres sabittir; ileride public yapılınca da aynı
// buton çalışır. (Butona basan kişinin erişimi yoksa tarayıcı 404 gösterir.)
const REPOSITORY_URL = 'https://github.com/olcanaskar/hanyupick';

// Geliştirici adı + lisans, Hakkında kartında gösterilir. Sürüm doğrudan
// `app.json`'dan okunur (EAS'te yalnızca `versionCode`/`buildNumber` uzaktan
// yönetilir, `version` hâlâ app.json'dadır). `expo-constants` web derlemesinde
// `expoConfig` boş kaldığı için orada sürüm "1.0.0" görünüyordu; JSON importu
// her platformda aynı değeri verir.
const DEVELOPER_NAME = 'Olcan Askar';
const LICENSE_NAME = 'MIT';
const APP_VERSION = appConfig?.expo?.version || '1.0.0';

/**
 * GitHub'ın asıl logosu (emoji yerine vektör çizim). Tek renk `fill` ile boyanır,
 * böylece yanındaki metinle aynı tonu alır (bkz. `linkButtonText`).
 * Yol, GitHub'ın resmi "mark-github" (octicon) işaretidir — 16x16 tuval.
 *
 * Görsel olduğu için erişilebilirlik ağacına girmez; butonun kendisi
 * (`accessibilityLabel="Open the GitHub repository in your browser"`) zaten
 * tek erişilebilirlik öğesidir ve çocuklarını gizler.
 *
 * @param {{ size?: number, color?: string }} props
 */
function GitHubMark({ size = 16, color = '#2C3E50' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        fill={color}
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </Svg>
  );
}

// Slider adımı: %5'lik dilimler (0.00–1.00 aralığı).
const VOLUME_STEP = 0.05;
const TEST_TEXT = '你好';

export default function SettingsModal({ visible, onClose }) {
  const [settings, setSettings] = useState(getCachedSettings());
  const [resetConfirm, setResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // StatsModal ile birebir aynı Pop-up Animasyon Değerleri
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const translateYAnim = useRef(new Animated.Value(35)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    scaleAnim.setValue(0.85);
    translateYAnim.setValue(35);
    opacityAnim.setValue(0);
    // Modal her açılışta temiz başlar: yarım kalmış bir sıfırlama onayı görünmesin.
    setResetConfirm(false);
    setIsResetting(false);

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
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Diskteki güncel ayarları oku (önbellek açılışta da dolar ama modal
    // başka bir yerden değişmiş olabilir) + değişiklikleri dinle.
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
  }, [visible, scaleAnim, translateYAnim, opacityAnim]);

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
    // ÖN KONTROL YOK: `Linking.canOpenURL()` Android 11+ (SDK 30) paket görünürlüğü
    // kurallarında, uygulamanın manifest'i `<queries>` ile tarayıcıyı bildirmediği
    // sürece `false` döner. Expo Go'nun manifest'i bildirdiği için orada çalışır,
    // standalone APK'da çalışmazdı (kullanıcı bildirimi, Faz 17 — NOTES §21).
    // `Linking.openURL()` niyeti doğrudan başlattığı için bu filtreden etkilenmez;
    // bu yüzden URL'yi doğrudan açıyoruz, başarısız olursa adresi panoya kopyalayıp
    // kullanıcının tarayıcıya yapıştırabilmesini sağlıyoruz.
    try {
      await Linking.openURL(REPOSITORY_URL);
    } catch (error) {
      console.error('Bağlantı açılamadı:', error);
      try {
        await Clipboard.setStringAsync(REPOSITORY_URL);
        showAlert(
          'Could not open link',
          `No app could open the repository page, so the address was copied to your clipboard:\n\n${REPOSITORY_URL}`
        );
      } catch (copyError) {
        console.error('Adres kopyalanamadı:', copyError);
        showAlert('Could not open link', `Open this address in a browser:\n\n${REPOSITORY_URL}`);
      }
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        {/* Kapatma alanı dekoratiftir: ekran okuyucu ağacının DIŞINDA tutulur, yoksa
            odaklanıp "etiketsiz" diye okunur (kapatma için ✕ ve donanım geri tuşu var). */}
        <AnimatedPressable
          style={[styles.overlay, { opacity: opacityAnim }]}
          onPress={handleClose}
          accessible={false}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
        />

        <Animated.View
          style={[
            styles.contentCard,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
            },
          ]}
          accessibilityViewIsModal={true}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              SETTINGS
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
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
              <View style={styles.aboutIdentity}>
                <Text style={styles.aboutAppName} accessible={true}>
                  HanyuPick
                </Text>
                <Text style={styles.aboutAuthor} accessible={true}>
                  Developed by {DEVELOPER_NAME}
                </Text>
                <Text style={styles.aboutMeta} accessible={true}>
                  Version {APP_VERSION} · {LICENSE_NAME} License
                </Text>
              </View>
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
                <GitHubMark size={16} />
                <Text style={styles.linkButtonText}>Open GitHub repository</Text>
              </TouchableOpacity>
              <Text style={styles.linkUrl} accessible={true}>
                {REPOSITORY_URL}
              </Text>
            </View>
          </ScrollView>
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
    // Faz 24 (web): Modal `document.body`'ye portal açtığı için kart aksi hâlde
    // tüm sekmeyi kaplıyor; çerçeve genişliğiyle sınırlanır (bkz. components/layout.js).
    maxWidth: WEB_FRAME_WIDTH,
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  closeBtn: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  scrollBody: {
    paddingBottom: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 1.5,
    marginTop: 4,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
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
    fontSize: 15,
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
  // Hakkında kartının kimlik bloğu: uygulama adı, geliştirici, sürüm + lisans.
  aboutIdentity: {
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 2,
  },
  aboutAppName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2C3E50',
    letterSpacing: 0.5,
  },
  aboutAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
    marginTop: 3,
  },
  aboutMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 5,
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
