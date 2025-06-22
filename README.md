# Calendar Workout Sync

Automatically sync your Strava workouts to Google Calendar with comprehensive data stored in Notion. Transform your fitness tracking into visual calendar events with rich workout details.

## What This Does

**Complete Workout Pipeline:** Fetch workouts from Strava → Store detailed data in Notion → Create rich calendar events on Google Calendar

**Week-Based Processing:** Select any week from 2025 and process all workouts at once with precise date boundaries (Sunday-Saturday)

**Rich Calendar Events:** Each workout appears on your calendar with duration, distance, activity type, and detailed descriptions

## How It Works

### Two-Script System

1. **`collect-workouts.js`:** Strava API → Notion database storage
2. **`create-calendar-events.js`:** Notion data → Google Calendar events

### Data Flow

```
Strava Workouts → Weekly Collection → Notion Database → Calendar Creation → Google Calendar
```

### Example Output

**Notion Database Record:**

```
Activity Name: Evening Run
Date: June 18, 2025
Activity Type: Run
Start Time: 2025-06-18T18:42:23Z
Duration: 42 minutes
Distance: 4.3 miles
Activity ID: 14844299502
Calendar Created: ✓
```

**Google Calendar Event:**

```
Title: Run - 4.3 miles
Time: June 18, 2025 6:42 PM - 7:24 PM
Calendar: + 3. 🏋️‍♀️ Workout
Description:
🏃‍♂️ Evening Run
⏱️ Duration: 42 minutes
📏 Distance: 4.3 miles
📊 Activity Type: Run
🔗 Activity ID: 14844299502
```

## Prerequisites

- Node.js 18+ installed
- Active Strava account with workout data
- Notion account and workspace
- Google account with Calendar access
- Postman (for API testing)

## Setup

### 1. Strava API Application

1. Go to https://www.strava.com/settings/api
2. Create new application:
   - **Application Name:** "Personal Workout Tracker"
   - **Category:** "Data Importer"
   - **Website:** "http://localhost"
   - **Authorization Callback Domain:** "localhost"
3. Note your **Client ID** and **Client Secret**

### 2. Strava OAuth Authentication

Run the OAuth setup:

```bash
node get-google-tokens.js
```

Follow the prompts to:

- Authorize your application with Strava
- Get access token and refresh token
- Required scopes: `read,activity:read`

### 3. Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Create integration: "Strava Workout Tracker"
3. Copy integration token
4. Create database with this schema:

| Property Name    | Type     | Options                                    |
| ---------------- | -------- | ------------------------------------------ |
| Activity Name    | Title    | -                                          |
| Date             | Date     | -                                          |
| Activity Type    | Select   | Run, Workout, Ride, Swim, Hike, Walk, Yoga |
| Start Time       | Text     | -                                          |
| Duration         | Number   | Minutes                                    |
| Distance         | Number   | Miles/km                                   |
| Activity ID      | Number   | -                                          |
| Calendar Created | Checkbox | Default: false                             |

5. Share database with your integration

### 4. Google Calendar API

1. Go to Google Cloud Console
2. Create project: "Calendar Workout Sync"
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials (Desktop application)
5. Use the OAuth helper script to get refresh token
6. Create a dedicated fitness calendar

### 5. Installation

```bash
# Clone/create project
mkdir calendar-workout-sync
cd calendar-workout-sync

# Install dependencies
npm install @notionhq/client googleapis node-fetch@2.7.0 dotenv inquirer

# Copy environment template
cp .env.example .env
```

### 6. Environment Configuration

Create `.env` file with your credentials:

```env
# Strava Configuration
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_ACCESS_TOKEN=your_strava_access_token
STRAVA_REFRESH_TOKEN=your_strava_refresh_token

# Notion Configuration
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id

# Google Calendar Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
FITNESS_CALENDAR_ID=your_fitness_calendar_id
```

## Usage

### Collect Workout Data

```bash
node collect-workouts.js
```

**Interactive Process:**

1. Tests Strava and Notion connections
2. Shows available weeks (1-52 for 2025)
3. Select week number (e.g., "24" for June 8-14)
4. Fetches all Strava activities for that week
5. Stores comprehensive data in Notion database

### Create Calendar Events

```bash
node create-calendar-events.js
```

**Interactive Process:**

1. Tests Notion and Google Calendar connections
2. Shows available weeks
3. Select same week number
4. Reads workouts from Notion (not yet calendared)
5. Creates detailed calendar events
6. Marks workouts as "Calendar Created" in Notion

