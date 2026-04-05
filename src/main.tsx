import {createRoot} from 'react-dom/client';
import './index.css';

// TEST: Import vocabulary (569KB, 5156 words) and measure time
const start = performance.now();

function TestApp() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'system-ui',background:'#f0fdf4'}}>
      <div style={{textAlign:'center',padding:'2rem',background:'white',borderRadius:'1rem',boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}>
        <h1 style={{color:'#16a34a',fontSize:'2rem',margin:'0 0 0.5rem'}}>Test: Loading vocabulary...</h1>
        <p id="status" style={{color:'#666'}}>Importing 5,156 words...</p>
        <button
          onClick={async () => {
            const el = document.getElementById('status')!;
            el.textContent = 'Importing vocabulary...';
            const t0 = performance.now();
            const vocab = await import('./data/vocabulary');
            const t1 = performance.now();
            el.textContent = `Vocabulary loaded: ${vocab.ALL_WORDS.length} words in ${(t1-t0).toFixed(0)}ms`;

            el.textContent += '\nImporting App...';
            const t2 = performance.now();
            try {
              await import('./App');
              const t3 = performance.now();
              el.textContent += `\nApp loaded in ${(t3-t2).toFixed(0)}ms`;
            } catch(e: any) {
              el.textContent += `\nApp FAILED: ${e.message}`;
            }
          }}
          style={{marginTop:'1rem',padding:'0.75rem 2rem',background:'#16a34a',color:'white',border:'none',borderRadius:'0.5rem',fontSize:'1rem',cursor:'pointer'}}
        >
          Start Test
        </button>
        <p style={{color:'#999',fontSize:'0.8rem',marginTop:'1rem'}}>Boot time: {(performance.now() - start).toFixed(0)}ms</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<TestApp />);
