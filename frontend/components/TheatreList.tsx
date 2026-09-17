/** Render theatre selection and explicit handoff. */
'use client';

import type { Theatre } from '../lib/apiClient';

/** Describe theatre-list interaction inputs. */
interface TheatreListProps {
  theatres: Theatre[];
  selectedTheatreId: string | null;
  onSelect: (theatre: Theatre) => void;
  onContinue: () => void;
}

/** Let a guest select one theatre before continuing to seats. */
export function TheatreList({ theatres, selectedTheatreId, onSelect, onContinue }: TheatreListProps): JSX.Element {
  if (theatres.length === 0) return <p className="empty-state" role="status">No theatres are showing this movie.</p>;
  return <section aria-label="Theatre selection">
    <ul className="theatre-list">
      {theatres.map((theatre) => <li key={theatre.id}>
        <button type="button" className={selectedTheatreId === theatre.id ? 'theatre-option is-selected' : 'theatre-option'} aria-pressed={selectedTheatreId === theatre.id} onClick={() => onSelect(theatre)}>{theatre.name}</button>
      </li>)}
    </ul>
    <button type="button" onClick={onContinue} disabled={!selectedTheatreId}>Continue to seats</button>
  </section>;
}
