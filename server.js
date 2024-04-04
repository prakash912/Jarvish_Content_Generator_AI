import { Telegraf } from "telegraf";
import userModel from "./src/models/User.js";
import eventModel from "./src/models/Event.js";
import connectDb from "./src/config/db.js";
import { message } from "telegraf/filters";

const bot = new Telegraf(process.env.BOT_TOKEN);

try {
  connectDb();
  console.log("Database Connected Successfully");
} catch (err) {
  console.log(err);
  process.kill(process.pid, "SIGTERM");
}

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

bot.command("generate", async (ctx) => {
  const from = ctx.update.message.from;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  //get the events for user
  const events = await eventModel.find({
    tgId: from.id,
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  if (events.length === 0) {
    await ctx.reply("No Events for the day");
    return;
  }

  // make open api call
  // store token count
  // send response

  await ctx.reply("Doing Things...");
});

bot.on(message("text"), async (ctx) => {
  const from = ctx.update.message.from;
  const message = ctx.update.message.text;
  console.log(ctx);
  try {
    await eventModel.create({
      text: message,
      tgId: from.id,
    });
    ctx.reply(
      "Noted, Keep texting me your thoughts.To generate the posts, just enter the command: /generate"
    );
  } catch (err) {
    console.log(err);
    await ctx.reply("Facing difficuties, please try again later.");
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
