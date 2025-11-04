# Timezone Changes - Eastern Time (ET) Implementation

## Summary

Fixed the timezone issue where all generated events and tasks were scheduled 5 hours ahead (UTC) instead of being scheduled in Eastern Time (ET). The application now uses America/New_York timezone for all date and time operations.

## Changes Made

### 1. Created Timezone Utility Module
**File:** [`src/utils/timezone.ts`](src/utils/timezone.ts)

A comprehensive utility module that provides ET-aware date/time operations:

- `getCurrentETDate()` - Get current date/time in ET (replaces `new Date()`)
- `getETHours()`, `getETMinutes()`, `getETSeconds()` - Get time components in ET
- `getETFullYear()`, `getETMonth()`, `getETDate()`, `getETDay()` - Get date components in ET
- `createETDate()` - Create a date with specific values in ET timezone
- `setETHours()`, `setETDate()` - Set date/time components in ET timezone
- `isSameDayET()` - Compare dates for same day in ET
- `startOfDayET()`, `endOfDayET()` - Get start/end of day in ET

### 2. Updated ScheduleGeneratorConcept
**File:** [`src/concepts/ScheduleGenerator/ScheduleGeneratorConcept.ts`](src/concepts/ScheduleGenerator/ScheduleGeneratorConcept.ts)

**Key Changes:**
- Planning horizon now uses ET timezone (lines 726-729)
- Daily working hours (8 AM - 10 PM) are now in ET (lines 737-739)
- Event scheduling uses ET for day-of-week calculations (line 770)
- Event time slots are created in ET timezone (lines 778-791)
- Current time checks use ET (lines 796, 843)
- All date comparisons use `isSameDayET()` (line 148)

**Impact:** All scheduled events and tasks will now be created at the correct ET times, not 5 hours ahead.

### 3. Updated MessagingConcept
**File:** [`src/concepts/Messaging/MessagingConcept.ts`](src/concepts/Messaging/MessagingConcept.ts)

**Changes:**
- Message timestamps now use `getCurrentETDate()` instead of `new Date()` (line 117)

**Impact:** All message sent times will be recorded in ET timezone.

### 4. Updated RequestingConcept
**File:** [`src/concepts/Requesting/RequestingConcept.ts`](src/concepts/Requesting/RequestingConcept.ts)

**Changes:**
- Request creation timestamps now use `getCurrentETDate()` instead of `new Date()` (line 92)

**Impact:** All HTTP request timestamps will be recorded in ET timezone.

### 5. Environment Configuration
**Files:**
- [`.env`](.env) - Added `TZ=America/New_York` (line 6)
- [`.env.template`](.env.template) - Added `TZ=America/New_York` (line 6)

**Impact:** Sets the server's timezone to ET, ensuring consistent timezone handling across the application.

## Testing

A comprehensive test suite has been created:

**File:** [`test-timezone.ts`](test-timezone.ts)

Run the tests with:
```bash
deno run --allow-env test-timezone.ts
```

The tests verify:
- Current ET date/time retrieval
- ET date creation with specific values
- Start and end of day calculations
- ET hour setting
- Same day comparisons
- Date increments
- Working hours (8 AM - 10 PM) in ET

All tests pass successfully.

## How It Works

### The Problem
When deployed in a UTC environment, the server treats all `new Date()` calls and date operations (like `getHours()`, `setHours()`) as UTC time. This caused:
- Events scheduled for 9 AM ET to appear at 9 AM UTC (2 PM ET in summer, 1 PM ET in winter)
- Tasks with deadlines at 5 PM ET to appear at 10 PM ET

### The Solution
1. **Utility Layer**: Created ET-aware date operations that use `toLocaleString()` with `timeZone: 'America/New_York'` to correctly interpret and manipulate dates in ET
2. **Consistent Usage**: Replaced all `new Date()` calls and date manipulation methods with ET-aware equivalents
3. **Environment Configuration**: Set `TZ=America/New_York` in environment variables as an additional safeguard

### Data Storage
- MongoDB continues to store dates in UTC (standard practice)
- Dates are converted to/from ET when read/written
- No migration needed for existing data - the timezone interpretation happens at the application layer

## Deployment Notes

### Backend Deployment
Ensure the `.env` file includes:
```
TZ=America/New_York
```

### Frontend Deployment
If the frontend also needs to display times in ET, you may need to:
1. Ensure the frontend uses the same timezone utilities or
2. Pass timezone information from the backend or
3. Use browser's `toLocaleString()` with `timeZone: 'America/New_York'`

## Verification

After deploying these changes:

1. **Create a new event** for "today at 3:00 PM" - it should be scheduled at 3:00 PM ET, not 8:00 PM ET
2. **Create a task** with deadline "today at 5:00 PM" - it should be due at 5:00 PM ET, not 10:00 PM ET
3. **Check generated schedule** - working hours should be 8:00 AM - 10:00 PM ET, not 1:00 PM - 3:00 AM ET

## Files Modified

- `src/utils/timezone.ts` (new file)
- `src/concepts/ScheduleGenerator/ScheduleGeneratorConcept.ts`
- `src/concepts/Messaging/MessagingConcept.ts`
- `src/concepts/Requesting/RequestingConcept.ts`
- `.env`
- `.env.template`
- `test-timezone.ts` (new file, for testing)
- `TIMEZONE_CHANGES.md` (this file)

## Notes

- The `America/New_York` timezone automatically handles EST (UTC-5) and EDT (UTC-4) transitions
- All existing data in MongoDB will be interpreted correctly without migration
- The 5-hour offset issue is completely resolved
