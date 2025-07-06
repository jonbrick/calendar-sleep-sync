# Oura Sleep Tracker 2025

Automatically sync your Oura sleep data to Google Calendar with comprehensive biometric data stored in Notion. Transform your sleep tracking into visual calendar events categorized by wake times with rich sleep analytics.

## What This Does

**Complete Sleep Pipeline:** Fetch sleep sessions from Oura → Store detailed biometric data in Notion → Create categorized calendar events on Google Calendar

**Week-Based Processing:** Select any week from 2025 and process all sleep sessions at once with precise date boundaries (Sunday-Saturday)

**Smart Categorization:** Automatically categorizes sleep by wake time - Early Birds (wake before 7AM) vs Night Owls (wake 7AM or later)

**Rich Calendar Events:** Each sleep session appears on your calendar with duration, efficiency, sleep stages, and detailed biometric descriptions

## How It Works

### Two-Script System

1. **`collect-sleep.js`:** Oura API → Notion database storage
2. **`create-calendar-events.js`:** Notion data → Categorized Google Calendar events

### Data Flow

```
Oura Sleep Sessions → Weekly Collection → Notion Database → Calendar Creation → Google Calendar (2 calendars)
```

### Example Output

**Notion Database Record:**

```
Night of: Sunday, June 15, 2025
Night of Date: 2025-06-15
Oura Date: 2025-06-16
Bedtime: 2025-06-15T23:42:30-04:00
Wake Time: 2025-06-16T07:28:28-04:00
Sleep Duration: 7.4 hours
Deep Sleep: 71 minutes
REM Sleep: 85 minutes
Light Sleep: 238 minutes
Efficiency: 93%
Google Calendar: Sleep In
Calendar Created: ✓
```

**Google Calendar Event:**

```
Title: Sleep - 7.4hrs (93% efficiency)
Time: June 15, 2025 11:42 PM - June 16, 2025 7:28 AM
Calendar: 🛌 Sleep In
Description:
😴 Night of Sunday, June 15, 2025
⏱️ Duration: 7.4 hours
📊 Efficiency: 93%

🛌 Sleep Stages:
• Deep Sleep: 71 min
• REM Sleep: 85 min
• Light Sleep: 238 min
• Awake Time: 14 min

❤️ Biometrics:
• Avg Heart Rate: 64 bpm
• Low Heart Rate: 59 bpm
• HRV: 32 ms
• Respiratory Rate: 14.6 breaths/min

🔗 Sleep ID: 7224f5d1-1bfe-42fa-be7d-c7fddcf96a7c
```

## Prerequisites

- Node.js 18+ installed
- Active Oura Ring (Gen3 or Ring 4) with membership
- Notion account and workspace
- Google account with Calendar access
- Postman (for API testing)

## Setup

### 1. Oura Personal Access Token

1. Go to https://cloud.ouraring.com/personal-access-tokens
2. Create new token:
   - **Name:** "Personal Sleep Tracker"
   - **Scope:** Select all available scopes
3. Copy your Personal Access Token
4. **Note:** Requires active Oura membership for API access

### 2. Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Create integration: "Oura Sleep Tracker"
3. Copy integration token
4. Create database with this schema:

| Property Name    | Type      | Options                  |
| ---------------- | --------- | ------------------------ |
| Night of         | Title     | -                        |
| Night of Date    | Date      | -                        |
| Oura Date        | Date      | -                        |
| Google Calendar  | Select    | Normal Wake Up, Sleep In |
| Bedtime          | Rich Text | -                        |
| Wake Time        | Rich Text | -                        |
| Sleep Duration   | Number    | Hours                    |
| Deep Sleep       | Number    | Minutes                  |
| REM Sleep        | Number    | Minutes                  |
| Light Sleep      | Number    | Minutes                  |
| Awake Time       | Number    | Minutes                  |
| Heart Rate Avg   | Number    | BPM                      |
| Heart Rate Low   | Number    | BPM                      |
| HRV              | Number    | Milliseconds             |
| Respiratory Rate | Number    | Breaths/min              |
| Efficiency       | Number    | Percentage               |
| Type             | Rich Text | -                        |
| Sleep ID         | Rich Text | -                        |
| Calendar Created | Checkbox  | Default: false           |

