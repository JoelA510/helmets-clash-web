import { expect, it } from 'vitest';
import { raiderRace, screens, siege } from '../../scripts/balance-scenarios';

it('gives each runner the same approach with either initiative', () => {
  for (const first of ['f1','f2'] as const) {
    expect(raiderRace(first).firstHit).toEqual({f1:2,f2:2});
  }
});

it('distinguishes screening a deployed Ballista from eliminating it during the response turn', () => {
  expect(siege('none')).toMatchObject({firedAfterMoving:false, firedNextTurn:true, cityHP:13});
  expect(siege('garrison')).toMatchObject({firedNextTurn:true, cityHP:20});
  expect(siege('combined')).toMatchObject({firedNextTurn:false, cityHP:20});
});

it('exchanges the first actual strike on mirrored screens', () => {
  for (const first of ['f1','f2'] as const) {
    for (const reverse of [false,true]) {
      expect(screens(first,'grass',reverse).firstStrike).toBe(first);
    }
  }
});
