/** Render the OTP verification route. */
import { OtpForm } from '../../components/OtpForm';

/** Present OTP verification before the booking dashboard. */
export default function VerifyPage(): JSX.Element {
  return <main className="auth-page"><section className="auth-card" aria-labelledby="verify-title">
    <p className="eyebrow">ONE MORE STEP</p><h1 id="verify-title">Confirm it’s you.</h1>
    <p className="intro">Enter the code sent to your mobile number to unlock your booking dashboard.</p>
    <OtpForm />
  </section></main>;
}
