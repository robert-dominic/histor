// src/App.tsx
// The router: the home page, one page per case and its investigation, and a fallback for any other address.
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import CaseInvestigation from '@/app/CaseInvestigation';
import Board from '@/features/board/Board';
import CaseFile from '@/features/board/CaseFile';
import Report from '@/features/verdict/Report';
import Verdict from '@/features/verdict/Verdict';
import Case from '@/pages/Case';
import Home from '@/pages/Home';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/case/:id" element={<Case />} />
        {/* One layout for the whole investigation, so its state carries from screen to screen. */}
        <Route element={<CaseInvestigation />}>
          <Route path="/case/:id/files" element={<Board />} />
          <Route path="/case/:id/files/:evidenceId" element={<CaseFile />} />
          <Route path="/case/:id/verdict" element={<Verdict />} />
          <Route path="/case/:id/report" element={<Report />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
