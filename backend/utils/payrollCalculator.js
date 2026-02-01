const calculatePayroll = ({ checkIn, checkOut, salaryPerHour }) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Calculate total hours
    const diffMs = checkOutDate - checkInDate;
    const totalHours = diffMs / (1000 * 60 * 60);

    // If total hours <= 10, everything is regular (Simple Case)
    // NOTE: Even if hours fall in "OT Slots" (e.g. 18-20), if total is say 2 hours, 
    // the user rule "Overtime applies ONLY if total worked hours > 10" implies 
    // these are just Regular hours (paid 1x).
    if (totalHours <= 10) {
        return {
            regularHours: Number(totalHours.toFixed(2)),
            overtimeHours: 0,
            regularPay: Number((totalHours * salaryPerHour).toFixed(2)),
            overtimePay: 0,
            totalPay: Number((totalHours * salaryPerHour).toFixed(2))
        };
    }

    // Slots definition
    const SLOT_MULTIPLIERS = [
        { start: 18, end: 22, mult: 1.25 },
        { start: 22, end: 4, mult: 1.5 }, // Special handling for crossing midnight
        { start: 4, end: 8, mult: 1.25 }
    ];

    const getMultiplier = (hour) => {
        // Simple linear check 0-23
        if (hour >= 18 && hour < 22) return 1.25;
        if (hour >= 22 || hour < 4) return 1.5; // (22-23, 0-3)
        if (hour >= 4 && hour < 8) return 1.25;
        return 1.0;
    };

    // We need to categorize the time into "Segments"
    // We will break down the shift into 1-hour chunks (or partial hours)
    // and tag them.
    let segments = [];
    let current = new Date(checkInDate);

    while (current < checkOutDate) {
        let currentHour = current.getUTCHours();
        let nextBoundary = new Date(current);
        nextBoundary.setUTCHours(currentHour + 1, 0, 0, 0);

        if (nextBoundary > checkOutDate) {
            nextBoundary = checkOutDate;
        }

        // Safety for infinite loop
        if (nextBoundary <= current) {
            nextBoundary = new Date(current.getTime() + (60 * 60 * 1000));
        }

        const duration = (nextBoundary - current) / (1000 * 60 * 60);

        // Is this segment inside the "Normal Window" (08:00 - 18:00)?
        // 08 inclusive to 18 exclusive.
        const isInsideWindow = (currentHour >= 8 && currentHour < 18);

        // Multiplier
        let multiplier = getMultiplier(currentHour);

        segments.push({
            start: new Date(current),
            end: new Date(nextBoundary),
            hours: duration,
            isInsideWindow: isInsideWindow,
            multiplier: multiplier,
            type: 'UNKNOWN'
        });

        current = nextBoundary;
    }

    // Logic: 
    // 1. "Normal Window" hours count towards Regular Limit (10h) FIRST.
    // 2. If we still haven't reached 10h, we fill from the rest (Outside hours).
    // 3. Any hours left over are OT.

    let regularHoursCount = 0;
    const REGULAR_LIMIT = 10;

    // Pass 1: Consume "Inside Window" hours
    for (let seg of segments) {
        if (seg.isInsideWindow) {
            if (regularHoursCount + seg.hours <= REGULAR_LIMIT) {
                seg.type = 'REGULAR';
                regularHoursCount += seg.hours;
            } else {
                // Determine split (partial segment)
                const needed = REGULAR_LIMIT - regularHoursCount;
                if (needed > 0) {
                    // Split this segment? 
                    // Actually, if we are "Inside Window", we are usually contiguous 08-18 (10h).
                    // So we rarely split inside window unless shift > 10h INSIDE window (impossible).
                    // But strictly speaking:
                    seg.type = 'REGULAR'; // Just take it. (It won't overflow 10h because window is 10h)
                    regularHoursCount += seg.hours;
                }
            }
        }
    }

    // Pass 2: Fill remaining Regular Quota from "Outside" hours
    // We process them in chronological order
    for (let seg of segments) {
        if (seg.type === 'UNKNOWN') { // Outside window
            const needed = REGULAR_LIMIT - regularHoursCount;
            if (needed >= seg.hours) {
                seg.type = 'REGULAR';
                regularHoursCount += seg.hours;
            } else if (needed > 0) {
                // Split segment
                const otPart = seg.hours - needed;
                const regPart = needed;

                // We treat the Reg part as Regular
                regularHoursCount += regPart;

                // How to store? Just mark pay.
                // We'll calculate Pay directly.
                seg.type = 'SPLIT';
                seg.regHours = regPart;
                seg.otHours = otPart;
            } else {
                seg.type = 'OT';
            }
        }
    }

    // Calculate Pay
    let regularPay = 0;
    let overtimePay = 0;
    let finalRegularHours = 0;
    let finalOvertimeHours = 0;

    for (let seg of segments) {
        if (seg.type === 'REGULAR') {
            regularPay += seg.hours * salaryPerHour; // Regular is always 1x
            finalRegularHours += seg.hours;
        } else if (seg.type === 'OT') {
            overtimePay += seg.hours * salaryPerHour * seg.multiplier;
            finalOvertimeHours += seg.hours;
        } else if (seg.type === 'SPLIT') {
            regularPay += seg.regHours * salaryPerHour;
            overtimePay += seg.otHours * salaryPerHour * seg.multiplier;
            finalRegularHours += seg.regHours;
            finalOvertimeHours += seg.otHours;
        }
    }

    return {
        regularHours: Number(finalRegularHours.toFixed(2)),
        overtimeHours: Number(finalOvertimeHours.toFixed(2)),
        regularPay: Number(regularPay.toFixed(2)),
        overtimePay: Number(overtimePay.toFixed(2)),
        totalPay: Number((regularPay + overtimePay).toFixed(2))
    };
};

module.exports = calculatePayroll;
