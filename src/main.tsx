import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import ErrorBoundary from './ErrorBoundary.tsx';
import './index.css';

// TEST: Load ONLY the landing page — skip App.tsx entirely
const LandingPage = lazy(() => import('./components/LandingPage'));

const Loading = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'system-ui',color:'#666'}}>
    Loading...
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <LandingPage
          onNavigate={() => {}}
          onGetStarted={() => alert('Get Started clicked')}
          onTeacherLogin={() => alert('Teacher Login clicked')}
          onTryDemo={() => alert('Try Demo clicked')}
          isAuthenticated={false}
        />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
