const TelegramBot = require("node-telegram-bot-api");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { TwitterApi } = require("twitter-api-v2");
const config = require("./config.json");

// 如果config.json不存在，则报错并退出
if (!config) {
  console.error("config.json 文件不存在");
  process.exit(1);
}

const httpAgent = new HttpsProxyAgent("http://127.0.0.1:7890"); // 替换为你的 HTTP 代理地址和端口

const bot = new TelegramBot(config.token, {
  polling: true,
  request: {
    timeout: 30000,
    agent: httpAgent,
  },
  baseApiUrl: "https://api.telegram.org",
});

const twitterClient = new TwitterApi(
  {
    appKey: config.appKey,
    appSecret: config.appSecret,
    accessToken: config.accessToken,
    accessSecret: config.accessSecret,
  },
  { httpAgent }
);

twitterClient.v2
  .me()
  .then((user) => {
    console.log("Twitter API 连接成功！", user);
  })
  .catch((error) => {
    console.error("Twitter API 连接失败", error);
  });

bot.on("polling_error", (error) => {
  console.error("Polling error details:");
});

bot.on("error", (error) => {
  console.error("General error:");
});

bot
  .getMe()
  .then((botInfo) => {
    console.log("Bot 连接成功！Bot 信息：");
  })
  .catch((error) => {
    console.error("获取 Bot 信息失败：");
    process.exit(1);
  });

bot.on("message", async (msg) => {
  console.log(msg.text);
  try {
    await bot.sendMessage(
      "@viviandmeow",
      '"' + (msg.text || "why bot cant work?") + '"' + " by vivi_bot"
    );
    await twitterClient.v2.tweet(
      '"' + (msg.text || "why bot cant work?") + '"' + " by vivi_bot"
    );
  } catch (error) {
    console.error("Error sending message:", error);
  }
});
