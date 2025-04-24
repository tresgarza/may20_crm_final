# Kanban Dual Approval System Checklist

## Conceptual Understanding

The dual approval Kanban system works as follows:

1. There are two separate Kanban boards:
   - **Advisor Kanban**: Shows applications with status based on `advisor_status` field
   - **Company Admin Kanban**: Shows applications with status based on `company_status` field

2. Each board operates independently for the first three columns:
   - **New** (Nuevo)
   - **In Review** (En Revisión)
   - **Approved** (Aprobado)

3. When an Advisor moves a card to "Approved" on their board, it only changes the `advisor_status` field in the database, not the company's view.

4. When a Company Admin moves a card to "Approved" on their board, it only changes the `company_status` field in the database, not the advisor's view.

5. Only when BOTH the Advisor and Company Admin have independently approved an application (i.e., both `advisor_status` and `company_status` are "approved"), the application becomes eligible to move to "Por Dispersar."

## Implementation Tasks

### Database & Data Model
- [x] Ensure the applications table has separate fields for tracking different statuses:
  - `status` (for overall/global status)
  - `advisor_status` (for advisor's view) 
  - `company_status` (for company admin's view)
  - `global_status` (for coordinated status when both approve)

### Service Layer
- [x] Update the `updateApplicationStatusField` function to handle proper status transitions
- [x] Ensure status updates only modify the specific status field based on user role
- [x] Implement the logic to automatically update `global_status` to "por_dispersar" when both parties approve
- [x] **CRITICAL FIX**: Remove code that updates the main status field when making role-specific changes

### UI Components
- [x] Modify KanbanBoard to properly use the statusField prop
- [x] Update the component to show appropriate approval indicators
- [x] Ensure drag-and-drop operations only affect the correct status field
- [x] Apply proper validation rules for status transitions
- [x] Make error messages clear about the dual approval requirements
- [x] **CRITICAL FIX**: Update getApplicationsByStatus to filter by the specific status field

### User Roles and Views
- [x] Create view for Advisor that passes 'advisor_status' to KanbanBoard
- [x] Create view for Company Admin that passes 'company_status' to KanbanBoard
- [x] Add appropriate filters based on user permissions

### UI Enhancements
- [x] Enhance approval indicators to be more visible and informative
- [x] Add clear text status ("Aprobado"/"Pendiente") for each role
- [x] Add special indicator when both parties have approved
- [x] Highlight the current user's role in the indicators

### Testing
- [ ] Test Advisor approval flow independently
- [ ] Test Company Admin approval flow independently
- [ ] Verify both approvals correctly trigger advancement to "Por Dispersar"
- [ ] Test edge cases (e.g., one party rejects, both approve but one later changes mind)
- [x] Create comprehensive test plan (KANBAN_DUAL_APPROVAL_TEST.md)

## Implementation Summary

The dual Kanban approval system has been successfully implemented with the following key features:

1. **Independent Status Tracking**: Advisors and Company Admins each have their own status tracking in the database with dedicated fields (`advisor_status` and `company_status`).

2. **Role-Based Views**: The application automatically detects the user's role and shows the appropriate Kanban board:
   - Advisors see the KanbanBoardAdvisor component that tracks and modifies only the `advisor_status`
   - Company Admins see the KanbanBoardCompany component that tracks and modifies only the `company_status`
   - Administrators see the global view that can manage the overall process

3. **Visual Approval Indicators**: Each card shows the approval status of both parties with enhanced visual indicators, making it clear who has approved an application.

4. **Automated Status Advancement**: When both an Advisor and Company Admin approve an application, the system automatically updates the `global_status` to "Por Dispersar".

5. **Validation Rules**: Each board has its own set of validation rules to ensure proper workflow, preventing invalid status transitions based on the role.

## Next Steps

The system is ready for user testing. The following should be tested thoroughly:

1. Test that Advisors can only modify their own approval status.
2. Test that Company Admins can only modify their own approval status.
3. Verify that when both approve, the application correctly moves to "Por Dispersar" in the global view.
4. Confirm that if one party revokes their approval, the application is correctly handled. 