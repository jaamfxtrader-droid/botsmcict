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
  | 'payment_details'
  | 'privacy_details'
  | 'terms_details'
  | 'risk_details'
  | 'contact_details';

type ServiceKey = 'vip' | 'mentorship' | 'funded' | 'account' | 'referral' | 'payment' | 'policies';

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
const adminUsername = (process.env.ADMIN_USERNAME || 'xauforexadmin').replace(/^@/, '');
const freeChannelUrl = process.env.FREE_CHANNEL_URL || 'https://t.me/XAUforex_trader';
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
    label: 'Market Education',
    path: '/vip',
    intro:
      'Market Education selected.\n\nYou can review the service details, pricing, risk notice, and website before contacting support. We do not promise profits or give personal financial advice.',
    detailsKey: 'vip_details',
    plansKey: 'vip_plans'
  },
  mentorship: {
    key: 'mentorship',
    label: 'Mentorship',
    path: '/mentorship',
    intro:
      'Mentorship selected.\n\nReview the learning format and availability below. Trading carries risk, and results depend on each person.',
    detailsKey: 'mentorship_details',
    plansKey: 'mentorship_plans'
  },
  funded: {
    key: 'funded',
    label: 'Evaluation Guidance',
    path: '/funded',
    intro:
      'Evaluation Guidance selected.\n\nThis section explains education and risk-management support for evaluation accounts. We are not a broker or prop firm.',
    detailsKey: 'funded_details',
    plansKey: 'funded_plans'
  },
  account: {
    key: 'account',
    label: 'Account Guidance',
    path: '/account-management',
    intro:
      'Account Guidance selected.\n\nReview the service information first. We do not guarantee profit, and users should only trade with risk they understand.',
    detailsKey: 'account_details',
    plansKey: 'account_plans'
  },
  referral: {
    key: 'referral',
    label: 'Referral',
    path: '/referral',
    intro: 'Referral selected.\n\nReview the referral information and terms before joining.',
    detailsKey: 'referral_details'
  },
  payment: {
    key: 'payment',
    label: 'Payment Method',
    path: '/payment-method',
    intro: 'Payment Method selected.\n\nAlways confirm payment details with official support before sending funds.',
    detailsKey: 'payment_details'
  },
  policies: {
    key: 'policies',
    label: 'Privacy & Terms',
    path: '/privacy',
    intro: 'Privacy & Terms\n\nPlease review our privacy, terms, and risk information before using any service.',
    detailsKey: 'privacy_details',
    plansKey: 'terms_details'
  }
};

const backButton = Markup.button.callback('Back to Main Menu', 'main_menu');
const adminButton = Markup.button.url('Contact Support', `https://t.me/${adminUsername}`);
const freeChannelButton = Markup.button.url('Free Educational Channel', freeChannelUrl);
const riskButton = Markup.button.callback('Risk Notice', 'risk_details');
const privacyButton = Markup.button.callback('Privacy', 'privacy_details');
const termsButton = Markup.button.callback('Terms', 'terms_details');

const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('Market Education', 'menu_vip')],
  [Markup.button.callback('Mentorship', 'menu_mentorship')],
  [Markup.button.callback('Evaluation Guidance', 'menu_funded')],
  [Markup.button.callback('Account Guidance', 'menu_account')],
  [Markup.button.callback('Referral', 'menu_referral')],
  [Markup.button.callback('Payment Method', 'menu_payment')],
  [freeChannelButton],
  [Markup.button.callback('Privacy & Terms', 'menu_policies')]
]);
const mainMenuText =
  'Daily Gold Market Updates\n\n' +
  'Access educational XAU/USD market analysis, technical chart reviews, trading resources, and risk-management reminders.\n\n' +
  'This bot is for learning and market commentary only. We do not guarantee profit, manage exchange logins, or provide personal financial advice. Review the risk notice, privacy, and terms before joining any paid service.';

function serviceUrl(pathname: string) {
  return `${miniAppUrl}${pathname}`;
}

