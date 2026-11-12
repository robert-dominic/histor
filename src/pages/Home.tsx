// src/pages/Home.tsx
// The list of cases. Plain on purpose: this proves the registry wiring. The designed screen comes later.

import { Link } from 'react-router-dom';
import { registry } from '@/cases';

export default function Home() {
  return (
    <main>
      <h1>Histor</h1>
      <ul>
        {registry.map(entry => (
          <li key={entry.id}>
            {entry.sealed ? (
              // A sealed case is text only: no link, no navigation.
              <p>
                {entry.title} ({entry.year}). {entry.teaser} [Sealed]
              </p>
            ) : (
              <p>
                <Link to={`/case/${entry.id}`}>
                  {entry.title} ({entry.year})
                </Link>
                . {entry.teaser}
              </p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
