const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
const User = require('./models/User');
const attendanceController = require('./controllers/attendanceController');
require('dotenv').config();

// MOCKING EXPRESS
const mockReq = (user, body = {}) => ({
    user: user,
    body: body,
    params: {},
    query: {}
});

const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    return res;
};

// CONFIG
process.env.ENABLE_PAYROLL = 'true';
process.env.ENABLE_TIME_SIMULATION = 'true';

const runQA = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--------------------------------------------------');
        console.log('PAYROLL QA VALIDATION SUITE');
        console.log('--------------------------------------------------');

        // CLEANUP
        await Attendance.deleteMany({ isTest: true });
        await User.deleteMany({ username: 'qa_user' });

        // SETUP USER
        const user = new User({
            username: 'qa_user',
            email: 'qa@test.com',
            password: 'password',
            fullName: 'QA Tester',
            role: 'staff',
            salaryPerHour: 100 // FIXED SALARY AS PER REQ
        });
        await user.save();
        console.log(`User Created: ${user.username} (Salary: $${user.salaryPerHour}/hr)`);

        const tests = [
            {
                id: 1,
                name: 'Normal Day (No OT)',
                checkIn: '2026-06-01T08:00:00Z',
                checkOut: '2026-06-01T18:00:00Z',
                expected: { hours: 10, totalPay: 1000 }
            },
            {
                id: 2,
                name: 'Evening OT (Slot 1)',
                checkIn: '2026-06-02T08:00:00Z',
                checkOut: '2026-06-02T20:00:00Z',
                expected: { hours: 12, totalPay: 1250 }
            },
            {
                id: 3,
                name: 'Morning OT (Slot 3)',
                checkIn: '2026-06-03T06:00:00Z',
                checkOut: '2026-06-03T18:00:00Z',
                expected: { hours: 12, totalPay: 1250 }
            },
            {
                id: 4,
                name: 'Mixed OT (Evening + Night)',
                checkIn: '2026-06-04T08:00:00Z',
                checkOut: '2026-06-05T02:00:00Z', // 18-02 = 8h OT (4h@1.25, 4h@1.5)
                expected: { hours: 18, totalPay: 2100 }
            },
            {
                id: 5,
                name: 'Full Slot Coverage',
                checkIn: '2026-06-05T08:00:00Z',
                checkOut: '2026-06-06T06:00:00Z', // 22h total. 10h Reg. 12h OT.
                expected: { hours: 22, totalPay: 2650 }
            },
            {
                id: 6,
                name: 'Less Than 10 Hours',
                checkIn: '2026-06-07T08:00:00Z',
                checkOut: '2026-06-07T16:00:00Z',
                expected: { hours: 8, totalPay: 800 }
            }
        ];

        for (const t of tests) {
            console.log(`\n### TEST ${t.id} – ${t.name}`);

            // 1. Manually Check In (Simulate DB Record)
            const dateStr = t.checkIn.split('T')[0];
            const attendance = new Attendance({
                userId: user._id,
                role: user.role,
                date: dateStr,
                checkIn: new Date(t.checkIn),
                isTest: true
            });
            await attendance.save();

            // 2. Perform Checkout via Controller
            const req = mockReq(user, { testCheckOutTime: t.checkOut });
            const res = mockRes();
            await attendanceController.checkOut(req, res);

            // 3. Verify
            const result = res.data?.attendance;
            if (!result) {
                console.log('🔴 FAILURE: No response from controller');
                continue;
            }

            console.log(`Checked In: ${new Date(result.checkIn).toISOString()}`);
            console.log(`Checked Out: ${new Date(result.checkOut).toISOString()}`);
            console.log(`Total Hours: ${result.totalHours}`);
            console.log(`Regular Hours: ${result.regularHours}`);
            console.log(`Overtime Hours: ${result.overtimeHours}`);
            console.log(`Regular Pay: ${result.dailyRegularPay}`);
            console.log(`Overtime Pay: ${result.dailyOvertimePay}`);
            console.log(`Total Pay: ${result.dailyTotalPay}`);

            const payMatch = result.dailyTotalPay === t.expected.totalPay;
            const hourMatch = result.totalHours === t.expected.hours;

            if (payMatch && hourMatch) {
                console.log(`✅ PASS`);
            } else {
                console.log(`❌ FAIL`);
                console.log(`   Exp Pay: ${t.expected.totalPay}, Got: ${result.dailyTotalPay}`);
                console.log(`   Exp Hrs: ${t.expected.hours}, Got: ${result.totalHours}`);
            }
        }

        console.log('\n### TEST 7 – Feature Flag OFF SAFETY');
        process.env.ENABLE_TIME_SIMULATION = 'false';
        process.env.ENABLE_PAYROLL = 'false';

        // Create Record
        const t7CheckIn = new Date();
        const t7Rec = new Attendance({
            userId: user._id,
            role: user.role,
            date: t7CheckIn.toISOString().split('T')[0],
            checkIn: t7CheckIn,
            isTest: true
        });
        await t7Rec.save();

        // Attempt CheckOut with Simulation (Should Fail to Simulate)
        // Checks out at "Now"
        const req7 = mockReq(user, { testCheckOutTime: '2026-01-01T00:00:00Z' }); // Bogus old date
        const res7 = mockRes();
        await attendanceController.checkOut(req7, res7);

        const res7Data = res7.data?.attendance;
        if (res7Data) {
            const checkOutTime = new Date(res7Data.checkOut);
            const now = new Date();
            const diff = Math.abs(now - checkOutTime);

            if (diff < 5000) { // Should be close to NOW, not 2026-01-01
                console.log('✅ PASS: Time Simulation ignored (Safety check)');
            } else {
                console.log('❌ FAIL: Time Simulation was applied despite flag OFF!');
            }

            if (res7Data.dailyTotalPay === 0 || res7Data.dailyTotalPay === undefined) {
                console.log('✅ PASS: Payroll ignored (Flag OFF)');
            } else {
                console.log('❌ FAIL: Payroll calculated despite flag OFF!');
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await Attendance.deleteMany({ isTest: true });
        await User.deleteMany({ username: 'qa_user' });
        await mongoose.disconnect();
    }
};

runQA();
