# Bhagona Backend v3

This version wires your stored procedures into Express routes for the Event & Services booking flows.

## Setup
1. Copy `.env.example` to `.env` and fill credentials.
2. `npm install`
3. Create DB and import SQL files:
   - `CREATE DATABASE bhagona_db;`
   - `mysql -u root -p bhagona_db < sql/tables.sql`
   - `mysql -u root -p bhagona_db < sql/procedures.sql`
4. `npm start` or `npm run dev`

## Key endpoints (examples)
- POST /users           -> AddUser (calls stored procedure)
- PUT /users/:id        -> UpdateUser (calls stored procedure)
- GET /users/active     -> GetAllUsers
- GET /events           -> GetAllEvents
- GET /services         -> GetAllServices
- GET /services/with-unit -> GetServicesWithUnit
- POST /bookings        -> CreateBooking (stored proc)
- POST /bookings/:id/menu-items -> AddMenuItemToBooking
- POST /chef/availability -> AddChefAvailability
- GET /chef/:id/availability -> GetChefAvailability
- GET /chefs/active     -> GetAllActiveChefs
- GET /vendors/active   -> GetAllActiveVendors
- GET /vendors/catering -> GetCateringVendors
- POST /reviews         -> AddReview
- POST /bookings/respond -> RespondToBooking
- GET /orders/status-summary -> GetOrdersStatusSummary
- GET /orders/cancelled/:role -> GetOrdersCancelledByRole

Look into `src/routes/` for implementations and example payloads.
