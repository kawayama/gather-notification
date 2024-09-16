import { Database as SQLite3Database } from 'sqlite3';
import { open, Database } from 'sqlite';
import { differenceInMinutes, startOfWeek, endOfWeek, startOfDay, addDays } from 'date-fns';

interface UserActivity {
  playerId: string;
  playerName: string;
  action: 'join' | 'exit';
  timestamp: Date;
}

export class UserActivityRepository {
  private db: Database | null = null;

  constructor(dbPath: string = 'data/userActivities.sqlite') {
    this.initializeDatabase(dbPath);
  }

  private async initializeDatabase(dbPath: string): Promise<void> {
    try {
      // プロジェクトからの絶対パスで指定する
      this.db = await open({
        filename: dbPath,
        driver: SQLite3Database
      });

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          playerId TEXT,
          playerName TEXT,
          action TEXT,
          timestamp DATETIME
        )
      `);
    } catch (error) {
      console.error('データベースの初期化中にエラーが発生しました:', error);
    }
  }

  async addActivity(playerId: string, playerName: string, action: 'join' | 'exit'): Promise<void> {
    this.ensureDbInitialized();
    await this.db!.run(
      'INSERT INTO user_activities (playerId, playerName, action, timestamp) VALUES (?, ?, ?, ?)',
      [playerId, playerName, action, new Date().toISOString()]
    );
  }

  async getActivities(): Promise<UserActivity[]> {
    this.ensureDbInitialized();
    const activities = await this.db!.all<UserActivity[]>('SELECT * FROM user_activities');
    return activities.map(activity => ({
      ...activity,
      timestamp: new Date(activity.timestamp)
    }));
  }

  async calculateDailyUserTime(): Promise<{ [playerId: string]: number }> {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    return this.calculateUserTime(today, tomorrow);
  }

  async calculateWeeklyUserTime(): Promise<{ [playerId: string]: number }> {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // 月曜日を週の始まりとする
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return this.calculateUserTime(weekStart, weekEnd);
  }

  private async calculateUserTime(startDate: Date, endDate: Date): Promise<{ [playerId: string]: number }> {
    this.ensureDbInitialized();
    const activities = await this.db!.all<UserActivity[]>(
      'SELECT * FROM user_activities WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
      [startDate.toISOString(), endDate.toISOString()]
    );

    const userTimes: { [playerId: string]: number } = {};
    const lastJoinActivity: { [playerId: string]: UserActivity } = {};

    activities.forEach((activity) => {
      const activityTime = new Date(activity.timestamp);

      if (activity.action === 'join') {
        // 既存のjoinアクティビティがある場合、それを終了させる
        if (lastJoinActivity[activity.playerId]) {
          const duration = differenceInMinutes(activityTime, new Date(lastJoinActivity[activity.playerId].timestamp));
          userTimes[activity.playerId] = (userTimes[activity.playerId] || 0) + duration;
        }
        lastJoinActivity[activity.playerId] = activity;
      } else if (activity.action === 'exit') {
        const joinActivity = lastJoinActivity[activity.playerId];
        if (joinActivity) {
          const duration = differenceInMinutes(activityTime, new Date(joinActivity.timestamp));
          userTimes[activity.playerId] = (userTimes[activity.playerId] || 0) + duration;
          delete lastJoinActivity[activity.playerId];
        }
      }
    });

    // 未終了のセッションを処理
    Object.entries(lastJoinActivity).forEach(([playerId, joinActivity]) => {
      const duration = differenceInMinutes(endDate, new Date(joinActivity.timestamp));
      userTimes[playerId] = (userTimes[playerId] || 0) + duration;
    });

    return userTimes;
  }

  private ensureDbInitialized(): void {
    if (!this.db) {
      throw new Error('データベースが初期化されていません');
    }
  }
}
