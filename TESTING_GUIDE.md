# 🔔 In-App Notification Testing Guide

This guide will help you verify that the "Red Dot" and Toast popups work in real-time.

## Prerequisites
1.  **Server Running**: Ensure `node server.js` is running in backend.
2.  **Frontend Running**: Ensure `npm run dev` is running in frontend.
3.  **Logged In**: You must be logged in to the dashboard.

## Test Cases

### 1. Manual Task Creation (User Interface)
This is the **best way** to test the system naturally.

1.  **Login**: Ensure you are logged in (e.g., as Admin).
2.  **Go to Projects**: Click "Projects" in the sidebar.
3.  **Select a Project**: Click on any active project.
4.  **Add Task**: Click the "+ Add Task" button.
5.  **Assign to Yourself**: In the "Assign To" field, select **YOUR OWN NAME**. 
    *   *(This is the trick to see the notification instantly on your own screen)*.
6.  **Click Create**: Submit the form.
7.  **Watch the Bell**: 
    *   🚨 The Red Dot should appear **instantly**.
    *   💬 A popup "New Notification: You have been assigned..." will appear.

### 2. Verification Script (Technical)
Use this if you want to test the backend connection only.
1.  Refresh the page.
2.  Wait 30 seconds.
3.  Any notifications missed while offline should appear automatically.
