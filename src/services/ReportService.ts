import { UserActivityRepository } from '../repositories/UserActivityRepository';
import { PlayerRepository } from '../repositories/PlayerRepository';
import { SlackService } from './SlackService';
import { scheduleJob } from 'node-schedule';

export class ReportService {
  private userActivityRepository: UserActivityRepository;
  private playerRepository: PlayerRepository;

  constructor(userActivityRepository: UserActivityRepository, playerRepository: PlayerRepository) {
    this.userActivityRepository = userActivityRepository;
    this.playerRepository = playerRepository;
  }

  scheduleDailyReport(): void {
    scheduleJob('59 23 * * *', this.sendDailyReport.bind(this));
  }

  scheduleWeeklyReport(): void {
    scheduleJob('59 23 * * 0', this.sendWeeklyReport.bind(this));
  }

  private async sendDailyReport(): Promise<void> {
    const userTimes = await this.userActivityRepository.calculateDailyUserTime();
    const message = this.formatRankingMessage('本日の入室時間ランキング', userTimes);
    await SlackService.sendNotification(message);
  }

  private async sendWeeklyReport(): Promise<void> {
    const weeklyRanking = await this.userActivityRepository.calculateWeeklyUserTime();
    const message = this.formatRankingMessage('今週の入室時間ランキング', weeklyRanking);
    await SlackService.sendNotification(message);
  }

  private formatRankingMessage(title: string, ranking: { [playerId: string]: number } | { name: string, duration: number }[]): string {
    let sortedUsers: { name: string, time: number }[];

    if (Array.isArray(ranking)) {
      sortedUsers = ranking.map(entry => ({ name: entry.name, time: entry.duration }));
    } else {
      sortedUsers = Object.entries(ranking)
        .map(([playerId, time]) => ({
          name: this.playerRepository.getPlayerName(playerId) || '不明なプレイヤー',
          time
        }))
        .sort((a, b) => b.time - a.time);
    }

    let message = `${title}：\n`;
    sortedUsers.forEach((user, index) => {
      message += `${index + 1}. ${user.name}: ${Math.floor(user.time / 60)}時間${user.time % 60}分\n`;
    });

    return message;
  }
}
