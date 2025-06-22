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
  const endDate = weekEnd.toISOString().split("T")[0];

  // Fetch both sleep sessions and daily sleep data
  console.log("🔄 Fetching sleep data from Oura...");
  const [sleepSessions, dailySleep] = await Promise.all([
    oura.getSleepSessions(startDate, endDate),
    oura.getDailySleep(startDate, endDate),
  ]);

  if (sleepSessions.length === 0) {
    console.log("📭 No sleep sessions found for this week");
    return;
  }

  // Create a map of sleep scores by day
  const scoreMap = {};
  dailySleep.forEach((d) => (scoreMap[d.day] = d.score));

  console.log("\n😴 Processing sleep sessions:");
  let savedCount = 0;

  for (const session of sleepSessions) {
    try {
      // Determine wake category based on wake time
      const wakeTime = new Date(session.bedtime_end);
      const wakeHour = wakeTime.getHours();
      const wakeCategory = wakeHour < 7 ? "Normal Wake Up" : "Sleep In";

      // Combine session data with score
      const sleepRecord = {
        ...session,
        sleepScore: scoreMap[session.day] || null,
        wakeCategory: wakeCategory,
        // Add calculated fields
        sleepDurationHours: (session.total_sleep_duration / 3600).toFixed(1),
        // Convert timestamps to readable format
        bedtimeFormatted: new Date(session.bedtime_start).toLocaleString(),
        wakeTimeFormatted: new Date(session.bedtime_end).toLocaleString(),
      };

      await notion.createSleepRecord(sleepRecord);
      savedCount++;

      const category =
        wakeCategory === "Normal Wake Up" ? "☀️ Normal Wake Up" : "🛌 Sleep In";
      console.log(
        `✅ Saved ${session.day}: Score ${sleepRecord.sleepScore} | ${sleepRecord.sleepDurationHours}hrs | ${category}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to save sleep data for ${session.day}:`,
        error.message
      );
    }
  }

  console.log(
    `\n✅ Successfully saved ${savedCount}/${sleepSessions.length} sleep sessions to Notion!`
  );
  console.log(
    "🎯 Next: Run create-calendar-events.js to add them to your calendar"
  );
}

main().catch(console.error);
