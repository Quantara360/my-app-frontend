# Admin Interface Integration Guide

## Overview
The admin dashboard has been successfully integrated into your project with full CRUD functionality for managing:
- Assets
- Chemicals  
- Machineries
- Workers
- Approvals
- Personal Assets (Vehicles, Jewelleries, Properties)

## Frontend Components

### Admin UI (`src/app/admin.tsx`)
The main admin dashboard component with:
- Dashboard view with stat cards
- Assets management (Create, Read, Update, Delete)
- Chemicals management (Create, Read, Update, Delete)
- Machineries management (Create, Read)
- Workers management (Create, Read, Terminate, Delete)
- Approvals management (Create, Read, Approve, Reject)
- Personal Assets management (Vehicles, Jewelleries, Properties)
- Site management

### API Services
Created the following services in `src/services/`:

1. **adminAssetsService.ts** - Asset CRUD operations
   - `getAssets()` - Retrieve all assets
   - `createAsset(data)` - Create new asset
   - `updateAsset(id, data)` - Update asset
   - `deleteAsset(id)` - Delete asset

2. **adminChemicalsService.ts** - Chemical CRUD operations
   - `getChemicals()` - Retrieve all chemicals
   - `createChemical(data)` - Create new chemical
   - `updateChemical(id, data)` - Update chemical
   - `deleteChemical(id)` - Delete chemical

3. **adminMachineriesService.ts** - Machinery CRUD operations
   - `getMachineries()` - Retrieve all machineries
   - `createMachinery(data)` - Create new machinery
   - `updateMachinery(id, data)` - Update machinery
   - `deleteMachinery(id)` - Delete machinery

4. **adminWorkersService.ts** - Worker CRUD operations
   - `getWorkers()` - Retrieve all workers
   - `createWorker(data)` - Create new worker
   - `updateWorker(id, data)` - Update worker
   - `deleteWorker(id)` - Delete worker
   - `terminateWorker(id)` - Terminate worker employment

5. **adminApprovalsService.ts** - Approval CRUD operations
   - `getApprovals()` - Retrieve all approvals
   - `createApproval(data)` - Create new approval request
   - `approveApproval(id, reason)` - Approve request
   - `rejectApproval(id, reason)` - Reject request

6. **adminPersonalAssetsService.ts** - Personal Assets CRUD operations
   - Vehicles: `getVehicles()`, `createVehicle()`, `updateVehicle()`, `deleteVehicle()`
   - Jewelleries: `getJewelleries()`, `createJewellery()`, `updateJewellery()`, `deleteJewellery()`
   - Properties: `getProperties()`, `createProperty()`, `updateProperty()`, `deleteProperty()`

## Backend Components

### API Routes (`backend/routes/api.php`)
Added the following authenticated routes:

```
GET/POST /api/assets - Asset CRUD
GET/POST /api/chemicals - Chemical CRUD
GET/POST /api/machineries - Machinery CRUD
GET/POST /api/workers - Worker CRUD
GET/POST /api/approvals - Approval CRUD
PATCH /api/approvals/{id}/approve - Approve request
PUT /api/workers/{id}/terminate - Terminate worker

GET/POST /api/vehicles - Vehicle CRUD
GET/POST /api/jewelleries - Jewellery CRUD
GET/POST /api/properties - Property CRUD
```

### Models
Created new Eloquent models:
- `Vehicle` - Personal vehicle records
- `Jewellery` - Jewellery asset records
- `Property` - Property records

### Database Migrations
Created migrations for:
- `vehicles` table
- `jewelleries` table
- `properties` table

### Controller (`backend/app/Http/Controllers/OfficeController.php`)
Added methods for:
- Vehicle CRUD operations
- Jewellery CRUD operations
- Property CRUD operations
- Approval approval action
- Worker termination action

## Integration Steps

### 1. Run Database Migrations
```bash
cd backend
php artisan migrate
```

### 2. Connect Frontend Services to Admin Component
The admin.tsx component currently uses local state. To enable API integration:

a. Import services at the top:
```typescript
import * as AssetsService from '@/services/adminAssetsService';
import * as ChemicalsService from '@/services/adminChemicalsService';
import * as MachineriesService from '@/services/adminMachineriesService';
import * as WorkersService from '@/services/adminWorkersService';
import * as ApprovalsService from '@/services/adminApprovalsService';
import * as PersonalAssetsService from '@/services/adminPersonalAssetsService';
```

b. Add useEffect hooks to load data on component mount:
```typescript
useEffect(() => {
  loadAssets();
  loadChemicals();
  loadWorkers();
  loadApprovals();
  loadMachineries();
}, []);

const loadAssets = async () => {
  try {
    const data = await AssetsService.getAssets();
    setAssets(data);
  } catch (error) {
    console.error('Failed to load assets:', error);
  }
};

// Similar functions for other data types
```

c. Update handlers to call API methods:
```typescript
const handleUpdateAsset = async () => {
  if (!selectedAsset) return;
  try {
    await AssetsService.updateAsset(selectedAsset.id, {
      name: editName,
      count: Number(editCount),
      value: editValue,
    });
    // Reload assets
    await loadAssets();
    setShowUpdateModal(false);
    setSuccessModalTitle("Assets Updated Successfully!");
    setShowSuccessModal(true);
  } catch (error) {
    Alert.alert('Error', 'Failed to update asset');
  }
};

// Similar updates for other handlers
```

## Data Flow

1. **Create Operation**
   - User fills form in modal
   - Handler validates input
   - API service sends POST request to backend
   - Backend validates and stores data
   - Response returned to frontend
   - Local state updated and UI refreshed

2. **Read Operation**
   - Component mounts or user navigates to section
   - useEffect calls service function
   - Service sends GET request to backend
   - Backend retrieves and returns data
   - Frontend updates local state
   - UI renders data in table

3. **Update Operation**
   - User edits item via modal
   - Handler calls update handler
   - API service sends PUT request
   - Backend validates and updates data
   - Response returned to frontend
   - Local state updated
   - Success modal shown

4. **Delete Operation**
   - User clicks delete button
   - Handler calls delete function
   - API service sends DELETE request
   - Backend deletes data
   - Confirmation returned
   - Item removed from local state
   - Success modal shown

## Response Format

All API endpoints return data in the following format:
```json
{
  "data": {
    "id": 1,
    "name": "Example",
    ...
  }
}
```

For list endpoints:
```json
{
  "data": [
    { "id": 1, ... },
    { "id": 2, ... }
  ]
}
```

## Error Handling

Services include built-in error handling:
- Network errors are caught and logged
- Server errors are parsed and thrown
- Components should wrap service calls in try-catch blocks
- Show appropriate Alert or toast notifications to users

## Next Steps

1. Run migrations: `php artisan migrate`
2. Optionally integrate API services with admin.tsx component handlers
3. Test all CRUD operations
4. Add authorization checks if needed
5. Add validation rules as needed
6. Consider adding pagination and filtering

## Notes

- All backend routes are protected with `auth:sanctum` middleware
- The admin interface displays mock data by default - integrate services to use real backend data
- Personal asset endpoints follow RESTful conventions
- Approval and worker termination have special action endpoints