5. Share database with your integration

### 3. Google Calendar API

1. Go to Google Cloud Console
2. Create project: "Oura Sleep Tracker"
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials (Desktop application)
5. Use OAuth helper script to get refresh token
6. Create two dedicated sleep calendars:
   - **☀️ Wake up before 7am** (Early Birds)
   - **🛌 Sleep In** (Night Owls)

### 4. Installation

```bash
# Clone/create project
mkdir oura-sleep-tracker
cd oura-sleep-tracker

# Install dependencies
npm install @notionhq/client googleapis node-fetch@2.7.0 dotenv inquirer

# Copy environment template
cp .env.example .env
```

### 5. Environment Configuration

Create `.env` file with your credentials:

```env
# Oura API Configuration
OURA_ACCESS_TOKEN=your_oura_personal_access_token

# Notion Configuration
NOTION_TOKEN=your_notion_integration_token
NOTION_DATABASE_ID=your_sleep_database_id

# Google Calendar Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token

# Two calendars for sleep categorization
NORMAL_WAKE_UP_CALENDAR_ID=your_early_bird_calendar_id
SLEEP_IN_CALENDAR_ID=your_sleep_in_calendar_id
```

## Usage

### Collect Sleep Data

```bash
node collect-sleep.js
```

**Interactive Process:**

1. Tests Oura and Notion connections
2. Shows available weeks (1-52 for 2025)
3. Select week number (e.g., "25" for June 15-21)
4. Fetches all Oura sleep sessions for that week
5. Stores comprehensive biometric data in Notion database
6. Applies "Night of Date" logic for proper sleep attribution

### Create Calendar Events

```bash
node create-calendar-events.js
```

**Interactive Process:**

1. Tests Notion and Google Calendar connections
2. Shows available weeks
3. Select same week number
4. Reads sleep records from Notion (not yet calendared)
5. Creates categorized calendar events based on wake times
6. Marks sleep records as "Calendar Created" in Notion

### Typical Workflow

```bash
# Step 1: Collect this week's sleep data
node collect-sleep.js
# Enter: 25

# Step 2: Create calendar events for this week
node create-calendar-events.js
# Enter: 25
```

## Project Structure

```
oura-sleep-tracker/
├── README.md
├── package.json
├── .env.example
├── .gitignore
├── collect-sleep.js            # Script 1: Sleep data collection
├── create-calendar-events.js   # Script 2: Calendar creation
├── lib/
│   ├── oura-client.js          # Oura API interface
│   ├── notion-client.js        # Notion database operations
│   ├── calendar-client.js      # Google Calendar operations
│   └── week-utils.js           # Week calculation utilities
└── postman/
    └── oura-api-tests.json     # API testing collection
```

## Sleep Logic & Date Attribution

### "Night of Date" Calculation

Sleep sessions are attributed to the night they occurred, not the wake-up date:

- **Oura Date:** June 16, 2025 (when you woke up)
- **Night of Date:** June 15, 2025 (the night you went to sleep)
- **Rule:** Night of Date = Oura Date - 1 day

### Wake Time Categorization

- **☀️ Normal Wake Up:** Wake time before 7:00 AM → Early Bird calendar
- **🛌 Sleep In:** Wake time 7:00 AM or later → Night Owl calendar

### Week Boundaries

- **Week 1:** December 29, 2024 - January 4, 2025 (includes Jan 1)
- **Week 2:** January 5 - January 11, 2025
- **Week 25:** June 15 - June 21, 2025 (Night of dates)
- **Week 52:** December 21 - December 27, 2025

Weeks run Sunday through Saturday with Week 1 starting on the Sunday before January 1st.

