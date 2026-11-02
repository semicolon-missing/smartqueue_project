export const TIERS = {
  GRAB_AND_GO: "Grab & go",
  QUICK_COOK: "Quick cook",
  STANDARD_PREP: "Made fresh",
};

export const STATUS = {
  QUEUED: "Queued",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready",
  COMPLETED: "Collected",
  CANCELLED: "Cancelled",
};

export const rupees = (value) => `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const clock = (value) =>
  new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export const day = (value) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function ordinal(n) {
  const suffix = { one: "st", two: "nd", few: "rd", other: "th" }[new Intl.PluralRules("en", { type: "ordinal" }).select(n)];
  return `${n}${suffix}`;
}

export function pickupSlots(earliestMinutes) {
  const earliest = new Date(Date.now() + earliestMinutes * 60000);
  earliest.setMinutes(Math.ceil(earliest.getMinutes() / 5) * 5, 0, 0);

  const nextBreak = new Date(earliest);
  nextBreak.setMinutes(50);
  if (nextBreak <= earliest) nextBreak.setHours(nextBreak.getHours() + 1);

  const breaks = [0, 1, 2].map((hours) => new Date(nextBreak.getTime() + hours * 3600000));
  return [
    { label: "Earliest", time: earliest },
    { label: "Next break", time: breaks[0] },
    { label: "Later break", time: breaks[1] },
    { label: "Later break", time: breaks[2] },
  ];
}