function serviceMenu(service: Service) {
  const rows: any[][] = [
    [Markup.button.url('Open Website', serviceUrl(service.path))],
    [Markup.button.webApp('Open Mini App', serviceUrl(service.path))],
    [Markup.button.callback(`${service.label} Details`, service.detailsKey)]
  ];

  if (service.plansKey) {
    rows.push([Markup.button.callback(`${service.label} Plans / Pricing`, service.plansKey)]);
  }

  rows.push([riskButton, privacyButton, termsButton]);
  rows.push([freeChannelButton]);
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
    mainMenuText,
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
    'Market Education Details\n\n- Educational market updates\n- Trade planning examples\n- Risk-management reminders\n- Community support\n\nAll content is informational only. It is not personal financial advice and does not guarantee profit.',
  vip_plans:
    `Market Education Plans / Pricing\n\n- Monthly: $75\n- Yearly: $170\n- Lifetime: $300\n\nPlease contact support to confirm current availability and payment details.\n\nSupport: @${adminUsername}`,
  funded_details:
    'Evaluation Guidance Details\n\n- Evaluation account education\n- Challenge preparation guidance\n- Risk-management support\n\nWe are not a broker or prop firm. Always read the rules of any third-party provider before joining.',
  funded_plans:
    `Evaluation Guidance Plans / Pricing\n\nPlease contact support to confirm the currently available guidance options.\n\nSupport: @${adminUsername}`,
  account_details:
    'Account Guidance Details\n\n- Risk-management education\n- Weekly progress review\n- Strategy discussion with support\n\nNo profit is guaranteed. Please review all risks before using any trading-related service.',
  account_plans:
    `Account Guidance Plans\n\nPlans are discussed based on your goals and risk profile. No plan guarantees income or profit.\n\nSupport: @${adminUsername}`,
  mentorship_details:
    'Personal Mentorship Details\n\n- One-to-one guidance\n- Trading concepts\n- Live market support\n- Practice plan',
  mentorship_plans:
    `Personal Mentorship Plans\n\nPlease contact support to confirm availability for batch and one-to-one mentorship slots.\n\nSupport: @${adminUsername}`,
  referral_details:
    `Referral Details\n\nOpen the mini app or contact support for referral information. Referral rewards, if available, are subject to current terms.\n\nSupport: @${adminUsername}`,
  payment_details:
    `Payment Method Details\n\nPayment details are available in the mini app. Please contact support to confirm official payment details before sending funds.\n\nSupport: @${adminUsername}`,
  privacy_details:
    'Privacy\n\nWe collect your Telegram user ID only to send requested bot messages and admin broadcasts. We do not ask for passwords, seed phrases, card PINs, or banking login details. Contact support if you want your bot subscription removed.',
  terms_details:
    'Terms\n\nSMC ICT provides trading education, market commentary, and related support information. Our content is not personal financial advice. Payments and access should be confirmed only through official support.',
  risk_details:
    'Risk Notice\n\nTrading forex, CFDs, crypto, and other financial markets is risky. You can lose money. Past performance, examples, screenshots, or signals do not guarantee future results. Only trade after understanding the risk.',
  contact_details: `Contact Support\n\nOfficial Telegram support: @${adminUsername}\nWebsite: ${miniAppUrl}\n\nWe never ask for your Telegram password, exchange login, card PIN, or wallet seed phrase.`
};

bot.start(sendMainMenu);
bot.command('menu', sendMainMenu);
bot.command('about', (ctx) => ctx.reply(mainMenuText, mainMenu));
bot.command('vip', sendVipMenu);
bot.command('mentorship', sendMentorshipMenu);
bot.command('funded', sendFundedMenu);
bot.command('account', sendAccountMenu);
bot.command('referral', sendReferralMenu);
bot.command('payment', sendPaymentMenu);
bot.command('free', (ctx) => ctx.reply(
  'Free Educational Channel\n\nJoin the free channel for educational XAU/USD updates and chart commentary. Content is informational only and does not guarantee profit.',
  Markup.inlineKeyboard([[freeChannelButton], [riskButton], [backButton]])
));
bot.command('privacy', (ctx) => ctx.reply(detailText.privacy_details, Markup.inlineKeyboard([[adminButton], [backButton]])));
bot.command('terms', (ctx) => ctx.reply(detailText.terms_details, Markup.inlineKeyboard([[adminButton], [backButton]])));
bot.command('risk', (ctx) => ctx.reply(detailText.risk_details, Markup.inlineKeyboard([[adminButton], [backButton]])));
bot.command('disclaimer', (ctx) => ctx.reply(detailText.risk_details, Markup.inlineKeyboard([[adminButton], [backButton]])));
bot.command('contact', (ctx) => ctx.reply(detailText.contact_details, Markup.inlineKeyboard([[adminButton], [backButton]])));
bot.command('help', sendMainMenu);

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
bot.action('menu_policies', (ctx) => replyOrEdit(ctx, services.policies.intro, Markup.inlineKeyboard([
  [privacyButton, termsButton],
  [riskButton],
  [adminButton],
  [backButton]
])));

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

bot.telegram.setMyCommands([
  { command: 'start', description: 'Open main menu' },
  { command: 'about', description: 'About daily gold market updates' },
  { command: 'free', description: 'Open free educational channel' },
  { command: 'privacy', description: 'View privacy information' },
  { command: 'terms', description: 'View terms' },
  { command: 'risk', description: 'View risk notice' },
  { command: 'contact', description: 'Contact official support' }
]).catch((error) => {
  console.error('Failed to set bot commands:', error);
});

bot.launch().then(() => {
  console.log('Bot started.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