### Typical Workflow

```bash
# Step 1: Collect this week's workouts
node collect-workouts.js
# Enter: 25

# Step 2: Create calendar events for this week
node create-calendar-events.js
# Enter: 25
```

## Project Structure

```
calendar-workout-sync/
├── README.md
├── package.json
├── .env.example
├── .gitignore
├── collect-workouts.js         # Script 1: Data collection
├── create-calendar-events.js   # Script 2: Calendar creation
├── lib/
│   ├── strava-client.js        # Strava API interface
│   ├── notion-client.js        # Notion database operations
│   ├── calendar-client.js      # Google Calendar operations
│   └── week-utils.js           # Week calculation utilities
└── postman/
    └── strava-api-tests.json   # API testing collection
```

## Week Numbering System

- **Week 1:** December 29, 2024 - January 4, 2025 (includes Jan 1)
- **Week 2:** January 5 - January 11, 2025
- **Week 25:** June 15 - June 21, 2025
- **Week 52:** December 21 - December 27, 2025

Weeks run Sunday through Saturday with Week 1 starting on the Sunday before January 1st.

## Testing

### Test Individual Components

```bash
# Test Strava connection
node -e "const StravaClient = require('./lib/strava-client.js'); const client = new StravaClient(); client.testConnection();"

# Test Notion connection
node -e "const NotionClient = require('./lib/notion-client.js'); const client = new NotionClient(); client.testConnection();"

# Test Google Calendar connection
node -e "const CalendarClient = require('./lib/calendar-client.js'); const client = new CalendarClient(); client.testConnection();"

# Test week calculations
node -e "const { getWeekBoundaries } = require('./lib/week-utils.js'); console.log('Week 25:', getWeekBoundaries(2025, 25));"
```

### API Testing with Postman

1. Import `postman/strava-api-tests.json`
2. Set up environment with your Strava tokens
3. Test authentication and data retrieval
4. Verify API rate limits and responses

## Troubleshooting

### Common Issues

**Strava Token Expired:**

- Tokens expire every 6 hours
- Use refresh token to get new access token
- Check token expiration in error messages

**Notion Database Access:**

- Verify integration is shared with database
- Check database ID in environment variables
- Ensure property names match exactly

**Google Calendar Permission:**

- Verify calendar ID is correct
- Check OAuth scopes include calendar write access
- Ensure calendar exists and is writable

**Week Selection Issues:**

- Week numbers run 1-52 for 2025
- Check date ranges match expected weeks
- Verify timezone handling for date boundaries

### Data Recovery

- **Missing workouts:** Re-run collect-workouts.js for affected weeks
- **Duplicate calendar events:** Script checks for existing events
- **Wrong week data:** Verify week number calculation

## Maintenance

### Weekly Tasks

- Run data collection for previous week
- Create calendar events for collected data
- Verify events appear correctly on calendar

### Token Management

- **Strava tokens:** Expire every 6 hours, auto-refresh needed
- **Google tokens:** Long-lived refresh tokens
- **Notion tokens:** No expiration

### Database Management

- **Lock Notion database** to prevent structure changes
- **Export data** monthly for backup
- **Monitor rate limits** for all APIs

## Rate Limits & Performance

### API Limits

- **Strava:** 100 requests/15min, 1000/day
- **Notion:** 3 requests/second
- **Google Calendar:** 1000 requests/100 seconds

### Optimization

- **Batch processing:** Process full weeks at once
- **Incremental updates:** Only process new workouts
- **Efficient filtering:** Use date ranges and status flags

## Privacy & Data

### Data Storage

- **Workout data:** Stored in personal Notion workspace
- **API tokens:** Stored locally in .env (never committed)
- **Calendar events:** Created in personal Google Calendar

### Data Control

- **Full ownership:** All data remains in your accounts
- **Export capability:** Notion data can be exported anytime
- **Revocable access:** API permissions can be revoked anytime

## Contributing

This is a personal tracking system, but improvements welcome:

- Enhanced error handling and recovery
- Additional Strava metrics integration
- Better timezone handling for travel
- Automated token refresh workflows

## License

MIT License - Use this code for your own personal fitness tracking needs.

---

**Built with:** Strava API, Notion API, Google Calendar API, Node.js  
**Time saved:** Automated workout calendar creation! 🎉
