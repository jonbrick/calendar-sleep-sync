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
  weeks.slice(0, 5).forEach((week) => {
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

  // Fetch Oura dates for Night of dates
  // Week 25 nights (June 15-21) = Oura dates (June 16-22)
  const fetchStart = new Date(weekStart);
  fetchStart.setDate(fetchStart.getDate() + 1); // Oura day = Night of + 1
  const fetchEnd = new Date(weekEnd);
  fetchEnd.setDate(fetchEnd.getDate() + 2); // End + 1 for Oura day + 1 buffer

  // Convert dates to YYYY-MM-DD format for Oura API
  const startDate = fetchStart.toISOString().split("T")[0];
  const endDate = fetchEnd.toISOString().split("T")[0];

  console.log(
    `🔄 Fetching Oura dates ${startDate} to ${endDate} for Night of ${weekStart.toDateString()} - ${weekEnd.toDateString()}`
  );

  // Fetch sleep sessions from Oura
  const sleepSessions = await oura.getSleepSessions(startDate, endDate);

  if (sleepSessions.length === 0) {
    console.log("📭 No sleep sessions found for this week");
    return;
  }

  console.log("\n😴 Processing sleep sessions:");
  let savedCount = 0;
  let skippedCount = 0;

  for (const session of sleepSessions) {
    try {
      // Let Notion client handle the Night of Date calculation
      const transformedData = notion.transformSleepToNotion(session);

      // We already fetched the right Oura dates, so process all sessions
      console.log(
        `✅ Processing Night of ${transformedData["Night of"].title[0].text.content} from Oura Date ${session.day}`
      );

      await notion.createSleepRecord(session);
      savedCount++;

      const duration = transformedData["Sleep Duration"].number;
      const efficiency = session.efficiency;
      const calendar = transformedData["Google Calendar"].select.name;

      console.log(
        `✅ Saved ${transformedData["Night of"].title[0].text.content}: ${duration}hrs | ${efficiency}% efficiency | ${calendar}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to save sleep data for ${session.day}:`,
        error.message
      );
    }
  }

  console.log(
    `\n✅ Successfully saved ${savedCount} sleep sessions to Notion!`
  );
  if (skippedCount > 0) {
    console.log(`ℹ️  Skipped ${skippedCount} sessions outside the target week`);
  }
  console.log(
    "🎯 Next: Run create-calendar-events.js to add them to your calendar"
  );
}

main().catch(console.error);
