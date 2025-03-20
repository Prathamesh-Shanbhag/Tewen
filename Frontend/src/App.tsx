import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { AnimatePresence } from 'framer-motion'
import { Home } from './pages/Home'
// import { Builder } from './pages/Builder'

import Layout from '@/components/layout/Layout'
// import HomePage from '@/pages/HomePage'
import EditorPage from '@/pages/EditorPage'
// import HistoryPage from '@/pages/HistoryPage'
// import AboutPage from '@/pages/AboutPage'
// import NotFoundPage from '@/pages/NotFoundPage'

function App() {
  return (
    <AnimatePresence mode='wait'>
      <Routes>
        <Route path='/' element={<Layout />}>
          <Route index element={<Home />} />
          <Route path='editor' element={<EditorPage />} />
          {/* <Route path='builder' element={<Builder />} /> */}
        </Route>
      </Routes>
      <Toaster />
    </AnimatePresence>
  )
}

export default App
