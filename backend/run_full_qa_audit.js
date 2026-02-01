const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
const User = require('./models/User');
const attendanceController = require('./controllers/attendanceController');
require('dotenv').config();

// FORCE FLAGS
process.env.ENABLE_PAYROLL = 'true';
process.env.ENABLE_TIME_SIMULATION = 'true';

// Mocks
const mockReq = (user, body = {}) => ({
    user: user,
    body: body,
    params: {},
    query: {}
});

const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.data = null;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    return res;
};

const runAudit = async () => {
    console.log('STARTING QA AUDIT...');

    // Connect DB
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }

    // CLEANUP OLD TEST DATA
    await Attendance.deleteMany({ isTest: true });
    await User.deleteMany({ username: 'qa_audit_user' });

    // Helper to create user
    const createTestUser = async (salary) => {
        const user = new User({
            username: 'qa_audit_user',
            email: 'qa_audit@test.com',
            password: 'password',
            fullName: 'QA Audit Tester',
            role: 'staff',
            salaryPerHour: salary
        });
        return await user.save();
    };

    const tests = [
        {
            id: 1,
            name: 'Normal Day (No OT)',
            salary: 100,
            checkIn: '2026-06-01T08:00:00Z',
            checkOut: '2026-06-01T18:00:00Z',
            expected: { totalHours: 10, otHours: 0, totalPay: 1000 }
        },
        {
            id: 2,
            name: 'Early Leave (<10 hrs)',
            salary: 100,
            checkIn: '2026-06-02T08:00:00Z',
            checkOut: '2026-06-02T16:00:00Z',
            expected: { totalHours: 8, otHours: 0, totalPay: 800 }
        },
        {
            id: 3,
            name: 'Evening OT (Slot 1)',
            salary: 100,
            checkIn: '2026-06-03T08:00:00Z',
            checkOut: '2026-06-03T20:00:00Z',
            expected: { totalHours: 12, otHours: 2, totalPay: 1250 }
        },
        {
            id: 4,
            name: 'Morning OT (Slot 3)',
            salary: 100,
            checkIn: '2026-06-04T06:00:00Z',
            checkOut: '2026-06-04T18:00:00Z',
            expected: { totalHours: 12, otHours: 2, totalPay: 1250 }
        },
        {
            id: 5,
            name: 'Mixed OT (Evening + Night)',
            salary: 100,
            checkIn: '2026-06-05T08:00:00Z',
            checkOut: '2026-06-06T02:00:00Z',
            // 08-02 = 18 hours total.
            // 08-18 = 10 Regular
            // 18-22 = 4 OT @1.25
            // 22-02 = 4 OT @1.5
            // Pay: 1000 + 500 + 600 = 2100
            expected: { totalHours: 18, otHours: 8, totalPay: 2100 }
        },
        {
            id: 6,
            name: 'Full Slot Coverage',
            salary: 100,
            checkIn: '2026-06-06T08:00:00Z',
            checkOut: '2026-06-07T06:00:00Z',
            // 08-06 = 22 hours total.
            // 08-18 = 10 Regular
            // 18-22 = 4 OT @1.25 (500)
            // 22-04 = 6 OT @1.5  (900)
            // 04-06 = 2 OT @1.25 (250)
            // Pay: 1000 + 500 + 900 + 250 = 2650
            expected: { totalHours: 22, otHours: 12, totalPay: 2650 }
        },
        {
            id: 7,
            name: 'Salary Dependency Check',
            salary: 75,
            checkIn: '2026-06-08T08:00:00Z',
            checkOut: '2026-06-08T20:00:00Z',
            // 12 hours total. 10 Reg. 2 OT.
            // Reg: 10 * 75 = 750
            // OT:  2 * (75 * 1.25) = 187.5
            // Total: 937.5
            expected: { totalHours: 12, otHours: 2, totalPay: 937.5 }
        },
        {
            id: 8,
            name: 'Overnight Checkout UX',
            salary: 100,
            checkIn: '2026-06-09T20:00:00Z',
            checkOut: '2026-06-10T04:00:00Z',
            // MUST succeed.
            // 20:00 to 04:00 = 8 hours.
            // All < 10 hours limit. So ALL is Regular?
            // "Normal working limit: 10 hours/day"
            // "Overtime applies ONLY if total worked hours > 10"
            // So if total <= 10, it's all Regular Pay?
            // Test 8 prompt expected says: "OT slots: 18–22 2hrs@1.25...". 
            // Wait, prompt GLOBAL RULE: "Overtime applies ONLY if total worked hours > 10".
            // BUT for Test 8, the prompt explicitly lists OT slots in Expected.
            // This is a CONTRADICTION in the prompt.
            // "Overtime applies ONLY if total worked hours > 10" VS Test 8 Expected "OT slots ... 18-22...".
            // However, verify_payroll_full.js and payrollCalculator.js logic:
            // "if (totalHours <= 10) { return { ... overtimeHours: 0 ... } }"
            // I must report what the SYSTEM does vs what prompt Expected says.
            // I will capture the result and report PASS/FAIL based on match.
            // Note: If the system returns Regular for <10h, and prompt expects OT, it is a FAIL in logic or prompt.
            // HOWEVER, Test 8 might be testing "Overnight" specifically.
            // Let's assume the Global Rule is dominant for the current implementation.
            // I will expect what the Prompt says to check for deviation.
            expected: { isTest8: true }
        }
    ];

    let overallPass = true;

    // Run Tests 1-8
    for (const t of tests) {
        // Setup User for this test (salary might change)
        await Attendance.deleteMany({ isTest: true });
        await User.deleteMany({ username: 'qa_audit_user' });
        const user = await createTestUser(t.salary);

        // Check In
        const att = new Attendance({
            userId: user._id,
            role: user.role,
            date: t.checkIn.split('T')[0],
            checkIn: new Date(t.checkIn),
            isTest: true
        });
        await att.save();

        // Check Out
        const req = mockReq(user, { testCheckOutTime: t.checkOut });
        const res = mockRes();
        await attendanceController.checkOut(req, res);

        const result = res.data?.attendance;

        console.log(`\nTest Name: ${t.name}`);
        console.log(`salaryPerHour: ${t.salary}`);
        console.log(`checkIn: ${t.checkIn}`);
        console.log(`checkOut (simulated): ${t.checkOut}`);

        if (!result) {
            console.log('Result: FAIL (No response)');
            overallPass = false;
            continue;
        }

        console.log(`totalHours: ${result.totalHours}`);
        console.log(`regularHours: ${result.regularHours}`);
        console.log(`overtimeHours: ${result.overtimeHours}`);
        console.log(`regularPay: ${result.dailyRegularPay}`);
        console.log(`overtimePay: ${result.dailyOvertimePay}`);
        console.log(`totalPay: ${result.dailyTotalPay}`);

        let passed = false;
        if (t.expected.isTest8) {
            // Special check logic for Test 8 if needed, or manual observation
            // Prompt Expects OT breakdown.
            // If System gives 0 OT, it's a mismatch.
            const hasOT = result.overtimeHours > 0;
            // We'll print details.
            console.log(`OT slot breakdown: (See logs above)`);
            // Determining Pass/Fail based on Prompt Expectations
            // If result.dailyTotalPay > (8 * 100), then it paid OT.
            // 8h regular = 800.
            // 2h@1.25(250) + 6h@1.5(900) = 1150?
            // Prompt says: 18-22 (2h@1.25) -> 250. 22-04 (6h@1.5) -> 900. Total = 1150.
            if (result.dailyTotalPay === 1150) passed = true;
            else {
                // It likely failed because of the "Total > 10" global rule code.
                // We will mark FAIL if it doesn't match expected.
                passed = false;
            }
        } else {
            if (result.dailyTotalPay === t.expected.totalPay && result.totalHours === t.expected.totalHours) {
                passed = true;
            }
        }

        console.log(`Result: ${passed ? 'PASS' : 'FAIL'}`);
        if (!passed) overallPass = false;
    }

    // TEST 9: Feature Flag Safety
    console.log('\nTest Name: Feature Flag Safety');
    process.env.ENABLE_PAYROLL = 'false';
    process.env.ENABLE_TIME_SIMULATION = 'false';

    // Setup
    await Attendance.deleteMany({ isTest: true });
    await User.deleteMany({ username: 'qa_audit_user' });
    const user = await createTestUser(100);

    // Check In Loop
    const t9CheckIn = new Date();
    const att9 = new Attendance({
        userId: user._id,
        role: user.role,
        date: t9CheckIn.toISOString().split('T')[0],
        checkIn: t9CheckIn,
        isTest: true
    });
    await att9.save();

    // Check Out
    // Try to simulate time - should fail and use NOW
    const req9 = mockReq(user, { testCheckOutTime: '2020-01-01T00:00:00Z' });
    const res9 = mockRes();
    await attendanceController.checkOut(req9, res9);

    const res9Data = res9.data?.attendance;
    if (res9Data) {
        const outTime = new Date(res9Data.checkOut);
        const now = new Date();
        const seemsRealTime = Math.abs(outTime - now) < 5000;
        const noPayroll = res9Data.dailyTotalPay === undefined || res9Data.dailyTotalPay === 0;

        console.log(`Time Simulation Ignored: ${seemsRealTime}`);
        console.log(`Payroll Ignored: ${noPayroll}`);

        if (seemsRealTime && noPayroll) {
            console.log('Result: PASS');
        } else {
            console.log('Result: FAIL');
            overallPass = false;
        }
    } else {
        console.log('Result: FAIL (No response)');
        overallPass = false;
    }

    // Summary
    console.log('--------------------------------------------------');
    console.log(overallPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
    console.log('--------------------------------------------------');

    await mongoose.disconnect();
};

runAudit();
