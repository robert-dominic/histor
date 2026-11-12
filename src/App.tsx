// src/App.tsx
// The router: the home page and one page per case.

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Case from '@/pages/Case';
import Home from '@/pages/Home';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/case/:id" element={<Case />} />
      </Routes>
    </BrowserRouter>
  );
}
