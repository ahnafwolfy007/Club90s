/**
 * What "fully verified" means for a member.
 *
 * The club's original registration form captured a fixed set of details, and a
 * member counts as fully verified only once they've supplied the same set.
 * Optional fields are the ones the original form itself let people skip —
 * spouse's name, workplace and institution don't apply to everyone, and the
 * NID photo was blank for several of the members already imported.
 */

export type RegistrationProfile = {
  fullName?: string | null;
  dob?: Date | string | null;
  bloodGroup?: string | null;
  phone?: string | null;
  address?: string | null;
  fathersName?: string | null;
  mothersName?: string | null;
  nidNumber?: string | null;
  occupation?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  position?: string | null;
  // Genuinely optional — not everyone has these.
  spouseName?: string | null;
  workplace?: string | null;
  educationalInstitution?: string | null;
  jerseyNumber?: number | null;
  interests?: string | null;
  nidPhotoUrl?: string | null;
  profilePhotoUrl?: string | null;
};

/** Fields a member must supply before they count as fully verified. */
export const REQUIRED_REGISTRATION_FIELDS = [
  "fullName",
  "dob",
  "bloodGroup",
  "phone",
  "address",
  "fathersName",
  "mothersName",
  "nidNumber",
  "occupation",
  "emergencyContactName",
  "emergencyContactPhone",
  "position",
] as const;

export const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  dob: "Date of birth",
  bloodGroup: "Blood group",
  phone: "Phone number",
  address: "Address",
  fathersName: "Father's name",
  mothersName: "Mother's name",
  nidNumber: "NID number",
  occupation: "Occupation",
  emergencyContactName: "Emergency contact name",
  emergencyContactPhone: "Emergency contact phone",
  position: "Playing position",
};

function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

/** Which required fields are still missing, and whether the profile is complete. */
export function registrationCompleteness(profile: RegistrationProfile): {
  complete: boolean;
  missing: string[];
  missingLabels: string[];
  completedCount: number;
  totalRequired: number;
} {
  const missing = REQUIRED_REGISTRATION_FIELDS.filter(
    (field) => !isPresent(profile[field as keyof RegistrationProfile]),
  );

  return {
    complete: missing.length === 0,
    missing,
    missingLabels: missing.map((f) => FIELD_LABELS[f] ?? f),
    completedCount: REQUIRED_REGISTRATION_FIELDS.length - missing.length,
    totalRequired: REQUIRED_REGISTRATION_FIELDS.length,
  };
}
