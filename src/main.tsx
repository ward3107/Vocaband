import {createRoot} from 'react-dom/client';

// MINIMAL TEST: Does React mount at all?
// If you see "React is working!" the server and deployment are fine.
// If you see "Loading Vocaband..." the JS bundle isn't loading.
function TestApp() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'system-ui',background:'#f0fdf4'}}>
      <div style={{textAlign:'center',padding:'2rem',background:'white',borderRadius:'1rem',boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}>
        <h1 style={{color:'#16a34a',fontSize:'2rem',margin:'0 0 0.5rem'}}>React is working!</h1>
        <p style={{color:'#666',margin:0}}>The server and deployment are fine.</p>
        <p style={{color:'#999',fontSize:'0.8rem',marginTop:'1rem'}}>Deployed: {new Date().toISOString()}</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<TestApp />);
