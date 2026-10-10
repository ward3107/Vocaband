import { test, expect } from '@playwright/test';
for (const language of ['he','ar']) test(`60 players fit and remain actionable (${language})`,async({ page,isMobile },testInfo) => {
  await page.goto(`/e2e/board/index.html?lang=${language}`);
  const board=page.getByTestId('qp-board'), rows=board.getByRole('listitem');
  await expect(rows).toHaveCount(60);
  await expect.poll(() => board.evaluate(el => el.clientHeight)).toBeGreaterThan(400);
  const overflow=await board.evaluate(el => ({ horizontal:document.documentElement.scrollWidth>innerWidth+1, vertical:el.scrollHeight-el.clientHeight }));
  expect(overflow.horizontal).toBe(false);
  if (!isMobile) expect(overflow.vertical).toBeLessThanOrEqual(2);
  await page.screenshot({path:testInfo.outputPath(`grid-${language}.png`),fullPage:true});
  const last=board.locator('[data-qp-uid="player-59"]');
  await last.scrollIntoViewIfNeeded();
  const bonus=last.getByRole('button',{name:language==='he' ? /הוסף/ : /أضف/});
  await bonus.focus(); await expect(bonus).toBeVisible(); await bonus.click();
  await expect(last).toContainText('310');
  const remove=last.getByRole('button',{name:language==='he' ? /הסר/ : /إزالة/});
  await remove.click(); await expect(rows).toHaveCount(59);
  await expect(board.locator('[data-qp-uid="player-1"]')).toHaveCount(1); // same display name survives
});
