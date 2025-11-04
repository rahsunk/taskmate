/**
 * Timezone utility module for Eastern Time (ET) timezone handling.
 *
 * This module provides utilities to ensure all dates and times in the application
 * are handled in the America/New_York timezone (Eastern Time), which automatically
 * handles EST/EDT transitions.
 *
 * The approach:
 * 1. All dates stored in MongoDB remain in UTC (standard practice)
 * 2. When creating dates from user input or current time, we interpret them as ET
 * 3. When performing date operations (getHours, setHours, etc.), we use ET-aware methods
 */

const ET_TIMEZONE = 'America/New_York';

/**
 * Gets the current date and time in Eastern Time (ET).
 * This should be used instead of `new Date()` when you need the current time.
 *
 * @returns {Date} Current date in ET timezone
 */
export function getCurrentETDate(): Date {
  return new Date();
}

/**
 * Converts any Date object to represent the same moment in ET timezone.
 * This doesn't change the underlying UTC timestamp, but returns a Date object
 * that, when used with ET-aware methods, will display ET values.
 *
 * @param {Date} date - The date to interpret in ET timezone
 * @returns {Date} The same date object (dates are immutable in terms of timezone)
 */
export function toETDate(date: Date): Date {
  return new Date(date);
}

/**
 * Gets the hour (0-23) of the given date in ET timezone.
 * Use this instead of date.getHours() to ensure you get ET hours.
 *
 * @param {Date} date - The date to get hours from
 * @returns {number} Hour in ET timezone (0-23)
 */
export function getETHours(date: Date): number {
  const str = date.toLocaleString('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: ET_TIMEZONE
  });
  return parseInt(str, 10);
}

/**
 * Gets the minutes (0-59) of the given date in ET timezone.
 *
 * @param {Date} date - The date to get minutes from
 * @returns {number} Minutes in ET timezone (0-59)
 */
export function getETMinutes(date: Date): number {
  const str = date.toLocaleString('en-US', {
    minute: '2-digit',
    timeZone: ET_TIMEZONE
  });
  return parseInt(str, 10);
}

/**
 * Gets the seconds (0-59) of the given date in ET timezone.
 *
 * @param {Date} date - The date to get seconds from
 * @returns {number} Seconds in ET timezone (0-59)
 */
export function getETSeconds(date: Date): number {
  const str = date.toLocaleString('en-US', {
    second: '2-digit',
    timeZone: ET_TIMEZONE
  });
  return parseInt(str, 10);
}

/**
 * Gets the year of the given date in ET timezone.
 *
 * @param {Date} date - The date to get year from
 * @returns {number} Year in ET timezone
 */
export function getETFullYear(date: Date): number {
  const str = date.toLocaleString('en-US', {
    year: 'numeric',
    timeZone: ET_TIMEZONE
  });
  return parseInt(str, 10);
}

/**
 * Gets the month (0-11) of the given date in ET timezone.
 *
 * @param {Date} date - The date to get month from
 * @returns {number} Month in ET timezone (0=January, 11=December)
 */
export function getETMonth(date: Date): number {
  const str = date.toLocaleString('en-US', {
    month: '2-digit',
    timeZone: ET_TIMEZONE
  });
  return parseInt(str, 10) - 1; // JavaScript months are 0-indexed
}

/**
 * Gets the day of the month (1-31) of the given date in ET timezone.
 *
 * @param {Date} date - The date to get date from
 * @returns {number} Day of month in ET timezone (1-31)
 */
export function getETDate(date: Date): number {
  const str = date.toLocaleString('en-US', {
    day: '2-digit',
    timeZone: ET_TIMEZONE
  });
  return parseInt(str, 10);
}

/**
 * Gets the day of the week (0-6) of the given date in ET timezone.
 *
 * @param {Date} date - The date to get day of week from
 * @returns {number} Day of week in ET timezone (0=Sunday, 6=Saturday)
 */
export function getETDay(date: Date): number {
  const dateStr = date.toLocaleString('en-US', {
    weekday: 'long',
    timeZone: ET_TIMEZONE
  });
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days.indexOf(dateStr);
}

/**
 * Creates a new Date object with specific date and time in ET timezone.
 * This is the ET-aware equivalent of new Date(year, month, day, hours, minutes, seconds, ms).
 *
 * @param {number} year - Year
 * @param {number} month - Month (0-11, where 0=January)
 * @param {number} day - Day of month (1-31)
 * @param {number} hours - Hours (0-23) in ET timezone
 * @param {number} minutes - Minutes (0-59)
 * @param {number} seconds - Seconds (0-59)
 * @param {number} milliseconds - Milliseconds (0-999)
 * @returns {Date} A new Date object representing the specified time in ET
 */
