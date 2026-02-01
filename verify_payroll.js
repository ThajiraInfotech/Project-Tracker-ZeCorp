const calculatePayroll = require('./backend/utils/payrollCalculator');

// Mock User with 100/hr
const salaryPerHour = 100;

function runTest(name, checkInStr, checkOutStr, expected) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   In: ${checkInStr}, Out: ${checkOutStr}`);

    const checkIn = new Date(checkInStr);
    const checkOut = new Date(checkOutStr);

    const result = calculatePayroll({ checkIn, checkOut, salaryPerHour });

    console.log('   Result:', JSON.stringify(result));

    let pass = true;
    if (expected) {
        if (Math.abs(result.totalPay - expected.totalPay) > 0.5) {
            console.log(`   ❌ Fail. Expected TotalPay ~${expected.totalPay}, Got ${result.totalPay}`);
            pass = false;
        }
        if (result.overtimeHours !== expected.overtimeHours) {
            console.log(`   ❌ Fail. Expected OT Hours ${expected.overtimeHours}, Got ${result.overtimeHours}`);
            pass = false;
        }
    }

    if (pass) console.log('   ✅ Pass');
}

// 1. Normal Day 8am - 6pm (10h) -> No OT
runTest('Normal Day (10h)',
    '2026-06-01T08:00:00',
    '2026-06-01T18:00:00',
    { totalPay: 1000, overtimeHours: 0 }
);

// 2. Long Day 8am - 8pm (12h) -> 2h OT.
// OT: 6pm-8pm (18:00-20:00). Slot 18-22 is 1.25x.
// Reg: 10h * 100 = 1000.
// OT: 2h * 1.25 * 100 = 250.
// Total: 1250.
runTest('Long Day (12h, Evening OT)',
    '2026-06-01T08:00:00',
    '2026-06-01T20:00:00',
    { totalPay: 1250, overtimeHours: 2 }
);

// 3. Night Shift Crossing Midnight
// 10pm (22:00) to 10am (10:00 next day). 12h.
// Reg: 22:00 - 08:00 (10h).
// OT: 08:00 - 10:00 (2h).
// OT Slot: 08:00 is Day time (1.0x).
// Reg Pay: 1000.
// OT Pay: 2 * 1.0 * 100 = 200.
// Total: 1200.
runTest('Night Shift (12h, Morning OT)',
    '2026-06-01T22:00:00',
    '2026-06-02T10:00:00',
    { totalPay: 1200, overtimeHours: 2 }
);

// 4. Heavy Night OT
// Start 4pm (16:00). End 4am (04:00). 12h.
// Reg: 16:00 - 02:00 (10h).
// OT: 02:00 - 04:00 (2h).
// OT Time: 2am-4am.
// Slot 22-04 is 1.5x.
// Reg: 1000.
// OT: 2 * 1.5 * 100 = 300.
// Total: 1300.
runTest('Late Start (12h, Night OT)',
    '2026-06-01T16:00:00',
    '2026-06-02T04:00:00',
    { totalPay: 1300, overtimeHours: 2 }
);

// 5. Early Start with OT
// Start 6am. End 6pm. 12h.
// Reg: 6am - 4pm (10h).
// OT: 4pm - 6pm (2h).
// OT Time: 16:00-18:00.
// Slot: Day (1.0x).
// Pay: 1200.
runTest('Early Start (12h, Day OT)',
    '2026-06-01T06:00:00',
    '2026-06-01T18:00:00',
    { totalPay: 1200, overtimeHours: 2 }
);
