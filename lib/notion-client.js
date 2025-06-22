const { Client } = require("@notionhq/client");
require("dotenv").config();

class NotionClient {
  constructor() {
    this.notion = new Client({ auth: process.env.NOTION_TOKEN });
    this.databaseId = process.env.NOTION_DATABASE_ID;
  }

  async testConnection() {
    try {
      const response = await this.notion.databases.retrieve({
        database_id: this.databaseId,
      });

      console.log("✅ Notion connection successful!");
      console.log(
        `📊 Database: ${response.title[0]?.plain_text || "Sleep Database"}`
      );
      return true;
    } catch (error) {
      console.error("❌ Notion connection failed:", error.message);
      return false;
    }
  }

  async createSleepRecord(sleepData) {
    try {
      const properties = this.transformSleepToNotion(sleepData);

      const response = await this.notion.pages.create({
        parent: { database_id: this.databaseId },
        properties,
      });

      console.log(
        `✅ Created sleep record for ${
          sleepData.calculatedSleepDate || sleepData.day
        }`
      );
      return response;
    } catch (error) {
      console.error("❌ Error creating sleep record:", error.message);
      throw error;
    }
  }

  transformSleepToNotion(sleep) {
    // Use calculated sleep date if available, otherwise fall back to day
    const sleepDate = sleep.calculatedSleepDate || sleep.day;
    const dateObj = new Date(sleepDate);

    // Format Long Sleep Name with full date and timezone
    const longSleepName =
      dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }) + " (ET)";

    // Parse timestamps
    const bedtime = new Date(sleep.bedtime_start);
    const wakeTime = new Date(sleep.bedtime_end);

    // Format times as simple readable format
    const bedtimeStr = bedtime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const wakeTimeStr = wakeTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return {
      "Long Sleep Name": {
        title: [
          {
            text: {
              content: longSleepName, // e.g., "Friday, May 17, 2025 (ET)"
            },
          },
        ],
      },
      Date: {
        date: { start: sleepDate }, // Keep as YYYY-MM-DD
      },
      Bedtime: {
        rich_text: [{ text: { content: bedtimeStr } }], // e.g., "10:30 PM"
      },
      "Wake Time": {
        rich_text: [{ text: { content: wakeTimeStr } }], // e.g., "5:45 AM"
      },
      "Sleep Duration": {
        number: parseFloat(sleep.sleepDurationHours),
      },
      "Sleep Score": {
        number: sleep.sleepScore || 0,
      },
      "Deep Sleep": {
        number: Math.round(sleep.deep_sleep_duration / 60),
      },
      "REM Sleep": {
        number: Math.round(sleep.rem_sleep_duration / 60),
      },
      "Light Sleep": {
        number: Math.round(sleep.light_sleep_duration / 60),
      },
      "Awake Time": {
        number: Math.round(sleep.awake_time / 60),
      },
      "Heart Rate Avg": {
        number: sleep.average_heart_rate || 0,
      },
      "Heart Rate Low": {
        number: sleep.lowest_heart_rate || 0,
      },
      HRV: {
        number: sleep.average_hrv || 0,
      },
      "Respiratory Rate": {
        number: sleep.average_breath || 0,
      },
      "Wake Category": {
        select: { name: sleep.wakeCategory },
      },
      "Sleep ID": {
        rich_text: [{ text: { content: sleep.id } }],
      },
      "Calendar Created": {
        checkbox: false,
      },
      // Remove Sleep Summary - no longer needed
    };
  }

  async getSleepForWeek(weekStart, weekEnd) {
    try {
      const startDateStr = weekStart.toISOString().split("T")[0];
      const endDateStr = weekEnd.toISOString().split("T")[0];

      console.log(
        `🔄 Reading sleep records from ${startDateStr} to ${endDateStr}`
      );

      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          and: [
            {
              property: "Date",
              date: { on_or_after: startDateStr },
            },
            {
              property: "Date",
              date: { on_or_before: endDateStr },
            },
            {
              property: "Calendar Created",
              checkbox: { equals: false },
            },
          ],
        },
        sorts: [{ property: "Date", direction: "ascending" }],
      });

      console.log(
        `📊 Found ${response.results.length} sleep sessions without calendar events`
      );
      return this.transformNotionToSleep(response.results);
    } catch (error) {
      console.error("❌ Error reading sleep records:", error.message);
      return [];
    }
  }

  transformNotionToSleep(notionPages) {
    return notionPages.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        date: props["Date"]?.date?.start,
        bedtime: props["Bedtime"]?.rich_text?.[0]?.plain_text,
        wakeTime: props["Wake Time"]?.rich_text?.[0]?.plain_text,
        sleepDuration: props["Sleep Duration"]?.number || 0,
        sleepScore: props["Sleep Score"]?.number || 0,
        deepSleep: props["Deep Sleep"]?.number || 0,
        remSleep: props["REM Sleep"]?.number || 0,
        lightSleep: props["Light Sleep"]?.number || 0,
        awakeTime: props["Awake Time"]?.number || 0,
        avgHR: props["Heart Rate Avg"]?.number || 0,
        lowHR: props["Heart Rate Low"]?.number || 0,
        hrv: props["HRV"]?.number || 0,
        respiratoryRate: props["Respiratory Rate"]?.number || 0,
        wakeCategory: props["Wake Category"]?.select?.name || "Unknown",
        sleepId: props["Sleep ID"]?.rich_text?.[0]?.plain_text,
      };
    });
  }

  async markCalendarCreated(sleepRecordId) {
    try {
      await this.notion.pages.update({
        page_id: sleepRecordId,
        properties: {
          "Calendar Created": { checkbox: true },
        },
      });
    } catch (error) {
      console.error("❌ Error marking calendar created:", error.message);
    }
  }
}

module.exports = NotionClient;
