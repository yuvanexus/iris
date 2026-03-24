import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './index.css'

import { AuthProvider } from './contexts/AuthContext'

const router = createRouter({ routeTree })

function RenderApp() {
  return (
    <StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')).render(<RenderApp />)
