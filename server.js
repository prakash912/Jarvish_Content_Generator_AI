import { Telegraf } from "telegraf";
import OpenAI from "openai";
import userModel from "./src/models/User.js";
import eventModel from "./src/models/Event.js";
import connectDb from "./src/config/db.js";
import { message } from "telegraf/filters";

const bot = new Telegraf(process.env.BOT_TOKEN);

const openai = new OpenAI({
  apiKey: process.env["OPENAI_KEY"],
});

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

  const { message_id: waitingMessageId } = await ctx.reply(
    `Hey! ${from.first_name}, Kindly wait for a moment. I am curating post for you`
  );
  const { message_id: loadingStickerMsgId } = await ctx.replyWithSticker(
    "CAACAgIAAxkBAAM9Zhq-JW8o_StoitS0WDGovQmm5o4AAvsAA_cCyA8GSjVk2K0orzQE"
  );
  // CAACAgIAAxkBAAM9Zhq-JW8o_StoitS0WDGovQmm5o4AAvsAA_cCyA8GSjVk2K0orzQE
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
    await ctx.deleteMessage(waitingMessageId);
    await ctx.deleteMessage(loadingStickerMsgId);
    await ctx.reply("No Events for the day");
    return;
  }

  // make open api call

  try {
    const chatComplition = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Act as a senior copywriter, you write highly engaging post for linkdin,fasebook and twitter using provided thoughts/events throught the day`,
        },
        {
          role: "user",
          content: `Write like a human, for humans. Craft three engaging social media posts tailored for Linkdin, Facebook, and Twitter audiances.Use simple language.Use given time labels just to understand the order of event, don't mention the time in the posts.Each post should creatively highlight the following events. Ensure the ton is conversational and impactful. Focus on engaging the respective platform's audiance, encouraging interaction , and driving intrest in the events: ${events
            .map((event) => event.text)
            .join(", ")}`,
        },
      ],
      model: process.env.OPENAI_MODEL,
    });

    //store token
    await userModel.findOneAndUpdate(
      {
        tgId: from.id,
      },
      {
        $inc: {
          promptTokens: chatComplition.usage.prompt_tokens,
          completionTokens: chatComplition.usage.completion_tokens,
        },
      }
    );
    await ctx.deleteMessage(waitingMessageId);
    await ctx.deleteMessage(loadingStickerMsgId);
    await ctx.reply(chatComplition.choices[0].message.content);
  } catch (err) {
    console.log("Facing error", err);
    await ctx.reply("Facing error");
  }
  // store token count
  // send response
});

bot.help((ctx) => {
  ctx.reply("For any support contact rai530579@gmail.com");
});

// bot.on(message("sticker"), (ctx) => {
//   console.log("sticker", ctx.update.message);
// });

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
