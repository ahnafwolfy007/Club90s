import { RegistrationForm } from "@/components/profile/registration-form";

export default function ProfileRegistrationPage() {
  return (
    <div className="fade-up flex flex-col gap-4 px-4 py-4">
      <div>
        <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">Registration details</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          The club keeps the same details its original registration form collected. Fill them in to be fully verified.
        </p>
      </div>
      <RegistrationForm />
    </div>
  );
}
