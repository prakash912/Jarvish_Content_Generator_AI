import { Telegraf } from "telegraf";
import userModel from "./src/models/User.js";

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
  console.log(ctx.update.message.from, "ctx");
  console.log("hello i am jarvi");
  const from = ctx.update.message.from;
  try {
    await userModel.findOneAndUpdate(
      { tgId: from.id },
      {
        $setOnInsert: {
          firstName: from.first_name,
          lastName: from.last_name,
          isBot: from.is_bot,
          userName: from.username,
        },
      },
      { upsert: true, new: true }
    );
    //store user information into DB
    await ctx.reply(
      `Hey ${from.first_name},Welcome. I will be writing highly engaging social media posts fro you. Just Keep feeding me with the events throught the day.Let's shine on social media.`
    );
  } catch (err) {
    console.log(err, "err");
    await ctx.reply("Facing Difficulties");
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
