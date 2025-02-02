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
  console.log("收到消息:", msg);
  try {
    // 处理带有图片和文字说明的消息
    if (msg.photo && msg.caption) {
      const photo = msg.photo[msg.photo.length - 1]; // 获取最高质量的图片
      await bot.sendPhoto("@viviandmeow", photo.file_id, {
        caption: '"' + msg.caption + '"' + " by vivi_bot",
      });
    }
    // 处理纯文本消息
    else if (msg.text) {
      await bot.sendMessage(
        "@viviandmeow",
        '"' + msg.text + '"' + " by vivi_bot"
      );
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
  // Twitter发送逻辑
  try {
    if (msg.photo) {
      // 获取图片文件
      const photo = msg.photo[msg.photo.length - 1];
      const file = await bot.getFile(photo.file_id);

      // 修改 fetch 请求，添加代理支持
      const fetch = await import("node-fetch");
      const response = await fetch.default(
        `https://api.telegram.org/file/bot${config.token}/${file.file_path}`,
        {
          agent: httpAgent, // 添加代理设置
        }
      );
      const buffer = await response.buffer();

      // 上传图片到 Twitter
      const mediaId = await twitterClient.v1.uploadMedia(buffer, {
        mimeType: "image/jpeg",
      });

      // 如果有文字说明，发送图片+文字，否则只发送图片
      if (msg.caption) {
        await twitterClient.v2.tweet({
          text: '"' + msg.caption + '"' + " by vivi_bot",
          media: { media_ids: [mediaId] },
        });
      } else {
        await twitterClient.v2.tweet({
          media: { media_ids: [mediaId] },
        });
      }
    }
    // 处理纯文本消息
    else if (msg.text) {
      await twitterClient.v2.tweet('"' + msg.text + '"' + " by vivi_bot");
    }
  } catch (error) {
    console.error("Error sending Twitter message:", error);
  }
});
