import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { recognizeHandwriting } from '../services/handwritingService';

const CANVAS_SIZE = 280;

// Kullanıcıya gösterilen hata metinleri (servis yalnızca hata KODU döner).
const ERROR_MESSAGES = {
  timeout: '⚠️ Timed out (internet slow?)',
  network: '⚠️ No connection (Internet required)',
};

export default function HandwritingModal({ visible, onClose, onSelectHanzi }) {
  const [paths, setPaths] = useState([]); // [[{x, y}, ...], ...]
  const [currentPath, setCurrentPath] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // İnternet hatası durumu

  // useRef kullanarak PanResponder içinde güncel veriye erişiyoruz
  const pathsRef = useRef(paths);
  pathsRef.current = paths;

  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;

  // Çizimleri servise gönderip karakter tanıma isteği atar.
  // İsteğin kendisi `services/handwritingService.js`te: orada ZAMAN AŞIMI var, yani
  // yavaş/askıda kalan bir ağda spinner sonsuza kadar dönmez.
  const recognizeStrokes = async (allPaths) => {
    if (!allPaths || allPaths.length === 0) {
      setCandidates([]);
      setErrorMessage('');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { candidates: found, error } = await recognizeHandwriting(allPaths, {
        canvasSize: CANVAS_SIZE,
      });

      setCandidates(found);
      setErrorMessage(ERROR_MESSAGES[error] ?? '');
    } catch (unexpectedError) {
      // Servis hata durumlarını kod olarak döner; buraya yalnızca beklenmeyen bir
      // hata düşer (ör. ortamda AbortController yoksa). Kullanıcı yine bilgilendirilir.
      if (__DEV__) console.warn('El yazısı tanıma beklenmeyen hata:', unexpectedError);
      setCandidates([]);
      setErrorMessage(ERROR_MESSAGES.network);
    } finally {
      setLoading(false);
    }
  };

  // Dokunma (Touch) Hareketlerini Yönetme
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const startPoint = { x: locationX, y: locationY };
        currentPathRef.current = [startPoint];
        setCurrentPath([startPoint]);
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPoint = { x: locationX, y: locationY };
        const updatedPath = [...currentPathRef.current, newPoint];
        currentPathRef.current = updatedPath;
        setCurrentPath(updatedPath);
      },

      onPanResponderRelease: () => {
        if (currentPathRef.current.length > 0) {
          const newPaths = [...pathsRef.current, currentPathRef.current];
          setPaths(newPaths);
          setCurrentPath([]);
          currentPathRef.current = [];
          recognizeStrokes(newPaths);
        }
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
    setCandidates([]);
    setErrorMessage('');
  };

  const handleUndo = () => {
    if (paths.length === 0) return;
    const updatedPaths = paths.slice(0, -1);
    setPaths(updatedPaths);
    recognizeStrokes(updatedPaths);
  };

  const handleSelect = (char) => {
    onSelectHanzi(char);
    handleClear();
    onClose();
  };

  // SVG Path Verisini Oluşturma
  const pathToSvgD = (pathPoints) => {
    if (!pathPoints || pathPoints.length === 0) return '';
    return pathPoints.reduce(
      (acc, point, index) =>
        index === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`,
      ''
    );
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessible={false}
        accessibilityElementsHidden={true}
        importantForAccessibility="no"
      >
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()} accessibilityViewIsModal={true}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">Draw Chinese Character</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Aday Karakterler veya İnternet Yok Uyarısı Çubuğu */}
          <View style={[styles.candidatesBar, errorMessage ? styles.candidatesBarError : null]}>
            {loading && <ActivityIndicator size="small" color="#DC2626" style={{ marginRight: 8 }} />}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.candidatesContent}>
              {errorMessage ? (
                <Text style={styles.errorText} accessible={true}>{errorMessage}</Text>
              ) : candidates.length === 0 && !loading ? (
                <Text style={styles.placeholderText} accessible={true}>Draw a character below...</Text>
              ) : (
                candidates.map((char, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.candidateChip}
                    onPress={() => handleSelect(char)}
                    accessibilityRole="button"
                    accessibilityLabel={`Candidate ${char}`}
                  >
                    <Text style={styles.candidateText}>{char}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          {/* Çizim Tuvalı (米字格 Traditional Chinese Grid) */}
          <View style={styles.canvasContainer} {...panResponder.panHandlers}>
            <Svg height={CANVAS_SIZE} width={CANVAS_SIZE} style={styles.canvasSvg}>
              {/* Grid Çizgileri */}
              <Line x1="0" y1="0" x2={CANVAS_SIZE} y2={CANVAS_SIZE} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4,4" />
              <Line x1={CANVAS_SIZE} y1="0" x2="0" y2={CANVAS_SIZE} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4,4" />
              <Line x1={CANVAS_SIZE / 2} y1="0" x2={CANVAS_SIZE / 2} y2={CANVAS_SIZE} stroke="#BDC3C7" strokeWidth="1.5" strokeDasharray="4,4" />
              <Line x1="0" y1={CANVAS_SIZE / 2} x2={CANVAS_SIZE} y2={CANVAS_SIZE / 2} stroke="#BDC3C7" strokeWidth="1.5" strokeDasharray="4,4" />

              {/* Tamamlanmış Çizimler */}
              {paths.map((p, index) => (
                <Path
                  key={index}
                  d={pathToSvgD(p)}
                  stroke="#991B1B"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Halihazırda Çizilen Çizgi */}
              {currentPath.length > 0 && (
                <Path
                  d={pathToSvgD(currentPath)}
                  stroke="#991B1B"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </Svg>
          </View>

          {/* Aksiyon Butonları */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleUndo} accessibilityRole="button" accessibilityLabel="Undo">
              <Text style={styles.actionBtnText}>↩ Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.clearBtn]} onPress={handleClear} accessibilityRole="button" accessibilityLabel="Clear">
              <Text style={styles.clearBtnText}>🗑 Clear</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 1,
  },
  closeBtn: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  candidatesBar: {
    width: '100%',
    height: 48,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    marginBottom: 14,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Hata durumu normal çubukla (açık kırmızı) KARIŞMASIN diye bir kademe daha koyu:
  // kırmızı-100 zemin + koyu kırmızı kenarlık.
  candidatesBarError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#991B1B',
  },
  candidatesContent: {
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  candidateChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  candidateText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DC2626',
  },
  canvasContainer: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    overflow: 'hidden',
  },
  canvasSvg: {
    backgroundColor: '#F8F9FA',
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#E9ECEF',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C3E50',
  },
  clearBtn: {
    backgroundColor: '#FEF2F2',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});