export function createETDate(
  year: number,
  month: number,
  day: number,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0,
  milliseconds: number = 0
): Date {
  // Format the date string for ET
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');

  // Create an ISO-like string for the ET date/time
  const dateStr = `${year}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:${secondsStr}`;

  // Use a trick: format a reference date in ET, then parse
  // We'll create a date and iteratively adjust it until it matches our target

  // Start with UTC date
  let date = new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));

  // Check what ET time this UTC time represents
  let etHours = getETHours(date);
  let etMinutes = getETMinutes(date);
  let etSeconds = getETSeconds(date);
  let etDate = getETDate(date);
  let etMonth = getETMonth(date);
  let etYear = getETFullYear(date);

  // Calculate the adjustment needed
  const hourDiff = hours - etHours;
  const minuteDiff = minutes - etMinutes;
  const secondDiff = seconds - etSeconds;
  const dateDiff = day - etDate;
  const monthDiff = month - etMonth;
  const yearDiff = year - etYear;

  // Apply adjustment in milliseconds
  const adjustment = (yearDiff * 365 * 24 + monthDiff * 30 * 24 + dateDiff * 24 + hourDiff) * 60 * 60 * 1000 +
                    (minuteDiff * 60 + secondDiff) * 1000;

  return new Date(date.getTime() + adjustment);
}

/**
 * Sets the hours of a date in ET timezone.
 * This creates a new Date object with the specified hours in ET.
 *
 * @param {Date} date - The base date
 * @param {number} hours - Hours to set (0-23) in ET timezone
 * @param {number} minutes - Optional minutes to set
 * @param {number} seconds - Optional seconds to set
 * @param {number} milliseconds - Optional milliseconds to set
 * @returns {Date} A new Date object with the specified time in ET
 */
export function setETHours(
  date: Date,
  hours: number,
  minutes?: number,
  seconds?: number,
  milliseconds?: number
): Date {
  const year = getETFullYear(date);
  const month = getETMonth(date);
  const day = getETDate(date);

  const mins = minutes !== undefined ? minutes : getETMinutes(date);
  const secs = seconds !== undefined ? seconds : getETSeconds(date);
  const ms = milliseconds !== undefined ? milliseconds : date.getMilliseconds();

  return createETDate(year, month, day, hours, mins, secs, ms);
}

/**
 * Sets the date (day of month) in ET timezone.
 *
 * @param {Date} date - The base date
 * @param {number} dayOfMonth - Day of month to set (1-31)
 * @returns {Date} A new Date object with the specified day in ET
 */
export function setETDate(date: Date, dayOfMonth: number): Date {
  const year = getETFullYear(date);
  const month = getETMonth(date);
  const hours = getETHours(date);
  const minutes = getETMinutes(date);
  const seconds = getETSeconds(date);
  const ms = date.getMilliseconds();

  return createETDate(year, month, dayOfMonth, hours, minutes, seconds, ms);
}

/**
 * Checks if two dates fall on the same day in ET timezone.
 *
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if both dates are on the same day in ET
 */
export function isSameDayET(date1: Date, date2: Date): boolean {
  return (
    getETFullYear(date1) === getETFullYear(date2) &&
    getETMonth(date1) === getETMonth(date2) &&
    getETDate(date1) === getETDate(date2)
  );
}

/**
 * Resets the time portion of a date to start of day (00:00:00.000) in ET timezone.
 *
 * @param {Date} date - The date to reset
 * @returns {Date} A new Date object representing the start of the day in ET
 */
export function startOfDayET(date: Date): Date {
  const year = getETFullYear(date);
  const month = getETMonth(date);
  const day = getETDate(date);
  return createETDate(year, month, day, 0, 0, 0, 0);
}

/**
 * Resets the time portion of a date to end of day (23:59:59.999) in ET timezone.
 *
 * @param {Date} date - The date to reset
 * @returns {Date} A new Date object representing the end of the day in ET
 */
export function endOfDayET(date: Date): Date {
  const year = getETFullYear(date);
  const month = getETMonth(date);
  const day = getETDate(date);
  return createETDate(year, month, day, 23, 59, 59, 999);
}
