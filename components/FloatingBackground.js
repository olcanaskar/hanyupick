import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated, useWindowDimensions } from 'react-native';
import { PARTICLE_COUNT, createParticle } from '../services/floatingParticles';

// Konum/hareket matematiği `services/floatingParticles.js`'te (test edilebilir, sınırlı
// hedef denemesi ve canlı pencere ölçüsü orada). Burada yalnızca animasyon var.
/**
 * @param {{ width: number, height: number }} props
 */
function FloatingParticle({ width, height }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [particle, setParticle] = useState(() => createParticle(true, { width, height }));

  useEffect(() => {
    let isMounted = true;

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: particle.duration,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && isMounted) {
        setParticle(createParticle(false, { width, height }));
      }
    });

    return () => {
      isMounted = false;
      progress.stopAnimation();
    };
    // `width`/`height` bağımlılık: pencere ölçüsü değişirse (bölünmüş ekran) uçuş yeni
    // ölçüye göre kurulur; bir sonraki doğuş da canlı ölçüyle konumlanır.
  }, [particle, width, height]);

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
  // Modül yüklenirken bir kez okunan `Dimensions.get` yerine canlı ölçü (Faz 4.3).
  const { width, height } = useWindowDimensions();
  const particles = Array.from({ length: PARTICLE_COUNT });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
      {particles.map((_, index) => (
        <FloatingParticle key={index} width={width} height={height} />
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
