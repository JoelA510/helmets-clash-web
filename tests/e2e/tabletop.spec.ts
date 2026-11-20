import { expect, test, type Page } from '@playwright/test';
import { initialState } from '../../src/game/state';
import { CARD_POOL } from '../../src/game/constants';
import { mkConfig } from '../../src/__tests__/helpers';

async function resume(page: Page) {
  const state = initialState(mkConfig());
  const [knight,,enemy] = state.units;
  Object.assign(knight, { q:2, r:2 });
  Object.assign(enemy, { q:4, r:2 });
  state.units = [knight,enemy];
  state.cities[0].q = 2; state.cities[0].r = 2;
  state.cities[1].q = 4; state.cities[1].r = 2;
  state.factions.f1.explored = new Set(['2,2','3,2','4,2']);
  for (const q of [2,3,4]) state.map[q+',2'] = { q,r:2,type:'grass' };
  state.map['1,2'] = {q:1,r:2,type:'mountain'};
  state.factions.f1.hand = CARD_POOL.filter(c => c.id === 'march' || c.id === 'heal').map(c => ({...c,uid:c.id}));
  state.factions.f2.hand = [{...CARD_POOL.find(c => c.id === 'ambush')!,uid:'private'}];
  state.log = [{turn:1,faction:'f2',text:'Private opponent event'}];
  await page.addInitScript(save => {
    localStorage.setItem('helmets-clash:save:v1',save);
    localStorage.setItem('helmets-clash:prefs:v1',JSON.stringify({tutorial:'dismissed',confirmEndTurnWithActions:false}));
  },JSON.stringify(state,(_,v) => v instanceof Set ? [...v] : v));
  await page.goto('/');
  await page.getByRole('button',{name:'Resume campaign'}).click();
}

test('mouse and keyboard share a fog-safe inspector, pan without activation, and recenter the cursor', async ({page}) => {
  await resume(page);
  const board = page.getByRole('application');
  const inspector = page.getByLabel('Tile inspector');
  const unknown = page.locator('[data-hex="1,2"] > polygon').first();
  await unknown.hover(); await expect(inspector).toContainText('Unexplored (1, 2)');
  await board.focus(); await page.keyboard.press('ArrowLeft');
  await expect(inspector).toContainText('Unexplored (1, 2)');
  await expect(inspector).not.toContainText('Mountain');
  const unit = page.locator('[data-tour=unit]').first();
  const box = (await unit.boundingBox())!;
  const view = await board.getAttribute('viewBox');
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down(); await page.mouse.move(box.x+80,box.y+50,{steps:5});await page.mouse.up();
  await expect(board).not.toHaveAttribute('viewBox',view!);
  await expect(inspector.getByRole('definition')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Open city .* management/})).toHaveCount(0);
  await board.focus();
  for (let i=0;i<8;i++) await page.keyboard.press('ArrowRight');
  const cursor = board.locator('polygon[stroke="#ffffff"]');
  const b = (await board.boundingBox())!, c = (await cursor.boundingBox())!;
  expect(c.x).toBeGreaterThanOrEqual(b.x); expect(c.x+c.width).toBeLessThanOrEqual(b.x+b.width);
  await page.getByRole('button',{name:'Open tutorial'}).click();
  const dialog = page.getByRole('dialog');
  await page.keyboard.press('e'); await expect(dialog).toBeVisible();
  await dialog.getByRole('button',{name:'Next'}).click();
  await expect(dialog.getByRole('heading',{name:'Your pieces'})).toBeVisible();
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Open tutorial'})).toBeFocused();
  await page.getByRole('button',{name:/End Turn \(E\)/}).click();
  await expect(page.getByRole('application')).toHaveCount(0);
  await expect(page.getByRole('region',{name:'Your hand'})).toHaveCount(0);
  await page.getByRole('button',{name:/I'm ready/}).click();
  await expect(page.getByRole('button',{name:/Ambush.*Immediate/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Forced March/})).toHaveCount(0);
});

