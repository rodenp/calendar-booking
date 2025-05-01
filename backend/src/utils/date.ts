import { format, parse, isValid, addMinutes, subMinutes, isAfter, isBefore, areIntervalsOverlapping, Interval } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime, format as formatTz } from 'date-fns-tz';

// Format date to string
export const formatDate = (date: Date, formatString: string = 'yyyy-MM-dd'): string => {
  return format(date, formatString);
};

// Format date with timezone
export const formatDateTz = (date: Date, timeZone: string, formatString: string = 'yyyy-MM-dd HH:mm:ss'): string => {
  const zonedDate = utcToZonedTime(date, timeZone);
  return formatTz(zonedDate, formatString, { timeZone });
};

// Parse string to date
export const parseDate = (dateString: string, formatString: string = 'yyyy-MM-dd'): Date => {
  const parsedDate = parse(dateString, formatString, new Date());
  if (!isValid(parsedDate)) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return parsedDate;
};

// Convert time string to minutes
export const timeStringToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Convert minutes to time string
export const minutesToTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Convert date and time string to Date object in specific timezone
export const dateTimeStringToDate = (dateString: string, timeString: string, timeZone: string): Date => {
  const dateTimeString = `${dateString}T${timeString}`;
  const zonedDate = zonedTimeToUtc(dateTimeString, timeZone);
  return zonedDate;
};

// Get available time slots
export const getAvailableTimeSlots = (
  date: Date,
  availabilityStart: string,
  availabilityEnd: string,
  timeZone: string,
  duration: number,
  increment: number,
  bufferBefore: number,
  bufferAfter: number,
  existingBookings: Array<{ start: Date; end: Date }> = []
): Array<{ start: Date; end: Date }> => {
  // Convert date to start of day in the specified timezone
  const startOfDay = zonedTimeToUtc(`${formatDate(date)}T00:00:00`, timeZone);
  
  // Convert availability times to minutes
  const availabilityStartMinutes = timeStringToMinutes(availabilityStart);
  const availabilityEndMinutes = timeStringToMinutes(availabilityEnd);
  
  // Calculate start and end of availability in UTC
  const availabilityStartDate = addMinutes(startOfDay, availabilityStartMinutes);
  const availabilityEndDate = addMinutes(startOfDay, availabilityEndMinutes);
  
  // Generate all possible time slots
  const slots: Array<{ start: Date; end: Date }> = [];
  let slotStart = availabilityStartDate;
  
  while (isAfter(availabilityEndDate, addMinutes(slotStart, duration))) {
    const slotEnd = addMinutes(slotStart, duration);
    
    // Add buffer times
    const slotWithBuffer: Interval = {
      start: subMinutes(slotStart, bufferBefore),
      end: addMinutes(slotEnd, bufferAfter)
    };
    
    // Check if slot overlaps with any existing booking
    const hasOverlap = existingBookings.some(booking => 
      areIntervalsOverlapping(
        slotWithBuffer,
        { start: booking.start, end: booking.end }
      )
    );
    
    if (!hasOverlap) {
      slots.push({ start: slotStart, end: slotEnd });
    }
    
    // Move to next slot
    slotStart = addMinutes(slotStart, increment);
  }
  
  return slots;
};

// Check if a time slot is available
export const isTimeSlotAvailable = (
  start: Date,
  end: Date,
  bufferBefore: number,
  bufferAfter: number,
  existingBookings: Array<{ start: Date; end: Date }> = []
): boolean => {
  // Add buffer times
  const slotWithBuffer: Interval = {
    start: subMinutes(start, bufferBefore),
    end: addMinutes(end, bufferAfter)
  };
  
  // Check if slot overlaps with any existing booking
  return !existingBookings.some(booking => 
    areIntervalsOverlapping(
      slotWithBuffer,
      { start: booking.start, end: booking.end }
    )
  );
};

// Get day of week (0-6, where 0 is Sunday)
export const getDayOfWeek = (date: Date): number => {
  return date.getDay();
};

// Check if date is in range
export const isDateInRange = (date: Date, startDate?: Date, endDate?: Date): boolean => {
  if (startDate && isBefore(date, startDate)) {
    return false;
  }
  if (endDate && isAfter(date, endDate)) {
    return false;
  }
  return true;
};