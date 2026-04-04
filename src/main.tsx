import {createRoot} from 'react-dom/client';

// Minimal test — does React render at all without App.tsx?
createRoot(document.getElementById('root')!).render(
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'sans-serif',fontSize:'2rem',color:'green'}}>
    <div>
      <h1>Vocaband is working!</h1>
      <p style={{fontSize:'1rem',color:'#666'}}>If you see this, the server and React are fine. The issue is in App.tsx.</p>
    </div>
  </div>
);
