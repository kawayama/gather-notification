# Gatherの入退室通知ツール

## 概要

- [Gather](https://app.gather.town/app)というオンラインワークスペースの入退室をSlackで通知する

## 通知例

```plaintext
「川口」が入室しました。
ルームにいるプレイヤー: 川口
```

```plaintext
「川口」が退出しました。
ルームにいるプレイヤー:
```

## セットアップ

- `.env` ファイルが必要
    - `GATHER_API_KEY`: https://app.gather.town/apikeys から取得できる
    - `GATHER_SPACE_ID`: スペースのURL https://app.gather.town/app/XXX/YYY -> `XXXX\YYY` (スラッシュではなくバックスラッシュに変える)
    - `SLACK_WEBHOOK_URL`: https://ipsr-ylab.slack.com/apps/A0F7XDUAZ--incoming-webhook-?tab=more_info から設定

```ini
GATHER_API_KEY="XXX"
GATHER_SPACE_ID="XXX\YYY"
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXX/XXX/XXX"
```

## 起動

```bash
npm run dev
```
