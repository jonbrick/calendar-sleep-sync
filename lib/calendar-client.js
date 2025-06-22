const { google } = require("googleapis");
require("dotenv").config();

class CalendarClient {
  constructor() {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    this.auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    this.calendar = google.calendar({ version: "v3", auth: this.auth });

    // Two calendar IDs for sleep categorization
    this.normalWakeUpCalendarId = process.env.NORMAL_WAKE_UP_CALENDAR_ID;
    this.sleepInCalendarId = process.env.SLEEP_IN_CALENDAR_ID;
  }

  async testConnection() {
    try {
      const calendars = await this.calendar.calendarList.list();
      console.log("✅ Google Calendar connection successful!");
      console.log(`📅 Found ${calendars.data.items.length} calendars`);

      // Test access to our sleep calendars
      const normalCal = calendars.data.items.find(
        (cal) => cal.id === this.normalWakeUpCalendarId
      );
      const sleepCal = calendars.data.items.find(
        (cal) => cal.id === this.sleepInCalendarId
      );

      if (normalCal)
        console.log(`☀️ Normal Wake Up calendar: ${normalCal.summary}`);
      if (sleepCal) console.log(`🛌 Sleep In calendar: ${sleepCal.summary}`);

      return true;
    } catch (error) {
      console.error("❌ Calendar connection failed:", error.message);
      return false;
    }
  }

  async createSleepEvent(sleepRecord) {
    try {
      // Parse bedtime and wake time
      const bedtime = new Date(sleepRecord.bedtime);
      const wakeTime = new Date(sleepRecord.wakeTime);

      const title = this.formatEventTitle(sleepRecord);
      const description = this.formatEventDescription(sleepRecord);

      // Choose calendar based on wake time category
      const calendarId =
        sleepRecord.googleCalendar === "Normal Wake Up"
          ? this.normalWakeUpCalendarId
          : this.sleepInCalendarId;

      const event = {
        summary: title,
        description: description,
        start: { dateTime: bedtime.toISOString() },
        end: { dateTime: wakeTime.toISOString() },
      };

      const response = await this.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });

      console.log(
        `✅ Created calendar event: ${title} on ${sleepRecord.googleCalendar} calendar`
      );
      return response;
    } catch (error) {
      console.error("❌ Error creating calendar event:", error.message);
      throw error;
    }
  }

  formatEventTitle(sleepRecord) {
    const efficiency = sleepRecord.efficiency;
    const duration = sleepRecord.sleepDuration;
    return `Sleep - ${duration}hrs (${efficiency}% efficiency)`;
  }

  formatEventDescription(sleepRecord) {
    let description = `😴 Night of ${sleepRecord.nightOf}\n`;
    description += `⏱️ Duration: ${sleepRecord.sleepDuration} hours\n`;
    description += `📊 Efficiency: ${sleepRecord.efficiency}%\n\n`;

    description += `🛌 Sleep Stages:\n`;
    description += `• Deep Sleep: ${sleepRecord.deepSleep} min\n`;
    description += `• REM Sleep: ${sleepRecord.remSleep} min\n`;
    description += `• Light Sleep: ${sleepRecord.lightSleep} min\n`;
    description += `• Awake Time: ${sleepRecord.awakeTime} min\n\n`;

    description += `❤️ Biometrics:\n`;
    description += `• Avg Heart Rate: ${sleepRecord.avgHR} bpm\n`;
    description += `• Low Heart Rate: ${sleepRecord.lowHR} bpm\n`;
    description += `• HRV: ${sleepRecord.hrv} ms\n`;
    description += `• Respiratory Rate: ${sleepRecord.respiratoryRate} breaths/min\n\n`;

    description += `🔗 Sleep ID: ${sleepRecord.sleepId}`;

    return description;
  }
}

module.exports = CalendarClient;
