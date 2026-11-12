// src/App.tsx
// The router: the home page, one page per case, and a fallback for any other address.

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Case from '@/pages/Case';
import Home from '@/pages/Home';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/case/:id" element={<Case />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
