/** Render the fixed, non-interactive seat preview. */

const seats = ['A1', 'A2', 'A3'];

/** Present available seats without changing booking state. */
export function SeatGrid(): JSX.Element {
  return <div className="seat-grid" role="grid" aria-label="Available seats">
    {seats.map((seat) => <span key={seat} role="gridcell" className="seat" aria-label={`Seat ${seat}`}>{seat}</span>)}
  </div>;
}