## Testing

### Test Individual Components

```bash
# Test Oura connection
node -e "const OuraClient = require('./lib/oura-client.js'); const client = new OuraClient(); client.testConnection();"

# Test Notion connection
node -e "const NotionClient = require('./lib/oura-notion-client.js'); const client = new NotionClient(); client.testConnection();"

# Test week calculations
node -e "const { getWeekBoundaries } = require('./lib/oura-week-utils.js'); console.log('Week 25:', getWeekBoundaries(2025, 25));"
```

### API Testing with Postman

1. Import `postman/oura-api-tests.json`
2. Set up environment with your Oura token
3. Test authentication and sleep data retrieval
4. Verify API rate limits and responses

## Troubleshooting

### Common Issues

**Oura API Access:**

- Requires active Oura membership for API access
- Personal Access Tokens don't expire but can be revoked
- Check token permissions in Oura Cloud

**Notion Database Access:**

- Verify integration is shared with database
- Check database ID in environment variables
- Ensure property names match exactly (case-sensitive)

**Google Calendar Permission:**

- Verify calendar IDs are correct
- Check OAuth scopes include calendar write access
- Ensure both sleep calendars exist and are writable

**Date Attribution Issues:**

- Week numbers run 1-52 for 2025
- "Night of Date" should be 1 day before "Oura Date"
- Verify timezone handling for bedtime/wake time

### Data Recovery

- **Missing sleep data:** Re-run collect-sleep.js for affected weeks
- **Duplicate calendar events:** Script checks "Calendar Created" flag
- **Wrong week data:** Verify week number calculation and date ranges

## Maintenance

### Weekly Tasks

- Run data collection for previous week
- Create calendar events for collected data
- Verify events appear correctly on both calendars

### Token Management

- **Oura tokens:** Personal Access Tokens are long-lived
- **Google tokens:** Long-lived refresh tokens
- **Notion tokens:** No expiration

### Database Management

- **Lock Notion database** to prevent structure changes
- **Export data** monthly for backup
- **Monitor for data quality** (efficiency, duration ranges)

## Rate Limits & Performance

### API Limits

- **Oura:** 5000 requests/day for personal use
- **Notion:** 3 requests/second
- **Google Calendar:** 1000 requests/100 seconds

### Optimization

- **Batch processing:** Process full weeks at once
- **Incremental updates:** Only process new sleep sessions
- **Efficient filtering:** Use date ranges and status flags

## Sleep Analytics Features

### Biometric Tracking

- **Sleep Stages:** Deep, REM, Light sleep duration in minutes
- **Heart Rate:** Average and lowest heart rate during sleep
- **HRV:** Heart Rate Variability for recovery metrics
- **Respiratory Rate:** Breathing patterns during sleep
- **Sleep Efficiency:** Percentage of time asleep vs time in bed

### Pattern Recognition

- **Wake Time Trends:** Visual separation of early vs late wake times
- **Sleep Quality:** Efficiency scores and stage distribution
- **Weekly Patterns:** Sunday-Saturday sleep consistency

## Privacy & Data

### Data Storage

- **Sleep data:** Stored in personal Notion workspace
- **API tokens:** Stored locally in .env (never committed)
- **Calendar events:** Created in personal Google Calendar
- **Biometric data:** All health data remains in your accounts

### Data Control

- **Full ownership:** All data remains in your accounts
- **Export capability:** Notion data can be exported anytime
- **Revocable access:** API permissions can be revoked anytime
- **No cloud storage:** No third-party data storage

## Contributing

This is a personal sleep tracking system, but improvements welcome:

- Enhanced sleep pattern analysis
- Additional Oura metrics integration
- Better timezone handling for travel
- Sleep goal tracking and recommendations

## License

MIT License - Use this code for your own personal sleep tracking needs.

---

**Built with:** Oura API, Notion API, Google Calendar API, Node.js  
**Time saved:** Automated sleep calendar creation with rich biometric insights! 😴✨
