import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
  console.log(ctx.update.message.from, "ctx");
  console.log("hello i am jarvi");

  //store user information into DB
  await ctx.reply("hello i am jarvis");
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
