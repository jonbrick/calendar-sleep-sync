const NotionClient = require("./lib/notion-client.js");
const CalendarClient = require("./lib/calendar-client.js");
const {
  getWeekBoundaries,
  generateWeekOptions,
} = require("./lib/week-utils.js");
const readline = require("readline");

// Create clients
const notion = new NotionClient();
const calendar = new CalendarClient();

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
  console.log("🗓️ Calendar Event Creator 2025\n");

  // Test connections
  console.log("Testing connections...");
  const notionOk = await notion.testConnection();
  const calendarOk = await calendar.testConnection();

  if (!notionOk || !calendarOk) {
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
    "? Which week to create calendar events? (enter week number): "
  );
  const weekNumber = parseInt(weekInput);

  if (weekNumber < 1 || weekNumber > 52) {
    console.log("❌ Invalid week number");
    process.exit(1);
  }

  rl.close();

  const { weekStart, weekEnd } = getWeekBoundaries(2025, weekNumber);
  console.log(`\n📊 Creating calendar events for Week ${weekNumber}`);
  console.log(
    `📅 Date range: ${weekStart.toDateString()} - ${weekEnd.toDateString()}\n`
  );

  // Get workouts from Notion
  const workouts = await notion.getWorkoutsForWeek(weekStart, weekEnd);

  if (workouts.length === 0) {
    console.log("📭 No workouts found without calendar events for this week");
    console.log(
      "💡 Try running collect-workouts.js first to gather workout data"
    );
    return;
  }

  console.log("\n🗓️ Creating calendar events:");
  let createdCount = 0;

  for (const workout of workouts) {
    try {
      await calendar.createWorkoutEvent(workout);
      await notion.markCalendarCreated(workout.id);
      createdCount++;
    } catch (error) {
      console.error(
        `❌ Failed to create calendar event for ${workout.activityName}:`,
        error.message
      );
    }
  }

  console.log(
    `\n✅ Successfully created ${createdCount}/${workouts.length} calendar events!`
  );
  console.log("🎯 Check your fitness calendar to see the workouts!");
}

main().catch(console.error);