test.describe('phone',() => {
  test.use({hasTouch:true,viewport:{width:390,height:844},reducedMotion:'reduce'});
  test('target taps preview card, movement and attack until confirmed',async ({page}) => {
    await resume(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button',{name:/Show cards/}).tap();
    const hand = page.getByRole('region',{name:'Your hand'});
    await hand.getByRole('button',{name:/Healing Hand/}).tap();
    const prompt = page.getByRole('status').filter({hasText: 'Healing Hand'});
    const promptBox = (await prompt.boundingBox())!;
    const mapBox = (await page.getByRole('application').boundingBox())!;
    expect(promptBox.y + promptBox.height).toBeLessThanOrEqual(mapBox.y + 1);
    const unit = page.locator('[data-tour=unit]').first();
    // Native multi-touch over a legal target must not even open confirmation.
    const box = (await unit.boundingBox())!;
    const x = box.x+box.width/2, y = box.y+box.height/2;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{ type:'touchStart',touchPoints:[{x,y,id:1},{x:x+18,y,id:2}] });
    await cdp.send('Input.dispatchTouchEvent',{ type:'touchMove',touchPoints:[{x:x-12,y,id:1},{x:x+30,y,id:2}] });
    await cdp.send('Input.dispatchTouchEvent',{ type:'touchEnd',touchPoints:[] });
    await expect(page.getByRole('button',{name:'Confirm Healing Hand'})).toHaveCount(0);
    await expect(hand.getByRole('button',{name:/Healing Hand/})).toHaveAttribute('aria-pressed','true');
    await unit.tap();
    await expect(page.getByLabel('Tile inspector')).toContainText('Already at full health');
    await expect(hand.getByRole('button',{name:/Healing Hand/})).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('[data-card-target]')).toHaveCount(1);
    await page.getByRole('button',{name:'Confirm Healing Hand'}).tap();
    await expect(hand.getByRole('button',{name:/Healing Hand/})).toHaveCount(0);
    await unit.tap();
    const pos = await unit.getAttribute('transform');
    await page.locator('[data-hex="3,2"] > polygon').first().tap();
    await expect(unit).toHaveAttribute('transform',pos!);
    await expect(page.getByLabel('Tile inspector')).toContainText('Move costs 1');
    await page.getByRole('button',{name:'Confirm move'}).tap();
    await expect(unit).not.toHaveAttribute('transform',pos!);
    const enemy = page.getByRole('img',{name:/P2 Skeleton, health/});
    const hp = await enemy.getAttribute('aria-label');
    await enemy.tap(); await expect(enemy).toHaveAttribute('aria-label',hp!);
    await page.getByRole('button',{name:'Confirm attack'}).tap();
    await expect(enemy).not.toHaveAttribute('aria-label',hp!);
    await expect(page.getByRole('button',{name:/Next ready unit \(0 ready\)/})).toBeDisabled();
    await expect(page.getByText('Private opponent event')).toHaveCount(0);
    await expect(page.locator('.action-feedback')).toContainText('counterattack');
    await expect(page.locator('.board-impact').first()).toBeVisible();
    await page.getByRole('button',{name:/End Turn \(E\)/}).tap();
    await expect(page.getByText('Since your last turn')).toHaveCount(0);
    await expect(page.locator('.board-impact')).toHaveCount(0);
    await page.getByRole('button',{name:/I'm ready/}).tap();
    await expect(page.locator('header')).toContainText('P2 · Grimhold');
    await page.getByText(/Since your last turn/).tap();
    await expect(page.locator('.turn-recap li').first()).toContainText('Skeleton at (4, 2) lost');
    await expect(page.locator('.board-impact')).toHaveCount(0);
  });
});

test('autosave warns on a rejected write and Retry persists the current position', async ({page}) => {
  await resume(page);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key,value) {
      if (key === 'helmets-clash:save:v1') {
        Storage.prototype.setItem = write;
        throw new DOMException('Full','QuotaExceededError');
      }
      write.call(this,key,value);
    };
  });
  await page.locator('[data-tour=unit]').first().click();
  const warning = page.getByRole('status').filter({hasText:"Game couldn't be saved"});
  await expect(warning).toBeVisible();
  await warning.getByRole('button',{name:'Retry'}).click();
  await expect(warning).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('helmets-clash:save:v1')!).selectedUnitId)).toBeTruthy();
});
