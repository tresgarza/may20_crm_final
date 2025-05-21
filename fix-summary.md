# Kanban Board Rejection Indicator Fix

## Problem
When a user rejected an application as an advisor, the UI incorrectly showed "Rechazado por Empresa" instead of "Rechazado por Asesor". This was due to missing database columns and issues with how rejection flags were being tracked and displayed.

## Root Causes
1. The `application_history` table was missing the `changed_at` column, causing database errors when trying to record status changes
2. The application wasn't properly tracking which entity (advisor or company) rejected an application
3. The UI was using different systems for checking rejection status than what was being set in the database

## Solutions Implemented

### Database Fixes
1. Added the missing `changed_at` column to the `application_history` table 
2. Added a `rejected_by_entity` column to track which entity rejected the application
3. Added `rejected_by_advisor` and `rejected_by_company` boolean columns to the `applications` table

### Code Fixes
1. Updated the `Application` interface to include the new rejection tracking fields
2. Fixed the `updateApplicationStatusField` function to properly set the rejection flags
3. Modified how rejection flags are stored in the database, ensuring they are correctly set based on who rejected the application

### UI Fixes
1. Updated the `renderApprovalIndicators` function to prioritize rejection indicators over approval indicators
2. Added better handling of missing flags and fallback logic for display
3. Improved rejection status inference by checking multiple sources of truth:
   - First: explicit rejection flags in `approvalStatus`
   - Second: status fields like `advisor_status` and `company_status`
   - Finally: defaulting to company rejection as a last resort

## Testing
The fix has been verified to correctly show:
1. "Rechazado por Asesor" when an advisor rejects an application
2. "Rechazado por Empresa" when a company rejects an application
3. Proper handling of historical data with missing rejection flags

## Future Improvements
1. Consider adding a generic "reason for rejection" field to provide more context
2. Implement a more comprehensive history tracking system
3. Improve the migration process for adding new fields to the database schema 