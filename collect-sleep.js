const OuraClient = require("./lib/oura-client.js");
const NotionClient = require("./lib/notion-client.js");
const {
  getWeekBoundaries,
  generateWeekOptions,
} = require("./lib/week-utils.js");
const readline = require("readline");

// Create clients
const oura = new OuraClient();
const notion = new NotionClient();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function calculateSleepDate(bedtimeStart) {
  const bedtime = new Date(bedtimeStart);
  const sleepDate = new Date(bedtimeStart);

  // If bedtime is before 6 AM, this sleep belongs to the previous day
  if (bedtime.getHours() < 6) {
    sleepDate.setDate(sleepDate.getDate() - 1);
  }

  return sleepDate.toISOString().split("T")[0]; // Return YYYY-MM-DD format
}

async function main() {
  console.log("😴 Oura Sleep Collector 2025\n");

  // Test connections
  console.log("Testing connections...");
  const ouraOk = await oura.testConnection();
  const notionOk = await notion.testConnection();

  if (!ouraOk || !notionOk) {
    console.log("❌ Connection failed. Please check your .env file.");
    process.exit(1);
  }

  console.log("\n📅 Available weeks:");
  const weeks = generateWeekOptions(2025);

  // Show first few weeks as examples
  weeks.slice(0, 5).forEach((week, index) => {
    console.log(`  ${week.value} - ${week.label}`);
  });
  console.log("  ...");
  console.log(`  52 - ${weeks[51].label}\n`);

  const weekInput = await askQuestion(
    "? Which week to collect? (enter week number): "
  );
  const weekNumber = parseInt(weekInput);

  if (weekNumber < 1 || weekNumber > 52) {
    console.log("❌ Invalid week number");
    process.exit(1);
  }

  const { weekStart, weekEnd } = getWeekBoundaries(2025, weekNumber);
  console.log(`\n📊 Collecting sleep data for Week ${weekNumber}`);
  console.log(
    `📅 Date range: ${weekStart.toDateString()} - ${weekEnd.toDateString()}\n`
  );

  rl.close();

  // Convert dates to YYYY-MM-DD format for Oura API
  const startDate = weekStart.toISOString().split("T")[0];
  // Add one day to end date to catch late Saturday night sessions
  const extendedEnd = new Date(weekEnd);
  extendedEnd.setDate(extendedEnd.getDate() + 1);
  const endDate = extendedEnd.toISOString().split("T")[0];

  // Fetch both sleep sessions and daily sleep data
  console.log("🔄 Fetching sleep data from Oura...");
  const [sleepSessions, dailySleep] = await Promise.all([
    oura.getSleepSessions(startDate, endDate),
    oura.getDailySleep(startDate, endDate),
  ]);

  // Filter for only long sleep sessions (main nighttime sleep)
  const longSleepSessions = sleepSessions.filter(
    (session) => session.type === "long_sleep"
  );

  // Further filter to only include sessions that belong to this week
  const weekSleepSessions = longSleepSessions.filter((session) => {
    const calculatedSleepDate = calculateSleepDate(session.bedtime_start);
    const sleepDateObj = new Date(calculatedSleepDate);
    return sleepDateObj >= weekStart && sleepDateObj <= weekEnd;
  });

  if (weekSleepSessions.length === 0) {
    console.log("📭 No sleep sessions found for this week");
    return;
  }

  // Create a map of sleep scores by day
  const scoreMap = {};
  dailySleep.forEach((d) => (scoreMap[d.day] = d.score));

  console.log(
    `\n😴 Processing ${weekSleepSessions.length} sleep sessions for week ${weekNumber}:`
  );
  let savedCount = 0;

  for (const session of weekSleepSessions) {
    try {
      // Calculate which day this sleep belongs to
      const calculatedSleepDate = calculateSleepDate(session.bedtime_start);

      // Determine wake category based on wake time
      const wakeTime = new Date(session.bedtime_end);
      const wakeHour = wakeTime.getHours();
      const wakeCategory = wakeHour < 7 ? "Early Bird" : "Sleep In";

      // Combine session data with score
      const sleepRecord = {
        ...session,
        sleepScore: scoreMap[session.day] || null,
        wakeCategory: wakeCategory,
        calculatedSleepDate: calculatedSleepDate,
        // Add calculated fields
        sleepDurationHours: (session.total_sleep_duration / 3600).toFixed(1),
        // Convert timestamps to readable format
        bedtimeFormatted: new Date(session.bedtime_start).toLocaleString(),
        wakeTimeFormatted: new Date(session.bedtime_end).toLocaleString(),
      };

      await notion.createSleepRecord(sleepRecord);
      savedCount++;

      const category =
        wakeCategory === "Early Bird" ? "☀️ Early Bird" : "🛌 Sleep In";
      const bedtime = new Date(session.bedtime_start);
      const bedtimeStr = bedtime.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      console.log(
        `✅ Saved ${calculatedSleepDate}: Bed ${bedtimeStr} | Score ${sleepRecord.sleepScore} | ${sleepRecord.sleepDurationHours}hrs | ${category}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to save sleep data for ${session.day}:`,
        error.message
      );
    }
  }

  console.log(
    `\n✅ Successfully saved ${savedCount}/${weekSleepSessions.length} sleep sessions to Notion!`
  );
  console.log(
    "🎯 Next: Run create-calendar-events.js to add them to your calendar"
  );
}

main().catch(console.error);
