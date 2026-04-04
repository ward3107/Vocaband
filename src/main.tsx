import {createRoot} from 'react-dom/client';

const root = document.getElementById('root')!;
const log = (msg: string) => {
  root.innerHTML += `<p style="font-family:monospace;margin:2px 16px;font-size:13px">${new Date().toISOString().slice(11,23)} ${msg}</p>`;
};

log('Testing App.tsx sub-imports...');

async function testImports() {
  try {
    const t = (label: string, fn: () => Promise<any>) => async () => {
      log(label);
      const s = performance.now();
      await fn();
      log(`  OK (${(performance.now()-s).toFixed(0)}ms)`);
    };

    await t('1. lucide-react', () => import('lucide-react'))();
    await t('2. motion/react', () => import('motion/react'))();
    await t('3. core/supabase', () => import('./core/supabase'))();
    await t('4. utils/planLimits', () => import('./utils/planLimits'))();
    await t('5. hooks/useAudio', () => import('./hooks/useAudio'))();
    await t('6. QuickPlayMonitor', () => import('./components/QuickPlayMonitor'))();
    await t('7. FloatingButtons', () => import('./components/FloatingButtons'))();
    await t('8. CookieBanner', () => import('./components/CookieBanner'))();
    await t('9. CreateAssignmentWizard', () => import('./components/CreateAssignmentWizard'))();
    await t('10. PastePreviewModal', () => import('./components/PastePreviewModal'))();
    await t('11. utils/wordAnalysis', () => import('./utils/wordAnalysis'))();
    await t('12. LazyComponents', () => import('./components/LazyComponents'))();
    await t('13. OAuthButton', () => import('./components/OAuthButton'))();
    await t('14. errorTracking', () => import('./errorTracking'))();
    await t('15. constants/game', () => import('./constants/game'))();
    await t('16. TopAppBar', () => import('./components/TopAppBar'))();
    await t('17. ClassCard', () => import('./components/ClassCard'))();
    await t('18. ActionCard', () => import('./components/ActionCard'))();
    await t('19. utils (shuffle etc)', () => import('./utils'))();
    await t('20. App.tsx FULL', () => import('./App'))();

    log('ALL DONE - no freeze detected');
  } catch (err) {
    log(`ERROR: ${String(err)}`);
  }
}

testImports();
