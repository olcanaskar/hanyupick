// src/services/exampleService.js

import hsk1Examples from '../data/examples/hsk1_examples';
import hsk2Examples from '../data/examples/hsk2_examples';
import hsk3Examples from '../data/examples/hsk3_examples';
import hsk4Examples from '../data/examples/hsk4_examples';
import hsk5Examples from '../data/examples/hsk5_examples';

const EXAMPLES_MAP = {
  hsk1: hsk1Examples,
  hsk2: hsk2Examples,
  hsk3: hsk3Examples,
  hsk4: hsk4Examples,
  hsk5: hsk5Examples,
};

export const getExampleByWordId = (level, wordId) => {
  if (!wordId) return null;

  let targetLevel = level;
  if (level === 'mixed' || level === 'review') {
    if (wordId <= 150) targetLevel = 'hsk1';
    else if (wordId <= 300) targetLevel = 'hsk2';
    else if (wordId <= 600) targetLevel = 'hsk3';
    else if (wordId <= 1200) targetLevel = 'hsk4';
    else targetLevel = 'hsk5';
  }

  const currentLevelExamples = EXAMPLES_MAP[targetLevel?.toLowerCase()];
  if (!currentLevelExamples) return null;

  return currentLevelExamples[String(wordId)] || null;
};