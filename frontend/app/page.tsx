/** Redirect the root route to login. */
import { redirect } from 'next/navigation';

/** Send visitors directly to the access screen. */
export default function HomePage(): never {
  redirect('/login');
}
