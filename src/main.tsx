import {createRoot} from 'react-dom/client';

const root = document.getElementById('root')!;
const log = (msg: string) => {
  root.innerHTML += `<p style="font-family:monospace;margin:4px 16px">${new Date().toISOString().slice(11,23)} ${msg}</p>`;
};

log('Starting imports...');

async function testImports() {
  try {
    log('1. Importing vocabulary...');
    const t1 = performance.now();
    await import('./data/vocabulary');
    log(`   OK (${(performance.now()-t1).toFixed(0)}ms)`);

    log('2. Importing sentence-bank...');
    const t2 = performance.now();
    await import('./data/sentence-bank');
    log(`   OK (${(performance.now()-t2).toFixed(0)}ms)`);

    log('3. Importing vocabulary-matching...');
    const t3 = performance.now();
    await import('./data/vocabulary-matching');
    log(`   OK (${(performance.now()-t3).toFixed(0)}ms)`);

    log('4. Importing constants/game...');
    const t4 = performance.now();
    await import('./constants/game');
    log(`   OK (${(performance.now()-t4).toFixed(0)}ms)`);

    log('5. Importing supabase...');
    const t5 = performance.now();
    await import('./core/supabase');
    log(`   OK (${(performance.now()-t5).toFixed(0)}ms)`);

    log('6. Importing App...');
    const t6 = performance.now();
    await import('./App');
    log(`   OK (${(performance.now()-t6).toFixed(0)}ms)`);

    log('All imports OK. Rendering app...');
    const { default: App } = await import('./App');
    root.innerHTML = '';
    createRoot(root).render(<App />);
  } catch (err) {
    log(`ERROR: ${String(err)}`);
  }
}

testImports();
