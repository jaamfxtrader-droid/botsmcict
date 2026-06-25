import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Context, Markup, Telegraf } from 'telegraf';

type DetailKey =
  | 'vip_details'
  | 'vip_plans'
  | 'account_details'
  | 'account_plans'
  | 'mentorship_details'
  | 'mentorship_plans';

const token = process.env.TG_TOKEN || process.env.BOT_TOKEN;
const adminId = Number(process.env.ADMIN_ID || '0');
const miniAppUrl = (process.env.MINI_APP_URL || 'https://smcict.com').replace(/\/$/, '');
const subscribersFile = path.join(process.cwd(), 'subscribers.json');

if (!token) {
  throw new Error('Missing bot token. Set TG_TOKEN in Railway variables or .env.');
}

function loadSubscribers(): number[] {
  if (!fs.existsSync(subscribersFile)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(subscribersFile, 'utf8')) as number[];
  } catch (error) {
    console.error('Failed to load subscribers:', error);
    return [];
  }
}

function saveSubscribers(subscribers: number[]): void {
  try {
    fs.writeFileSync(subscribersFile, JSON.stringify(subscribers, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save subscribers:', error);
  }
}

function addSubscriber(userId: number): void {
  const subscribers = loadSubscribers();
  if (!subscribers.includes(userId)) {
    subscribers.push(userId);
    saveSubscribers(subscribers);
  }
}

const bot = new Telegraf<Context>(token);

const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('VIP', 'menu_vip')],
  [Markup.button.callback('Account Management', 'menu_account')],
  [Markup.button.callback('Personal Mentorship', 'menu_mentorship')],
  [Markup.button.callback('Payment Methods', 'menu_payment')],
  [Markup.button.callback('Contact Admin', 'menu_contact')]
]);

const backButton = Markup.button.callback('Back to Main Menu', 'main_menu');

function categoryMenu(action: 'account' | 'mentorship') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Details', `${action}_details`)],
    [Markup.button.callback('Plans / Pricing', `${action}_plans`)],
    [backButton]
  ]);
}

function vipMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.webApp('Open Mini App', `${miniAppUrl}/vip`)],
    [Markup.button.callback('VIP Details', 'vip_details')],
    [Markup.button.callback('VIP Plans / Pricing', 'vip_plans')],
    [backButton]
  ]);
}

async function replyOrEdit(ctx: Context, text: string, markup: ReturnType<typeof Markup.inlineKeyboard>) {
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, markup);
    } catch {
      await ctx.reply(text, markup);
    }
    await ctx.answerCbQuery();
    return;
  }

  await ctx.reply(text, markup);
}

async function sendMainMenu(ctx: Context) {
  if (ctx.from?.id) {
    addSubscriber(ctx.from.id);
  }

  await replyOrEdit(
    ctx,
    'Assalamualaikum!\n\nWelcome to SMC ICT bot. Neeche menu se apni service select karein:',
    mainMenu
  );
}

async function sendVipMenu(ctx: Context) {
  await replyOrEdit(
    ctx,
    'VIP section select ho gaya.\n\nMini app open karne ke liye button press karein, ya details/plans dekh lein.',
    vipMenu()
  );
}

async function sendAccountMenu(ctx: Context) {
  await replyOrEdit(
    ctx,
    'Account Management\n\nAgar aap account management service chahte hain to option select karein.',
    categoryMenu('account')
  );
}

async function sendMentorshipMenu(ctx: Context) {
  await replyOrEdit(
    ctx,
    'Personal Mentorship\n\nMentorship ke liye details ya plans select karein.',
    categoryMenu('mentorship')
  );
}

async function sendPaymentMenu(ctx: Context) {
  await replyOrEdit(
    ctx,
    'Payment Methods\n\nPayment confirmation ke liye admin se contact karein.\n\nAdmin: @Xauforexadmin',
    Markup.inlineKeyboard([[backButton]])
  );
}

async function sendContactMenu(ctx: Context) {
  await replyOrEdit(
    ctx,
    'Contact Admin\n\nAdmin: @Xauforexadmin\n\nApni required service ka naam send karein.',
    Markup.inlineKeyboard([[backButton]])
  );
}

const detailText: Record<DetailKey, string> = {
  vip_details:
    'VIP Details\n\n- Premium signals\n- Market updates\n- Private access\n- Fast support\n\nMini app ke liye VIP menu se Open Mini App press karein.',
  vip_plans:
    'VIP Plans / Pricing\n\nApna package confirm karne ke liye admin se rabta karein.\n\nAdmin: @Xauforexadmin',
  account_details:
    'Account Management Details\n\n- Risk-managed trading\n- Weekly progress updates\n- Profit sharing discussion with admin',
  account_plans:
    'Account Management Plans\n\nCapital aur risk profile ke hisaab se plan set hota hai.\n\nAdmin: @Xauforexadmin',
  mentorship_details:
    'Personal Mentorship Details\n\n- One-to-one guidance\n- Trading concepts\n- Live market support\n- Practice plan',
  mentorship_plans:
    'Personal Mentorship Plans\n\nBatch aur one-to-one slots ke liye admin se availability confirm karein.\n\nAdmin: @Xauforexadmin'
};

bot.start(sendMainMenu);
bot.command('menu', sendMainMenu);
bot.command('vip', sendVipMenu);

bot.command('broadcast', async (ctx) => {
  if (!adminId || ctx.from.id !== adminId) {
    return ctx.reply('Aap admin nahi ho.');
  }

  const text = ctx.message.text.replace(/^\/broadcast\s*/i, '').trim();
  if (!text) {
    return ctx.reply('Use: /broadcast <message>');
  }

  const subscribers = loadSubscribers();
  let sent = 0;

  for (const chatId of subscribers) {
    try {
      await ctx.telegram.sendMessage(chatId, text);
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Broadcast failed for ${chatId}:`, message);
    }
  }

  return ctx.reply(`Broadcast sent to ${sent} subscribers.`);
});

bot.action('main_menu', sendMainMenu);
bot.action('menu_vip', sendVipMenu);
bot.action('menu_account', sendAccountMenu);
bot.action('menu_mentorship', sendMentorshipMenu);
bot.action('menu_payment', sendPaymentMenu);
bot.action('menu_contact', sendContactMenu);

bot.action(Object.keys(detailText), async (ctx) => {
  const data = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
  if (!data || !(data in detailText)) {
    await ctx.answerCbQuery();
    return;
  }

  await replyOrEdit(ctx, detailText[data as DetailKey], Markup.inlineKeyboard([[backButton]]));
});

bot.catch((error) => {
  console.error('Bot error:', error);
});

bot.launch().then(() => {
  console.log('Bot started.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
