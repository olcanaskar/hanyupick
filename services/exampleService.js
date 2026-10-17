// src/services/exampleService.js

import hsk1Examples from '../data/examples/hsk1_examples';
import hsk2Examples from '../data/examples/hsk2_examples';
import hsk3Examples from '../data/examples/hsk3_examples';
import hsk4Examples from '../data/examples/hsk4_examples';
import hsk5Examples from '../data/examples/hsk5_examples';
import hsk6Examples from '../data/examples/hsk6_examples';
import { getLevelFromWordId } from './wordRepository';

// Faz 10 sonrası kapsam altı seviyede de TAMDIR (hsk1-4 1200, hsk5 1300,
// hsk6 2500 -> 5000/5000). Yine de savunma amaçlı olarak: karşılığı olmayan
// kelime için null döner ve ExampleBox hiçbir şey çizmez (ör. custom deck
// kelimelerinin örneği yoktur).
const EXAMPLES_MAP = {
  hsk1: hsk1Examples,
  hsk2: hsk2Examples,
  hsk3: hsk3Examples,
  hsk4: hsk4Examples,
  hsk5: hsk5Examples,
  hsk6: hsk6Examples,
};

export const getExampleByWordId = (level, wordId) => {
  if (!wordId) return null;

  // "mixed"/"review" için seviye, id aralığından çözülür (tek kaynak: Faz 3.1).
  const targetLevel =
    level === 'mixed' || level === 'review' ? getLevelFromWordId(wordId) : level;

  const currentLevelExamples = EXAMPLES_MAP[targetLevel?.toLowerCase()];
  if (!currentLevelExamples) return null;

  return currentLevelExamples[String(wordId)] || null;
};