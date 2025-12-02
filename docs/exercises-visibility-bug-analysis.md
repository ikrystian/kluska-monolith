# Exercises Visibility Bug Analysis

## Problem Description
Exercises are not visible in the following routes:
- `/admin/exercises`
- `/trainer/exercises`
- `/athlete/exercises`

Despite having 4 exercises in the database (all with `ownerId: "public"`), the exercise list appears empty.

## Investigation Summary

### Database State
- **Collection**: `exercises` in `test` database
- **Document count**: 4 exercises
- **All exercises have**: `ownerId: "public"`
- **MongoDB query works correctly**: `{ ownerId: { $in: ["public", "user-id"] } }` returns all 4 exercises

### Code Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Page Components                          │
├─────────────────────────────────────────────────────────────────┤
│  /admin/exercises/page.tsx                                       │
│  /trainer/exercises/page.tsx     ──────►  ExercisesListView     │
│  /athlete/exercises/page.tsx              (shared component)     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ExercisesListView.tsx                         │
├─────────────────────────────────────────────────────────────────┤
│  - Uses useCollection hook to fetch exercises                    │
│  - Uses @tanstack/react-virtual for virtualization              │
│  - Renders ExerciseCardHorizontal for each exercise             │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      useCollection Hook                          │
├─────────────────────────────────────────────────────────────────┤
│  - Fetches from /api/db/exercises                               │
│  - Passes query as JSON in URL params                           │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   /api/db/[collection]/route.ts                  │
├─────────────────────────────────────────────────────────────────┤
│  - Parses query from URL params                                 │
│  - Uses Mongoose Model.find() with query                        │
│  - Returns { data: [...] }                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Root Cause Analysis

### Primary Issue: CSS Height Chain Problem

The virtualization container requires a defined height to function properly. The current implementation has a broken height chain:

#### Layout Structure (admin/trainer/athlete layouts):
```html
<main className="flex-1 flex-col overflow-y-auto bg-secondary/30">
  <AppHeader />
  <div className="flex-1 overflow-y-auto">{children}</div>  <!-- No explicit height -->
</main>
```

**Problem**: The `<main>` element uses `flex-col` but is missing `display: flex`. This means `flex-1` on the child div doesn't work as expected.

#### ExercisesListView Structure:
```html
<div className="container mx-auto p-4 md:p-8 h-full flex flex-col">
  <!-- Header with flex-shrink-0 -->
  <div ref={parentRef}
       className="flex-1 overflow-auto"
       style={{ contain: 'strict' }}>  <!-- PROBLEM: No height! -->
    <!-- Virtualized content -->
  </div>
</div>
```

**Problem**:
1. `h-full` requires parent to have defined height (it doesn't)
2. `flex-1` requires parent to be a flex container with defined height
3. `contain: 'strict'` creates a containing block - if height is 0, nothing renders

### Secondary Issue: Virtualization with Zero Height

When `@tanstack/react-virtual` virtualizer has a scroll container with 0 height:
- `getVirtualItems()` returns empty array (no items visible in viewport)
- The inner content div has correct height but parent can't scroll
- Result: Empty list despite data being present

### Evidence

Other components that fetch exercises **without virtualization** work correctly:
- `admin/dashboard/page.tsx` - uses `useCollection('exercises')` directly
- `athlete/calendar/page.tsx` - uses `useCollection<Exercise>('exercises')`
- `CreateWorkout.tsx` - uses `useCollection<Exercise>('exercises')`
- `EditWorkout.tsx` - uses `useCollection<Exercise>('exercises')`

These work because they don't rely on virtualization and don't need a defined container height.

## Fix Plan

### Option A: Fix Height Chain (Recommended)

#### Step 1: Fix Layout Files
Update all three layout files to properly establish flex height chain:

**Files to modify:**
- `src/app/(admin)/layout.tsx`
- `src/app/(trainer)/layout.tsx`
- `src/app/(athlete)/layout.tsx`

**Change:**
```tsx
// Before
<main className="flex-1 flex-col overflow-y-auto bg-secondary/30">

// After
<main className="flex-1 flex flex-col overflow-hidden bg-secondary/30">
```

And the inner div:
```tsx
// Before
<div className="flex-1 overflow-y-auto">{children}</div>

// After
<div className="flex-1 overflow-y-auto min-h-0">{children}</div>
```

The `min-h-0` is crucial for flex children to shrink below their content size.

#### Step 2: Fix ExercisesListView Container
Update the virtualization container to have explicit height:

**File:** `src/components/shared/exercises/ExercisesListView.tsx`

**Change:**
```tsx
// Before (line 274-276)
<div
  ref={parentRef}
  className="flex-1 overflow-auto"
  style={{ contain: 'strict' }}
>

// After
<div
  ref={parentRef}
  className="flex-1 overflow-auto min-h-0"
  style={{ contain: 'strict' }}
>
```

### Option B: Remove Virtualization (Alternative)

If virtualization is not needed (small number of exercises), replace with simple map:

```tsx
// Replace virtualized list with simple list
{filteredExercises && filteredExercises.length > 0 ? (
  <div className="flex flex-col gap-2 overflow-auto">
    {filteredExercises.map((exercise) => (
      <ExerciseCardHorizontal
        key={exercise.id}
        exercise={exercise}
        userId={user?.uid}
        canEdit={canEdit}
        canDelete={canDelete}
        showProgress={showProgress}
        showOwnerBadge={showOwnerBadge}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShowProgress={handleShowProgress}
      />
    ))}
  </div>
) : (
  // Empty state...
)}
```

### Option C: Hybrid Approach (Best)

Use virtualization only when there are many exercises:

```tsx
const VIRTUALIZATION_THRESHOLD = 50;
const shouldVirtualize = (filteredExercises?.length ?? 0) > VIRTUALIZATION_THRESHOLD;

// Then conditionally render virtualized or simple list
```

## Recommended Implementation Order

1. **First**: Apply Option A fixes to layout files and ExercisesListView
2. **Test**: Verify exercises are visible in all three routes
3. **Optional**: Consider Option C for better UX with small datasets

## Files to Modify

| File | Change Type | Priority |
|------|-------------|----------|
| `src/app/(admin)/layout.tsx` | Fix flex display and min-h-0 | High |
| `src/app/(trainer)/layout.tsx` | Fix flex display and min-h-0 | High |
| `src/app/(athlete)/layout.tsx` | Fix flex display and min-h-0 | High |
| `src/components/shared/exercises/ExercisesListView.tsx` | Add min-h-0 to container | High |

## Testing Checklist

After implementing fixes:
- [ ] `/admin/exercises` shows all 4 exercises
- [ ] `/trainer/exercises` shows public exercises (4)
- [ ] `/athlete/exercises` shows public exercises (4)
- [ ] Scrolling works correctly with many exercises
- [ ] Search and filter functionality works
- [ ] Create/Edit/Delete operations work
- [ ] No layout shifts or visual glitches

## Additional Notes

### Why This Wasn't Caught Earlier
- The loading skeleton shows correctly (it doesn't use virtualization)
- The empty state shows correctly (it's rendered when `filteredExercises.length === 0`)
- The data is fetched correctly (API returns data)
- The issue only manifests when virtualization tries to render with 0 height container

### Related Components That May Have Similar Issues
Any component using `@tanstack/react-virtual` with `flex-1` containers should be reviewed:
- Check if they have proper height chain
- Ensure `min-h-0` is used on flex children that need to shrink