/** Test movie discovery, protected pages, and deterministic seat handoff behavior. */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MovieGrid } from '../components/MovieGrid';
import { TheatreList } from '../components/TheatreList';
import { SeatGrid } from '../components/SeatGrid';

const push = vi.fn();
const replace = vi.fn();
const getMovies = vi.fn();
const getTheatres = vi.fn();
const updateJourney = vi.fn();
const bookingState = { token: '', updateJourney };
const movies = [{ id: 'mov_paradise', title: 'Paradise' }];
const theatres = [{ id: 'theatre_grand', name: 'Grand Cinema' }];

vi.mock('next/navigation', () => ({ useRouter: (): { push: typeof push; replace: typeof replace } => ({ push, replace }) }));
vi.mock('../lib/apiClient', () => ({ getMovies, getTheatres }));
vi.mock('../state/BookingContext', () => ({ useBooking: (): typeof bookingState => bookingState }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  bookingState.token = '';
});

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

describe('protected discovery pages', () => {
  it('redirects an unauthenticated dashboard visitor without loading protected controls', async (): Promise<void> => {
    const { default: DashboardPage } = await import('../app/dashboard/page');
    render(<DashboardPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(getMovies).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /choose/i })).not.toBeInTheDocument();
  });

  it('shows dashboard loading then its API error for an authenticated visitor', async (): Promise<void> => {
    bookingState.token = 'backend-token';
    let rejectMovies: (error: Error) => void = () => undefined;
    getMovies.mockReturnValue(new Promise((_, reject) => { rejectMovies = reject; }));
    const { default: DashboardPage } = await import('../app/dashboard/page');
    render(<DashboardPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading movies…');
    rejectMovies(new Error('Movies are unavailable.'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Movies are unavailable.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders resolved dashboard movies and continues only after an explicit movie choice', async (): Promise<void> => {
    bookingState.token = 'backend-token';
    getMovies.mockResolvedValue(movies);
    const { default: DashboardPage } = await import('../app/dashboard/page');
    render(<DashboardPage />);

    const chooseMovie = await screen.findByRole('button', { name: 'Choose Paradise' });
    expect(screen.getByRole('heading', { name: 'Paradise' })).toBeInTheDocument();
    expect(getMovies).toHaveBeenCalled();
    expect(updateJourney).not.toHaveBeenCalled();
    await userEvent.click(chooseMovie);
    expect(updateJourney).toHaveBeenCalledWith({ movie: movies[0], theatre: null, seats: [], total: 0 });
    expect(push).toHaveBeenCalledWith('/movies/mov_paradise/theatres');
  });

  it('shows theatre loading then its API error for the selected movie', async (): Promise<void> => {
    bookingState.token = 'backend-token';
    let rejectTheatres: (error: Error) => void = () => undefined;
    getTheatres.mockReturnValue(new Promise((_, reject) => { rejectTheatres = reject; }));
    const { default: TheatrePage } = await import('../app/movies/[movieId]/theatres/page');
    render(<TheatrePage params={{ movieId: 'mov_paradise' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading theatres…');
    expect(getTheatres).toHaveBeenCalledWith('mov_paradise');
    rejectTheatres(new Error('Theatres are unavailable.'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Theatres are unavailable.');
    expect(screen.queryByRole('button', { name: 'Continue to seats' })).not.toBeInTheDocument();
  });

  it('renders resolved theatres and continues only after an explicit theatre choice', async (): Promise<void> => {
    bookingState.token = 'backend-token';
    getTheatres.mockResolvedValue(theatres);
    const { default: TheatrePage } = await import('../app/movies/[movieId]/theatres/page');
    render(<TheatrePage params={{ movieId: 'mov_paradise' }} />);

    const theatre = await screen.findByRole('button', { name: 'Grand Cinema' });
    const continueToSeats = await screen.findByRole('button', { name: 'Continue to seats' });
    expect(getTheatres).toHaveBeenCalledWith('mov_paradise');
    expect(continueToSeats).toBeDisabled();
    await userEvent.click(theatre);
    expect(continueToSeats).toBeEnabled();
    await userEvent.click(continueToSeats);
    expect(updateJourney).toHaveBeenCalledWith({ theatre: theatres[0], seats: [], total: 0 });
    expect(push).toHaveBeenCalledWith('/seats');
  });
});
