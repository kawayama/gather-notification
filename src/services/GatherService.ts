import { Game } from "@gathertown/gather-game-client";
import { GATHER_API_KEY, GATHER_SPACE_ID } from '../config';
import { PlayerRepository } from '../repositories/PlayerRepository';
import { SlackService } from './SlackService';
import { GameEventContext } from "@gathertown/gather-game-client/dist/src/GameEventContexts";
import { UserActivityRepository } from '../repositories/UserActivityRepository';
import { ReportService } from './reportService';

global.WebSocket = require("isomorphic-ws");

export class GatherService {
  private game: Game;
  private playerRepository: PlayerRepository;
  private userActivityRepository: UserActivityRepository;
  private isProcessingJoin: boolean = false;
  private isProcessingExit: boolean = false;
  private dailyReportService: ReportService;

  constructor() {
    this.game = new Game(GATHER_SPACE_ID, () => Promise.resolve({ apiKey: GATHER_API_KEY }));
    this.playerRepository = new PlayerRepository();
    this.userActivityRepository = new UserActivityRepository();
    this.dailyReportService = new ReportService(this.userActivityRepository, this.playerRepository);
  }

  connect(): void {
    this.game.connect();
    this.subscribeToEvents();
    this.dailyReportService.scheduleDailyReport();
    this.dailyReportService.scheduleWeeklyReport(); // 週次レポートのスケジュールを追加
  }

  private subscribeToEvents(): void {
    this.game.subscribeToConnection((connected) => {
      console.log({ connected });

      this.game.subscribeToEvent("playerJoins", this.handlePlayerJoins.bind(this));
      this.game.subscribeToEvent("playerExits", this.handlePlayerExits.bind(this));
    });
  }

  private async handlePlayerJoins(data: any, context: GameEventContext): Promise<void> {
    if (this.isProcessingJoin) return;
    this.isProcessingJoin = true;

    try {
      const playerId = context.playerId;
      if (!playerId) {
        console.error("プレイヤーIDが取得できませんでした。");
        return;
      }

      if (context.player?.name) {
        this.playerRepository.setPlayerName(playerId, context.player.name);
      }

      const playerName = this.playerRepository.getPlayerName(playerId) || "不明なプレイヤー";
      this.userActivityRepository.addActivity(playerId, playerName, 'join');
      await SlackService.sendNotification(`「${playerName}」が入室しました。\nルームにいるプレイヤー: ${this.getPlayerNames()}`);
      console.log(`プレイヤーの入室通知を送信しました: ${playerName}`);
    } finally {
      setTimeout(() => {
        this.isProcessingJoin = false;
      }, 1000); // 1秒後にフラグをリセット
    }
  }

  private async handlePlayerExits(data: any, context: GameEventContext): Promise<void> {
    if (this.isProcessingExit) return;
    this.isProcessingExit = true;

    try {
      const playerId = context.playerId;
      if (!playerId) {
        console.error("プレイヤーIDが取得できませんでした。");
        return;
      }

      if (context.player?.name) {
        this.playerRepository.setPlayerName(playerId, context.player.name);
      }

      const playerName = this.playerRepository.getPlayerName(playerId) || "不明なプレイヤー";
      this.userActivityRepository.addActivity(playerId, playerName, 'exit');
      await SlackService.sendNotification(`「${playerName}」が退出しました。\nルームにいるプレイヤー: ${this.getPlayerNames()}`);
      console.log(`${playerName}の退出通知を送信しました`);
    } finally {
      setTimeout(() => {
        this.isProcessingExit = false;
      }, 1000); // 1秒後にフラグをリセット
    }
  }

  private getPlayerNames(): string {
    return Object.keys(this.game.players)
      .map((key) => this.playerRepository.getPlayerName(key) || "不明なプレイヤー")
      .join(', ');
  }
}
