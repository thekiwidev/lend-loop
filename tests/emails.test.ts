import { describe, expect, it } from "vitest";
import { escapeHtml, overdueEmail, readableDate, requestEmail, type RequestEmailInput } from "../convex/lib/emails";

const base: RequestEmailInput = {
  status: "pending",
  recipientRole: "owner",
  recipientName: "Adedotun Gabriel",
  otherPartyName: "Chidi Okafor",
  toolName: "Circular saw",
  startDate: "2026-12-01",
  endDate: "2026-12-03",
  appUrl: "http://localhost:3000",
};

describe("readableDate", () => {
  it("spells out weekday, month and ordinal day", () => {
    expect(readableDate("2026-12-01")).toBe("Tuesday, December 1st");
    expect(readableDate("2026-12-02")).toBe("Wednesday, December 2nd");
    expect(readableDate("2026-12-03")).toBe("Thursday, December 3rd");
    expect(readableDate("2026-05-15")).toBe("Friday, May 15th");
  });

  it("uses th for 11, 12, 13 and their twenties and thirties correctly", () => {
    expect(readableDate("2026-01-11")).toMatch(/11th$/);
    expect(readableDate("2026-01-12")).toMatch(/12th$/);
    expect(readableDate("2026-01-13")).toMatch(/13th$/);
    expect(readableDate("2026-01-21")).toMatch(/21st$/);
    expect(readableDate("2026-01-22")).toMatch(/22nd$/);
    expect(readableDate("2026-01-23")).toMatch(/23rd$/);
    expect(readableDate("2026-01-31")).toMatch(/31st$/);
  });
});

describe("requestEmail", () => {
  it("bolds the facts, words the dates and links text instead of a raw URL", () => {
    const email = requestEmail(base);
    expect(email.subject).toBe("Chidi Okafor wants to borrow your circular saw");
    expect(email.html).toContain("<strong>Chidi Okafor</strong> wants to borrow your <strong>circular saw</strong>");
    expect(email.html).toContain("from <strong>Tuesday, December 1st</strong> to <strong>Thursday, December 3rd</strong>.");
    expect(email.html).toContain('<a href="http://localhost:3000/app/incoming">Open your incoming requests</a>');
    expect(email.html).not.toContain("2026-12-01");
    expect(email.text).toContain("Hi Adedotun,");
    expect(email.text).toContain("Open your incoming requests: http://localhost:3000/app/incoming");
  });

  it("sends borrowers to their own requests", () => {
    const email = requestEmail({ ...base, status: "approved", recipientRole: "borrower" });
    expect(email.html).toContain('href="http://localhost:3000/app/requests"');
  });

  it("has copy for every status and role", () => {
    for (const status of ["pending", "approved", "declined", "cancelled", "returned"] as const) {
      for (const recipientRole of ["owner", "borrower"] as const) {
        const email = requestEmail({ ...base, status, recipientRole });
        expect(email.subject.length).toBeGreaterThan(0);
        expect(email.html).toContain("Tuesday, December 1st");
      }
    }
  });

  it("escapes names so a neighbour cannot inject HTML", () => {
    const email = requestEmail({ ...base, otherPartyName: '<img src=x onerror="x">' });
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;img src=x onerror=&quot;x&quot;&gt;");
  });
});

describe("overdueEmail", () => {
  it("words the due date and links to the requests page", () => {
    const email = overdueEmail({ borrowerName: "Amaka Obi", toolName: "Pressure washer", endDate: "2026-11-18", appUrl: "https://lendloop.example" });
    expect(email.subject).toBe("Reminder: the pressure washer is overdue");
    expect(email.html).toContain("was due back on <strong>Wednesday, November 18th</strong>.");
    expect(email.html).toContain('<a href="https://lendloop.example/app/requests">Open your requests</a>');
  });
});

describe("escapeHtml", () => {
  it("escapes the five special characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
