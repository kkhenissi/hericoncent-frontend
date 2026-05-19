# Family Tree Frontend Updates

## Overview
Updated the family tree component to support adding, modifying, and deleting family tree members, with data loading from the backend based on the currently opened dossier.

## Changes Made

### 1. **API Service** (`src/app/core/services/api.service.ts`)
Added new methods for family tree CRUD operations:
- `getFamilyTree(dossierId: string)` - Fetches family tree members for a dossier
- `createFamilyMember(dossierId: string, member: any)` - Creates a new family member
- `updateFamilyMember(memberId: string, member: any)` - Updates an existing member
- `deleteFamilyMember(memberId: string)` - Deletes a member

**Backend Endpoints Expected:**
- GET `/dossiers/{dossierId}/family-tree`
- POST `/dossiers/{dossierId}/family-tree/members`
- PUT `/family-tree/members/{memberId}`
- DELETE `/family-tree/members/{memberId}`

### 2. **Family Tree Service** (`src/app/family-tree/src/app/family-tree/family-tree.service.ts`)
- Added `setDossier(dossierId)` method to load data from backend
- Updated `addMember()`, `updateMember()`, and `deleteMember()` to:
  - Return Observables (instead of void)
  - Use backend API when a dossier is set
  - Fall back to local state when no dossier is active
- Maintained backward compatibility for local-only mode

### 3. **Family Tree Component** (`src/app/family-tree/src/app/family-tree/family-tree.component.ts`)
- Added `ActivatedRoute` injection to read route parameters
- Added `loading` and `error` state properties
- Updated `ngOnInit()` to:
  - Read `dossierId` from route params
  - Call `setDossier()` on the service
- Updated form save/delete methods to handle Observables
- Updated drag-drop coupling logic to handle Observables
- Added error handling with user-friendly messages

### 4. **App Routes** (`src/app/app.routes.ts`)
Added new route for dossier-specific family tree:
```typescript
{ path: 'dossiers/:dossierId/arbre', component: FamilyTreeComponent }
```

Also kept the standalone route:
```typescript
{ path: 'arbre', component: FamilyTreeComponent }
```

### 5. **Family Tree Template** (`src/app/family-tree/src/app/family-tree/family-tree.component.html`)
- Added loading state display with spinner
- Added error notification display
- Maintains all existing functionality

### 6. **Family Tree Styles** (`src/app/family-tree/src/app/family-tree/family-tree.component.scss`)
Added new styles:
- `.ft-loading` - Loading state container with spinner
- `.ft-spinner` - Animated loading spinner
- `.ft-error` - Error notification styling
- `@keyframes spin` - Spinner animation

### 7. **Dossier Detail Component** (`src/app/features/dossiers/dossier-detail.component.ts`)
Updated the "View Family Tree" link to navigate to the dossier-specific family tree:
```typescript
[routerLink]="['/dossiers', dossier()!.id, 'arbre']"
```

## Features

### ✅ Add Member
1. Click "+ Ajouter" button
2. Fill in member details
3. Click "Enregistrer" to save
4. Data syncs with backend automatically

### ✅ Edit Member
1. Click on a member in the tree
2. Click "Modifier" in the detail card
3. Update details
4. Click "Enregistrer" to save
5. Data syncs with backend automatically

### ✅ Delete Member
1. Click on a member in the tree
2. Click "Supprimer" in the detail card
3. Confirm deletion
4. Member is removed from both UI and backend

### ✅ Load Tree by Dossier
1. Navigate to a dossier detail page
2. Click "Voir l'arbre familial" link
3. Family tree loads with members specific to that dossier
4. Can perform add/edit/delete operations

### ✅ Standalone Mode
1. Navigate directly to `/arbre` route
2. Family tree works with local state (fallback)
3. No dossier context needed

## User Interface Changes

### Loading State
- Shows spinner and "Chargement de l'arbre généalogique..." message
- Automatically disappears after data loads

### Error Handling
- Displays error message when backend operations fail
- Auto-dismisses after 3 seconds
- User can still interact with existing data

### Navigation
- From dossier detail: New link to view family tree for that specific dossier
- From family tree: Can go back to dashboard

## Technical Notes

### Observable Handling
- Form save/delete operations now return Observables
- Proper subscription cleanup using `takeUntil` with destroy$ subject
- Error handling with user feedback

### Backward Compatibility
- Service checks if dossier is set before using backend
- Falls back to local state if no backend connection
- Existing tests for local-only mode will still pass

### Member ID Generation
- New members get ID: `'member_' + Date.now()` (temporary local ID)
- Backend should return proper ID, which overwrites this
- This ensures IDs don't collide

## Testing Checklist

- [ ] View family tree from dossier detail page
- [ ] Add new family member
- [ ] Edit existing family member
- [ ] Delete family member
- [ ] Verify loading state shows briefly
- [ ] Test error handling (simulate backend failure)
- [ ] Verify family relationships update
- [ ] Test drag-drop to couple members
- [ ] View tree in standalone mode
- [ ] Cross-browser compatibility

## Future Enhancements

1. Add photo upload for family members
2. Add bulk import/export of family trees
3. Add family tree versioning/history
4. Add collaboration features for multiple editors
5. Add advanced search/filter options
6. Add printing support for family trees
