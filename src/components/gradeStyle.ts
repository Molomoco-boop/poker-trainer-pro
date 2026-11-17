import { Grade } from '../types/poker';

export const GRADE_STYLE: Record<Grade, string> = {
  best: 'bg-good text-white',
  valid: 'bg-good/70 text-white',
  imprecise: 'bg-warn text-black',
  error: 'bg-bad text-white',
  blunder: 'bg-[#8f1d1d] text-white'
};

