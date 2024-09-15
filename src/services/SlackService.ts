import axios from 'axios';
import { SLACK_WEBHOOK_URL } from '../config';

export class SlackService {
  static async sendNotification(message: string): Promise<void> {
    try {
      const response = await axios.post(SLACK_WEBHOOK_URL, { text: message }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Slack通知送信成功:', response.status);
    } catch (error: any) {
      console.error('Slackへの通知送信に失敗しました:', error.message);
    }
  }
}