const OuraClient = require("./lib/oura-client.js");
const NotionClient = require("./lib/notion-client.js");
const {
  getWeekBoundaries,
  generateWeekOptions,
  parseDateDDMMYY,
  getSingleDayBoundaries,
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

  // Ask user for selection method
  console.log("\n📅 Choose your selection method:");
  console.log("  1. Enter a specific Night of Date (DD-MM-YY format)");
  console.log("  2. Select by week number (current behavior)");

  const selectionMethod = await askQuestion("? Choose option (1 or 2): ");

  let weekStart, weekEnd;

  if (selectionMethod === "1") {
    // Date-based selection
    const dateInput = await askQuestion(
      "? Enter Night of Date in DD-MM-YY format (e.g., 15-03-25): "
    );

    try {
      const selectedDate = parseDateDDMMYY(dateInput);
      const boundaries = getSingleDayBoundaries(selectedDate);
      weekStart = boundaries.dayStart;
      weekEnd = boundaries.dayEnd;

      // Calculate the corresponding Oura date (Night of + 1)
      const ouraDate = new Date(selectedDate);
      ouraDate.setDate(ouraDate.getDate() + 1);

      console.log(
        `\n📊 Collecting sleep data for Night of ${selectedDate.toDateString()}`
      );
      console.log(`🌙 Night of Date: ${selectedDate.toDateString()}`);
      console.log(
        `📱 Oura Date: ${ouraDate.toDateString()} (${
          ouraDate.toISOString().split("T")[0]
        })\n`
      );
    } catch (error) {
      console.log(`❌ ${error.message}`);
      process.exit(1);
    }
  } else if (selectionMethod === "2") {
    // Week-based selection (current behavior)
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

    const boundaries = getWeekBoundaries(2025, weekNumber);
    weekStart = boundaries.weekStart;
    weekEnd = boundaries.weekEnd;

    console.log(`\n📊 Collecting sleep data for Week ${weekNumber}`);
    console.log(
      `📅 Date range: ${weekStart.toDateString()} - ${weekEnd.toDateString()}\n`
    );
  } else {
    console.log("❌ Invalid option. Please choose 1 or 2.");
    process.exit(1);
  }

  // Confirmation step
  console.log("\n📋 Summary:");

  if (selectionMethod === "1") {
    console.log(`📊 Single day operation`);
    console.log(`🌙 Night of Date: ${weekStart.toDateString()}`);

    // Calculate and show Oura date for single day
    const ouraDate = new Date(weekStart);
    ouraDate.setDate(ouraDate.getDate() + 1);
    console.log(
      `📱 Oura Date: ${ouraDate.toDateString()} (${
        ouraDate.toISOString().split("T")[0]
      })`
    );
  } else {
    console.log(
      `📊 Total days: ${Math.ceil(
        (weekEnd - weekStart) / (1000 * 60 * 60 * 24)
      )} days`
    );
    console.log(
      `📅 Night of Date range: ${weekStart.toDateString()} - ${weekEnd.toDateString()}`
    );
  }

  const confirm = await askQuestion(
    "\n? Proceed with collecting sleep data for this period? (y/n): "
  );

  if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
    console.log("❌ Operation cancelled.");
    rl.close();
    return;
  }

  rl.close();

  // Fetch Oura dates for Night of dates
  // For single day: Night of date = Oura date + 1
  // For week: Week nights (June 15-21) = Oura dates (June 16-22)
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
