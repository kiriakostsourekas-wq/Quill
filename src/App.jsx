import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Landing from '@/pages/Landing'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import PageNotFound from '@/lib/PageNotFound'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Router>
  )
}

export default App
