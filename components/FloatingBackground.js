import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';
import hsk1Data from '../data/hsk1.json';

const { width, height } = Dimensions.get('window');

const PARTICLE_COUNT = 18;
const MARGIN = 45; // Ekran dışı sınır mesafesi

// Sadece tek karakterlik Hanzi'ler
const SINGLE_HANZI_LIST = hsk1Data && hsk1Data.length > 0
  ? hsk1Data.filter(item => item.hanzi && item.hanzi.length === 1)
  : [{ hanzi: '字' }];

// Alt kenar ağırlıklı (%40 Alt, %20 Üst, %20 Sağ, %20 Sol) doğuş noktası seçimi
function getRandomBoundaryPoint() {
  const rand = Math.random();
  if (rand < 0.40) {
    return { x: Math.random() * width, y: height + MARGIN }; // Alt kenar (%40)
  } else if (rand < 0.60) {
    return { x: Math.random() * width, y: -MARGIN }; // Üst kenar (%20)
  } else if (rand < 0.80) {
    return { x: width + MARGIN, y: Math.random() * height }; // Sağ kenar (%20)
  } else {
    return { x: -MARGIN, y: Math.random() * height }; // Sol kenar (%20)
  }
}

function createParticle(isInitial = false) {
  const randomItem = SINGLE_HANZI_LIST[Math.floor(Math.random() * SINGLE_HANZI_LIST.length)] || { hanzi: '字' };
  const size = Math.floor(Math.random() * 14) + 32; // 32px - 46px

  let startX, startY, endX, endY;

  if (isInitial) {
    // İlk açılış: Karakterler ekranın geneline dağıtılır
    startX = Math.random() * (width - 60) + 30;
    startY = Math.random() * (height - 60) + 30;

    const target = getRandomBoundaryPoint();
    endX = target.x;
    endY = target.y;
  } else {
    // Sonraki doğuşlar: Ağırlıklı olarak alttan doğar
    const start = getRandomBoundaryPoint();
    startX = start.x;
    startY = start.y;

    let target = getRandomBoundaryPoint();
    // Karakterin doğduğu kenara yakın bir yere gitmesini engeller
    while (Math.abs(target.x - startX) < 120 && Math.abs(target.y - startY) < 120) {
      target = getRandomBoundaryPoint();
    }
    endX = target.x;
    endY = target.y;
  }

  // Sabit hız mantığı (20-28 px/saniye akıcı yavaşlık)
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = Math.random() * 8 + 20; 
  const duration = (distance / speed) * 1000;

  return {
    id: Math.random().toString(),
    char: randomItem.hanzi,
    size,
    duration,
    startX,
    startY,
    endX,
    endY,
  };
}

function FloatingParticle() {
  const progress = useRef(new Animated.Value(0)).current;
  const [particle, setParticle] = useState(() => createParticle(true));

  useEffect(() => {
    let isMounted = true;

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: particle.duration,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && isMounted) {
        setParticle(createParticle(false));
      }
    });

    return () => {
      isMounted = false;
      progress.stopAnimation();
    };
  }, [particle]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [particle.startX, particle.endX],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [particle.startY, particle.endY],
  });

  return (
    <Animated.Text
      style={[
        styles.hanziText,
        {
          fontSize: particle.size,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      {particle.char}
    </Animated.Text>
  );
}

export default function FloatingBackground() {
  const particles = Array.from({ length: PARTICLE_COUNT });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((_, index) => (
        <FloatingParticle key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hanziText: {
    position: 'absolute',
    left: 0,
    top: 0,
    fontWeight: '700',
    color: '#B5A285',
    opacity: 0.18,
  },
});