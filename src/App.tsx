// src/App.tsx
// The router: the home page, one page per case and its investigation, and a fallback for any other address.
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import CaseInvestigation from '@/app/CaseInvestigation';
import SmoothScroll from '@/app/SmoothScroll';
import CaseFile from '@/features/board/CaseFile';
import Desk from '@/features/board/Desk';
import Report from '@/features/verdict/Report';
import Verdict from '@/features/verdict/Verdict';
import Case from '@/pages/Case';
import Home from '@/pages/Home';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <SmoothScroll>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/case/:id" element={<Case />} />
          {/* One layout for the whole investigation, so its state carries from screen to screen. */}
          <Route element={<CaseInvestigation />}>
            {/* The desk stays on screen while a file is open: the file is shown over it. Same URLs as before. */}
            <Route path="/case/:id/files" element={<Desk />}>
              <Route path=":evidenceId" element={<CaseFile />} />
            </Route>
            <Route path="/case/:id/verdict" element={<Verdict />} />
            <Route path="/case/:id/report" element={<Report />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </SmoothScroll>
  );
}
