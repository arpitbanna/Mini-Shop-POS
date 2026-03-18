function toBusinessDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getBusinessDate(shiftEndHour = 5, referenceDate = new Date()): string {
  const local = new Date(referenceDate);

  if (local.getHours() < shiftEndHour) {
    local.setDate(local.getDate() - 1);
  }

  return toBusinessDateString(local);
}

export function getBusinessDateTime(shiftEndHour = 5, referenceDate = new Date()) {
  return {
    businessDate: getBusinessDate(shiftEndHour, referenceDate),
    createdAt: referenceDate.toISOString(),
  };
}

export function getBusinessDateRange(days: number, shiftEndHour = 5, referenceDate = new Date()): string[] {
  return [...Array(days)]
    .map((_, index) => {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - index);
      return getBusinessDate(shiftEndHour, d);
    })
    .reverse();
}