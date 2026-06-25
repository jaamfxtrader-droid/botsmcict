import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Context, Markup, Telegraf } from 'telegraf';

type DetailKey =
  | 'vip_details'
  | 'vip_plans'
  | 'funded_details'
  | 'funded_plans'
  | 'account_details'
  | 'account_plans'
  | 'mentorship_details'
  | 'mentorship_plans'
  | 'referral_details'
  | 'payment_details';

type ServiceKey = 'vip' | 'mentorship' | 'funded' | 'account' | 'referral' | 'payment';

type Service = {
  key: ServiceKey;
  label: string;
  path: string;
  intro: string;
  detailsKey: DetailKey;
  plansKey?: DetailKey;
};

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

const services: Record<ServiceKey, Service> = {
  vip: {
    key: 'vip',
    label: 'VIP',
    path: '/vip',
    intro: 'VIP section selected.\n\nTap the button to open the mini app, or view details and plans below.',
    detailsKey: 'vip_details',
    plansKey: 'vip_plans'
  },
  mentorship: {
    key: 'mentorship',
    label: 'Mentorship',
    path: '/mentorship',
    intro: 'Mentorship section selected.\n\nTap the button to open the mini app, or view details and plans below.',
    detailsKey: 'mentorship_details',
    plansKey: 'mentorship_plans'
  },
  funded: {
    key: 'funded',
    label: 'Funded',
    path: '/funded',
    intro: 'Funded section selected.\n\nTap the button to open the mini app, or view details and plans below.',
    detailsKey: 'funded_details',
    plansKey: 'funded_plans'
  },
  account: {
    key: 'account',
    label: 'Account Management',
    path: '/account-management',
    intro: 'Account Management section selected.\n\nTap the button to open the mini app, or view details and plans below.',
    detailsKey: 'account_details',
    plansKey: 'account_plans'
  },
  referral: {
    key: 'referral',
    label: 'Referral',
    path: '/referral',
    intro: 'Referral section selected.\n\nTap the button to open the mini app, or view the details below.',
    detailsKey: 'referral_details'
  },
  payment: {
    key: 'payment',
    label: 'Payment Method',
    path: '/payment-method',
    intro: 'Payment Method section selected.\n\nTap the button to open the mini app, or view the payment details below.',
    detailsKey: 'payment_details'
  }
};

const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('VIP', 'menu_vip')],
  [Markup.button.callback('Mentorship', 'menu_mentorship')],
  [Markup.button.callback('Funded', 'menu_funded')],
  [Markup.button.callback('Account Management', 'menu_account')],
  [Markup.button.callback('Referral', 'menu_referral')],
  [Markup.button.callback('Payment Method', 'menu_payment')]
]);

const backButton = Markup.button.callback('Back to Main Menu', 'main_menu');
const adminButton = Markup.button.url('Contact Admin', 'https://t.me/xauforexadmin');

function serviceUrl(pathname: string) {
  return `${miniAppUrl}${pathname}`;
}

function serviceMenu(service: Service) {
  const rows: any[][] = [
    [Markup.button.webApp('Open Mini App', serviceUrl(service.path))],
    [Markup.button.callback(`${service.label} Details`, service.detailsKey)]
  ];

  if (service.plansKey) {
    rows.push([Markup.button.callback(`${service.label} Plans / Pricing`, service.plansKey)]);
  }

  rows.push([adminButton]);
  rows.push([backButton]);
  return Markup.inlineKeyboard(rows);
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
    'Welcome to the SMC ICT bot.\n\nPlease select a service from the menu below:',
    mainMenu
  );
}

async function sendVipMenu(ctx: Context) {
  await sendServiceMenu(ctx, 'vip');
}

async function sendAccountMenu(ctx: Context) {
  await sendServiceMenu(ctx, 'account');
}

async function sendMentorshipMenu(ctx: Context) {
  await sendServiceMenu(ctx, 'mentorship');
}

async function sendPaymentMenu(ctx: Context) {
  await sendServiceMenu(ctx, 'payment');
}

async function sendFundedMenu(ctx: Context) {
  await sendServiceMenu(ctx, 'funded');
}

async function sendReferralMenu(ctx: Context) {
  await sendServiceMenu(ctx, 'referral');
}

async function sendServiceMenu(ctx: Context, key: ServiceKey) {
  const service = services[key];
  await replyOrEdit(ctx, service.intro, serviceMenu(service));
}

const detailText: Record<DetailKey, string> = {
  vip_details:
    'VIP Details\n\n- Premium signals\n- Market updates\n- Private access\n- Priority support\n\nTo access the mini app, select Open Mini App from the VIP menu.',
  vip_plans:
    'VIP Plans / Pricing\n\n- Monthly: $75\n- Yearly: $170\n- Lifetime: $300\n\nPlease contact the admin to confirm your plan.\n\nAdmin: @xauforexadmin',
  funded_details:
    'Funded Details\n\n- Funded account guidance\n- Challenge support\n- Risk management support\n\nTo access the mini app, select Open Mini App from the Funded menu.',
  funded_plans:
    'Funded Plans / Pricing\n\nPlease contact the admin to confirm the currently available funded plans.\n\nAdmin: @xauforexadmin',
  account_details:
    'Account Management Details\n\n- Risk-managed trading\n- Weekly progress updates\n- Profit sharing discussion with admin',
  account_plans:
    'Account Management Plans\n\nPlans are customized based on your capital and risk profile.\n\nAdmin: @xauforexadmin',
  mentorship_details:
    'Personal Mentorship Details\n\n- One-to-one guidance\n- Trading concepts\n- Live market support\n- Practice plan',
  mentorship_plans:
    'Personal Mentorship Plans\n\nPlease contact the admin to confirm availability for batch and one-to-one mentorship slots.\n\nAdmin: @xauforexadmin',
  referral_details:
    'Referral Details\n\nOpen the mini app or contact the admin for your referral link and bonus details.\n\nAdmin: @xauforexadmin',
  payment_details:
    'Payment Method Details\n\nPayment details are available in the mini app. Please contact the admin to confirm your payment.\n\nAdmin: @xauforexadmin'
};

bot.start(sendMainMenu);
bot.command('menu', sendMainMenu);
bot.command('vip', sendVipMenu);
bot.command('mentorship', sendMentorshipMenu);
bot.command('funded', sendFundedMenu);
bot.command('account', sendAccountMenu);
bot.command('referral', sendReferralMenu);
bot.command('payment', sendPaymentMenu);

bot.command('broadcast', async (ctx) => {
  if (!adminId || ctx.from.id !== adminId) {
    return ctx.reply('You are not authorized to use this command.');
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
bot.action('menu_funded', sendFundedMenu);
bot.action('menu_referral', sendReferralMenu);
bot.action('menu_payment', sendPaymentMenu);

bot.action(Object.keys(detailText), async (ctx) => {
  const data = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
  if (!data || !(data in detailText)) {
    await ctx.answerCbQuery();
    return;
  }

  await replyOrEdit(ctx, detailText[data as DetailKey], Markup.inlineKeyboard([[adminButton], [backButton]]));
});

bot.catch((error) => {
  console.error('Bot error:', error);
});

bot.launch().then(() => {
  console.log('Bot started.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
