// src/App.tsx
// The router: the home page, one page per case and its investigation, and a fallback for any other address.
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import CaseInvestigation from '@/app/CaseInvestigation';
import SmoothScroll from '@/app/SmoothScroll';
import CaseFile from '@/features/board/CaseFile';
import Desk from '@/features/board/Desk';
import Report from '@/features/verdict/Report';
import Verdict from '@/features/verdict/Verdict';
import Case from '@/pages/Case';
import Home from '@/pages/Home';
import DevSound from '@/pages/DevSound';
import NotFound from '@/pages/NotFound';
import { startSound } from '@/lib/sound';

export default function App() {
  // The sound listens from the start, and sounds only after the first gesture (src/lib/sound).
  useEffect(() => startSound(), []);
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
          {/* Every generated sound, for tuning by ear: development builds only. */}
          {import.meta.env.DEV && <Route path="/dev/sound" element={<DevSound />} />}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </SmoothScroll>
  );
}
