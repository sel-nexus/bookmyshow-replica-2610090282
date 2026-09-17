/** Render the login route. */
import { LoginForm } from '../../components/LoginForm';

/** Present mobile-number access to the booking journey. */
export default function LoginPage(): JSX.Element {
  return <main className="auth-page"><section className="auth-card" aria-labelledby="login-title">
    <p className="eyebrow">RED SEAT ACCESS</p><h1 id="login-title">Your next screening starts here.</h1>
    <p className="intro">Enter your mobile number to receive a secure verification code and pick up your booking.</p>
    <LoginForm />
  </section></main>;
}
