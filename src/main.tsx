import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import './index.css';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <TooltipProvider>
            <App />
          </TooltipProvider>
        </BrowserRouter>
      </ConvexAuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
