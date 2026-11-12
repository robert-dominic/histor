// src/pages/NotFound.tsx
// Shown for any address that is not the home page or a case page. Plain on purpose.

import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main>
      <p>Page not found</p>
      <Link to="/">Return to home</Link>
    </main>
  );
}
