import * as fs from 'fs';
import * as path from 'path';

export class PlayerRepository {
  private playerNames: Map<string, string> = new Map();
  private readonly filePath: string;

  constructor() {
    this.filePath = path.join(__dirname, '../../data/playerNames.json');
    this.loadData();
  }

  private loadData(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const jsonData = JSON.parse(data);
        this.playerNames = new Map(Object.entries(jsonData));
      }
    } catch (error) {
      console.error('プレイヤーデータの読み込みに失敗しました:', error);
    }
  }

  private saveData(): void {
    try {
      const dirPath = path.dirname(this.filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const jsonData = Object.fromEntries(this.playerNames);
      fs.writeFileSync(this.filePath, JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.error('プレイヤーデータの保存に失敗しました:', error);
    }
  }

  getPlayerName(playerId: string): string | undefined {
    return this.playerNames.get(playerId);
  }

  setPlayerName(playerId: string, playerName: string): void {
    this.playerNames.set(playerId, playerName);
    this.saveData();
  }

  removePlayerName(playerId: string): void {
    this.playerNames.delete(playerId);
    this.saveData();
  }
}
