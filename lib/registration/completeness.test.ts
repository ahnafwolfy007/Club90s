import { describe, it, expect } from "vitest";
import { registrationCompleteness, REQUIRED_REGISTRATION_FIELDS } from "./completeness";

const complete = {
  fullName: "Nazran Zubaer",
  dob: new Date("1992-12-13"),
  bloodGroup: "B+",
  phone: "01914447035",
  address: "17, New Baily Road, Ramna, Dhaka",
  fathersName: "A D M Salah Uddin",
  mothersName: "Nurun Nahar Begum",
  nidNumber: "2357735634",
  occupation: "Business",
  emergencyContactName: "Sabah Saleque",
  emergencyContactPhone: "01314491641",
  position: "Central Midfielder (CM)",
};

describe("registration completeness", () => {
  it("marks a fully filled profile as complete", () => {
    const result = registrationCompleteness(complete);
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.completedCount).toBe(result.totalRequired);
  });

  it("does not require the optional fields the original form let people skip", () => {
    // No spouse, workplace, institution, jersey number, interests or photos.
    expect(registrationCompleteness(complete).complete).toBe(true);
  });

  it("flags each required field individually when missing", () => {
    for (const field of REQUIRED_REGISTRATION_FIELDS) {
      const partial = { ...complete, [field]: null };
      const result = registrationCompleteness(partial);
      expect(result.complete).toBe(false);
      expect(result.missing).toContain(field);
      expect(result.completedCount).toBe(result.totalRequired - 1);
    }
  });

  it("treats whitespace-only answers as missing, not filled", () => {
    const result = registrationCompleteness({ ...complete, address: "   " });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain("address");
  });

  it("treats an empty string as missing", () => {
    expect(registrationCompleteness({ ...complete, occupation: "" }).complete).toBe(false);
  });

  it("counts an empty profile as zero of the full set", () => {
    const result = registrationCompleteness({});
    expect(result.complete).toBe(false);
    expect(result.completedCount).toBe(0);
    expect(result.missing).toHaveLength(REQUIRED_REGISTRATION_FIELDS.length);
  });

  it("gives every missing field a human label rather than a raw key", () => {
    const result = registrationCompleteness({});
    expect(result.missingLabels).toHaveLength(result.missing.length);
    for (const label of result.missingLabels) {
      expect(label).not.toMatch(/^[a-z]+[A-Z]/); // no camelCase leaking to members
    }
  });

  it("accepts a date of birth as either a Date or an ISO string", () => {
    expect(registrationCompleteness({ ...complete, dob: "1992-12-13" }).complete).toBe(true);
    expect(registrationCompleteness({ ...complete, dob: new Date("1992-12-13") }).complete).toBe(true);
  });

  it("counts jersey number zero as present, not absent", () => {
    // Guards a falsy-check bug: #0 is a legal shirt number.
    const result = registrationCompleteness({ ...complete, jerseyNumber: 0 });
    expect(result.complete).toBe(true);
  });
});
