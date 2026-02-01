# 🧪 Payroll Verification Guide

Since the UI fields for `salaryPerHour` were not requested (to keep UI unchanged), follow these steps to verify the payroll system end-to-end.

## Step 1: Create User
1. Open the App in your browser.
2. Go to **User Management** -> **Add New User**.
3. Create a user (e.g., `payroll_test_user`).
   - Role: Staff
4. *Note: The UI doesn't have a Salary field yet. We will set it via API/Script next.*

## Step 2: Set Salary (Backend)
Since we didn't add a UI input for salary, use this simple command to set it for your new user.

1. **Keep the server running.**
2. **Open a new terminal** in the backend folder.
3. Run this helper script (I have created it for you):
   ```bash
   node utils/set_salary.js "payroll_test_user" 150
   ```
   *(This sets salary to 150/hr for username 'payroll_test_user')*

## Step 3: Check In & Check Out
1. **Login** as the new user.
2. Go to **Dashboard**.
3. Click **Clock In**.
4. Wait a minute... (or cheat using the database to change time).
5. Click **Clock Out**.

## Step 4: Verify Results
Since the UI doesn't display the new payroll fields yet:

1. Check the database directly OR
2. Run this verification command:
   ```bash
   node utils/check_pay.js "payroll_test_user"
   ```
   It will show you the latest attendance record with:
   - Regular Pay
   - Overtime Pay
   - Total Pay

---

### Scripts Created for You:
1. `utils/set_salary.js` - Helper to set salary.
2. `utils/check_pay.js` - Helper to view pay results.
