import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LucideProvider } from 'lucide-react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/api'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* icons default to text size; nav and info icons set their own */}
    <QueryClientProvider client={queryClient}>
      <LucideProvider size={16} strokeWidth={1.8}>
        <App />
      </LucideProvider>
    </QueryClientProvider>
  </StrictMode>,
)
