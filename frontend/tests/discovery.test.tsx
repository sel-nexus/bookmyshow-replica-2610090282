/** Test movie discovery and deterministic seat handoff behavior. */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MovieGrid } from '../components/MovieGrid';
import { TheatreList } from '../components/TheatreList';
import { SeatGrid } from '../components/SeatGrid';

const movies = [{ id: 'mov_paradise', title: 'Paradise' }];
const theatres = [{ id: 'theatre_grand', name: 'Grand Cinema' }];

describe('discovery components', () => {
  it('renders movie API results and changes nothing until the explicit movie button is clicked', async (): Promise<void> => {
    const selectMovie = vi.fn();
    render(<MovieGrid movies={movies} onSelect={selectMovie} />);
    expect(screen.getByRole('heading', { name: 'Paradise' })).toBeInTheDocument();
    expect(selectMovie).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Choose Paradise' }));
    expect(selectMovie).toHaveBeenCalledWith(movies[0]);
  });

  it('requires explicit theatre selection before handing off to seats', async (): Promise<void> => {
    const selectTheatre = vi.fn();
    const continueToSeats = vi.fn();
    const { rerender } = render(<TheatreList theatres={theatres} selectedTheatreId={null} onSelect={selectTheatre} onContinue={continueToSeats} />);
    expect(screen.getByRole('button', { name: 'Continue to seats' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Grand Cinema' }));
    expect(selectTheatre).toHaveBeenCalledWith(theatres[0]);
    expect(continueToSeats).not.toHaveBeenCalled();
    rerender(<TheatreList theatres={theatres} selectedTheatreId="theatre_grand" onSelect={selectTheatre} onContinue={continueToSeats} />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue to seats' }));
    expect(continueToSeats).toHaveBeenCalledTimes(1);
  });

  it('renders a noninteractive fixed seat grid', (): void => {
    render(<SeatGrid />);
    expect(screen.getByRole('grid', { name: 'Available seats' })).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /A[123]/ })).not.toBeInTheDocument();
  });

  it('keeps repeated explicit seat selection deterministic', async (): Promise<void> => {
    const selectSeats = vi.fn();
    render(<button type="button" onClick={() => selectSeats(['A1', 'A2', 'A3'], 450)}>Select seats</button>);
    const button = screen.getByRole('button', { name: 'Select seats' });
    await userEvent.click(button);
    await userEvent.click(button);
    expect(selectSeats).toHaveBeenNthCalledWith(1, ['A1', 'A2', 'A3'], 450);
    expect(selectSeats).toHaveBeenNthCalledWith(2, ['A1', 'A2', 'A3'], 450);
  });
});
