# Dual Approval Kanban System - Test Plan

## Overview

This test plan outlines the scenarios to test the dual approval Kanban system where both Advisors and Company Admins need to independently approve applications before they can advance to "Por Dispersar" status.

## Test Scenarios

### Basic Flow Testing

1. **Advisor Board Visibility**
   - Log in as an Advisor
   - Verify that you see the Advisor-specific Kanban board
   - Confirm the approval indicators show the advisor approval highlighted

2. **Company Admin Board Visibility**
   - Log in as a Company Admin
   - Verify that you see the Company-specific Kanban board  
   - Confirm the approval indicators show the company approval highlighted

3. **Admin Global View**
   - Log in as an Admin
   - Verify that you see the global Kanban board with all applications
   - Confirm the approval indicators show both approval statuses

### Status Transition Testing

4. **Advisor Application Approval Flow**
   - Log in as an Advisor
   - Move an application from "New" to "In Review"
   - Move the application from "In Review" to "Approved"
   - Verify that only the `advisor_status` is updated in the database
   - Verify that the advisor approval indicator shows as approved

5. **Company Application Approval Flow**
   - Log in as a Company Admin
   - Move an application from "New" to "In Review"
   - Move the application from "In Review" to "Approved"
   - Verify that only the `company_status` is updated in the database
   - Verify that the company approval indicator shows as approved

6. **Dual Approval Completion**
   - Set up an application approved by an Advisor but not by Company
   - Log in as a Company Admin and approve the application
   - Verify that:
     - The application's `global_status` is automatically updated to "Por Dispersar"
     - In the global view, the application appears in the "Por Dispersar" column
     - Both approval indicators show as approved

### Edge Cases 

7. **Approval Revocation**
   - Have an application approved by both parties
   - Log in as an Advisor
   - Move the application back from "Approved" to "In Review"
   - Verify that:
     - The `advisor_status` changes to "In Review"
     - The advisor approval status indicator changes to "pending"
     - The application is removed from "Por Dispersar" status in the global view

8. **Parallel Approval Operations**
   - Have an application in "In Review" status for both parties
   - Simultaneously (or nearly so) have both the Advisor and Company Admin approve it
   - Verify that the application correctly moves to "Por Dispersar" in the global view

9. **Status Constraint Enforcement**
   - Log in as an Advisor
   - Try to move an application directly from "New" to "Approved" (bypassing "In Review")
   - Verify that the operation is blocked and an appropriate error message is shown

10. **Permission Enforcement**
    - Verify that Advisors cannot modify the Company status
    - Verify that Company Admins cannot modify the Advisor status
    - Verify that regular users cannot modify either status

## Test Data Requirements

1. Create a set of test applications in various states:
   - New applications
   - Applications in "In Review" for Advisor only
   - Applications in "In Review" for Company only
   - Applications in "In Review" for both
   - Applications approved by Advisor only
   - Applications approved by Company only
   - Applications approved by both (in "Por Dispersar")
   - Completed applications

## Expected Results

- Each user type (Advisor, Company Admin, Admin) should see the appropriate Kanban board
- Status transitions should obey the rules for each user type
- When both parties approve, the application should automatically move to "Por Dispersar"
- If either party revokes approval, the application should be removed from "Por Dispersar"
- Appropriate error messages should be displayed for invalid operations

## Reporting

For each test scenario, document:
1. The test steps followed
2. The actual behavior observed
3. Any discrepancies between expected and actual behavior
4. Screenshots of the UI at key points
5. Any error messages encountered 