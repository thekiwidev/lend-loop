import type { StoredLoanStatus } from "./loanRules";

// Email copy lives here, not in the n8n expressions, so it is typed, escaped and tested.
// n8n only sends what it is given. Every email is a plain-text body plus a light HTML twin:
// default font, bold for the key facts, links on words instead of raw URLs.

export type Email = { subject: string; text: string; html: string };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function ordinal(day: number): string {
  const teen = day % 100 >= 11 && day % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
  return `${day}${suffix}`;
}

/** "2026-12-01" as "Tuesday, December 1st". */
export function readableDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${MONTHS[m - 1]} ${ordinal(d)}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SIGN_OFF = "LendLoop, your street's shared shed.";

/**
 * Builds both bodies from one list of parts: plain strings, bold facts and links.
 * Text shows the link's URL after its label; HTML wraps the label.
 */
type Part = string | { bold: string } | { link: string; href: string };
type Paragraph = Part[];

function render(subject: string, paragraphs: Paragraph[]): Email {
  const asText = (p: Part) => (typeof p === "string" ? p : "bold" in p ? p.bold : `${p.link}: ${p.href}`);
  const asHtml = (p: Part) =>
    typeof p === "string"
      ? escapeHtml(p)
      : "bold" in p
        ? `<strong>${escapeHtml(p.bold)}</strong>`
        : `<a href="${escapeHtml(p.href)}">${escapeHtml(p.link)}</a>`;
  const all = [...paragraphs, [SIGN_OFF]];
  return {
    subject,
    text: all.map((p) => p.map(asText).join("")).join("\n\n"),
    html: all.map((p) => `<p>${p.map(asHtml).join("")}</p>`).join("\n"),
  };
}

const firstName = (name: string) => name.split(" ")[0] || name;

export type RequestEmailInput = {
  status: StoredLoanStatus;
  recipientRole: "owner" | "borrower";
  recipientName: string;
  otherPartyName: string;
  toolName: string;
  startDate: string;
  endDate: string;
  appUrl: string;
};

/** One email per loan state change, worded for whoever receives it. */
export function requestEmail(input: RequestEmailInput): Email {
  const tool = input.toolName.toLowerCase();
  const other = input.otherPartyName;
  const dates: Part[] = [
    " from ",
    { bold: readableDate(input.startDate) },
    " to ",
    { bold: readableDate(input.endDate) },
    ".",
  ];
  const isOwner = input.recipientRole === "owner";
  const link: Part = isOwner
    ? { link: "Open your incoming requests", href: `${input.appUrl}/app/incoming` }
    : { link: "Open your requests", href: `${input.appUrl}/app/requests` };

  const copy: Record<StoredLoanStatus, { subject: string; lead: Part[] }> = {
    pending: {
      subject: `${other} wants to borrow your ${tool}`,
      lead: [{ bold: other }, " wants to borrow your ", { bold: tool }],
    },
    approved: {
      subject: `${other} approved your request for the ${tool}`,
      lead: [{ bold: other }, " approved your request for the ", { bold: tool }],
    },
    declined: {
      subject: `${other} can't lend the ${tool} this time`,
      lead: [{ bold: other }, " can't lend the ", { bold: tool }, " this time. You asked for it"],
    },
    cancelled: isOwner
      ? {
          subject: `${other} cancelled their request for your ${tool}`,
          lead: [{ bold: other }, " cancelled their request for your ", { bold: tool }],
        }
      : {
          subject: `The ${tool} is no longer listed`,
          lead: ["The ", { bold: tool }, " is no longer listed, so your request was cancelled. You asked for it"],
        },
    returned: {
      subject: `Thanks for returning the ${tool}`,
      lead: [{ bold: other }, " marked the ", { bold: tool }, " as returned. You had it"],
    },
  };
  const { subject, lead } = copy[input.status];
  return render(subject, [[`Hi ${firstName(input.recipientName)},`], [...lead, ...dates], [link]]);
}

export type OverdueEmailInput = { borrowerName: string; toolName: string; endDate: string; appUrl: string };

export function overdueEmail(input: OverdueEmailInput): Email {
  const tool = input.toolName.toLowerCase();
  return render(`Reminder: the ${tool} is overdue`, [
    [`Hi ${firstName(input.borrowerName)},`],
    ["The ", { bold: tool }, " was due back on ", { bold: readableDate(input.endDate) }, "."],
    ["Please return it, or message the owner if you need it for longer."],
    [{ link: "Open your requests", href: `${input.appUrl}/app/requests` }],
  ]);
}
