# Dashboard Count Fix 

## Summary of Changes

We've fixed the issue with incorrect application counts in both the Company and Advisor dashboards. The problem was in the `executeQuery` function in `dashboardService.ts`, which wasn't consistently applying the `application_type = 'selected_plans'` filter across all query types.

### Key Issues Fixed

1. **Inconsistent Filtering**: The `executeQuery` function was not consistently applying the `application_type = 'selected_plans'` filter in all code paths, which led to some queries returning all applications regardless of type.

2. **Redundant Filter Application**: The function had duplicate code blocks for applying filters to different query types (COUNT, GROUP BY, SUM/AVG, etc.), which made it hard to maintain and led to inconsistencies.

### Implementation Details

1. **Centralized Filter Extraction**: Moved the filter extraction to the beginning of the function, ensuring all query types receive the same filtering logic.

2. **Default Application Type Filter**: Added logic to always apply the `application_type = 'selected_plans'` filter, even if it's not explicitly present in the SQL query.

3. **Streamlined Query Processing**: Refactored the code to extract filters once and apply them consistently, reducing redundancy and chances for errors.

4. **Warning for Missing Filters**: Added a warning log when a query doesn't include an application type filter, to help catch potential issues during development.

## Testing

The fix ensures that both Company and Advisor dashboards now show the correct count of applications (approximately 18), which matches the counts shown in the Kanban view:

- 13 New
- 1 In Review
- 1 Approved
- 1 To Disburse
- 1 Completed
- 1 Rejected

## Future Recommendations

1. **Consistent Parameter Usage**: Use parameterized queries or a more structured approach to filter application, rather than string manipulation.

2. **Type Safety**: Strengthen type safety in dashboard service functions to prevent errors in filter application.

3. **Automated Tests**: Add unit tests that verify the dashboard services return correct counts when filters are applied.

4. **Refine Error Handling**: Improve error handling to provide more context when query execution fails. 