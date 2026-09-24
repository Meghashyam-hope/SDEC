import { describe, expect, it } from "vitest";
import { voterCsvRowSchema } from "./voters";

describe("voterCsvRowSchema", () => {
  it("accepts a valid row and normalizes casing", () => {
    const result = voterCsvRowSchema.safeParse({
      roll_number: "cse1c099",
      full_name: "Test Import One",
      email: "Test-Import-1@sdec.test",
      phone: "",
      department: "cse",
      year: "1",
      section: "c",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        roll_number: "CSE1C099",
        full_name: "Test Import One",
        email: "test-import-1@sdec.test",
        phone: null,
        department: "CSE",
        year: 1,
        section: "C",
      });
    }
  });

  it("rejects a row missing required fields", () => {
    const result = voterCsvRowSchema.safeParse({
      roll_number: "BADROW",
      full_name: "",
      email: "not-an-email",
      phone: "",
      department: "CSE",
      year: "1",
      section: "C",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range year", () => {
    const result = voterCsvRowSchema.safeParse({
      roll_number: "CSE9Z999",
      full_name: "Someone",
      email: "someone@sdec.test",
      phone: "",
      department: "CSE",
      year: "9",
      section: "",
    });
    expect(result.success).toBe(false);
  });

  it("keeps optional phone/section null when blank", () => {
    const result = voterCsvRowSchema.safeParse({
      roll_number: "CSE1C101",
      full_name: "No Section",
      email: "no-section@sdec.test",
      phone: "",
      department: "CSE",
      year: "1",
      section: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeNull();
      expect(result.data.section).toBeNull();
    }
  });
});
