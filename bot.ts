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
const freeChannelUrl = process.env.FREE_CHANNEL_URL || 'https://t.me/telegram';
const showFreeChannel = process.env.SHOW_FREE_CHANNEL === 'true';
const botProfileName = process.env.BOT_PROFILE_NAME || 'SMC ICT Lab';
const botDescription =
  process.env.BOT_DESCRIPTION ||
  'A working reference for learners with a pre-study checklist, risk planning notes, a journal template, pattern cards, and beginner mistake reminders.';
const botShortDescription =
  process.env.BOT_SHORT_DESCRIPTION ||
  'Learning notes, study resources, and responsible research reminders.';
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
    label: 'Pre-Study Checklist',
    path: '/vip',
    intro:
      'Pre-Study Checklist selected.\n\nUse this section as a simple preparation list before reviewing any public market information.',
    detailsKey: 'vip_details'
  },
  mentorship: {
    key: 'mentorship',
    label: 'Risk Planning',
    path: '/mentorship',
    intro:
      'Risk Planning selected.\n\nReview basic risk-awareness notes and planning reminders for educational purposes.',
    detailsKey: 'mentorship_details'
  },
  funded: {
    key: 'funded',
    label: 'Journal Template',
    path: '/funded',
    intro:
      'Journal Template selected.\n\nUse this section to organize observations, notes, and review points.',
    detailsKey: 'funded_details'
  },
  account: {
    key: 'account',
    label: 'Pattern Cards',
    path: '/account-management',
    intro:
      'Pattern Cards selected.\n\nReview simple educational cards for common structures and study examples.',
    detailsKey: 'account_details'
  },
  referral: {
    key: 'referral',
    label: 'Beginner Mistakes',
    path: '/referral',
    intro: 'Beginner Mistakes selected.\n\nReview common beginner mistakes and simple ways to build better study habits.',
    detailsKey: 'referral_details'
  },
  payment: {
    key: 'payment',
    label: 'Contact',
    path: '/payment-method',
    intro: 'Contact selected.\n\nUse the official support link for questions about this educational bot.',
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
const adminButton = Markup.button.callback('Contact Support', 'contact_details');
const freeChannelButton = Markup.button.url('Join The Channel', freeChannelUrl);
const riskButton = Markup.button.callback('Risk Notice', 'risk_details');
const privacyButton = Markup.button.callback('Privacy', 'privacy_details');
const termsButton = Markup.button.callback('Terms', 'terms_details');

const mainMenuRows: any[][] = [
  [Markup.button.callback('Pre-Study Checklist', 'menu_vip')],
  [Markup.button.callback('Risk Planning', 'menu_mentorship')],
  [Markup.button.callback('Journal Template', 'menu_funded')],
  [Markup.button.callback('Pattern Cards', 'menu_account')],
  [Markup.button.callback('Beginner Mistakes', 'menu_referral')],
  [Markup.button.callback('Contact', 'menu_payment')],
  [Markup.button.callback('Privacy & Terms', 'menu_policies')]
];

if (showFreeChannel) {
  mainMenuRows.splice(4, 0, [freeChannelButton]);
}

const mainMenu = Markup.inlineKeyboard(mainMenuRows);
const mainMenuText =
  'What can this bot do?\n\n' +
  'A working reference for learners. Inside: a pre-study checklist, risk planning notes, a journal template, pattern cards, and a breakdown of common beginner mistakes.\n\n' +
  'Tap a section below to open the menu.\n\n' +
  'For informational purposes only. This bot does not provide personal recommendations, managed services, or specific outcome promises.';

function serviceUrl(pathname: string) {
  return `${miniAppUrl}${pathname}`;
}

function serviceMenu(service: Service) {
  const rows: any[][] = [
    [Markup.button.callback(`${service.label} Details`, service.detailsKey)]
  ];

  if (service.plansKey) {
    rows.push([Markup.button.callback(`${service.label} More Info`, service.plansKey)]);
  }

  rows.push([riskButton, privacyButton, termsButton]);
  if (showFreeChannel) {
    rows.push([freeChannelButton]);
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
    'Pre-Study Checklist\n\n- Review the overall context\n- Mark important public updates\n- Define your observation notes\n- Write down the reason for each idea\n- Review your risk-awareness reminders\n\nThis section is for education and general awareness only.',
  vip_plans:
    'More Information\n\nThis bot shares general education and awareness content only. It does not provide personal recommendations or specific outcome promises.',
  funded_details:
    'Journal Template\n\n- Date and session notes\n- Main observation\n- Reason for the idea\n- Risk-awareness notes\n- Review result and lesson learned\n\nKeeping notes can help learners review decisions more clearly.',
  funded_plans:
    'More Information\n\nPublic updates are shared for general awareness only. Users should do independent research and consult qualified professionals for personal decisions.',
  account_details:
    'Pattern Cards\n\n- Classic structure examples\n- Common continuation examples\n- Common reversal examples\n- Mistake reminders\n- Study-only notes\n\nThese cards are educational references, not personal instructions.',
  account_plans:
    'More Information\n\nThis bot does not handle user funds, private login details, or personal decision-making services.',
  mentorship_details:
    'Risk Planning\n\n- Keep risk small and defined\n- Avoid emotional decisions\n- Do not rely on one example\n- Review before and after each idea\n- Stop when the plan is unclear\n\nThis is general education only.',
  mentorship_plans:
    'More Information\n\nThis section is for educational study only. It does not include personal recommendations or specific outcome promises.',
  referral_details:
    'Beginner Mistakes\n\n- Following ideas without understanding them\n- Skipping a written plan\n- Ignoring risk-awareness reminders\n- Changing the plan emotionally\n- Not reviewing mistakes afterward\n\nUse these notes as a study checklist.',
  payment_details:
    `Contact\n\nUse the official support contact listed in this bot profile.\nWebsite: ${miniAppUrl}\n\nThis bot does not request passwords, card PINs, wallet seed phrases, exchange logins, or banking login details.`,
  privacy_details:
    'Privacy\n\nWe collect your Telegram user ID only to send requested bot messages and admin broadcasts. We do not ask for passwords, seed phrases, card PINs, or banking login details. Contact support if you want your bot subscription removed.',
  terms_details:
    'Terms\n\nThis bot provides general education and public information for awareness. It does not provide personal recommendations, managed services, or specific outcome promises.',
  risk_details:
    'Important Notice\n\nPublic information can change quickly. Educational examples, screenshots, and commentary should not be treated as future expectations. This bot does not provide personal recommendations.',
  contact_details: `Contact Support\n\nUse the official support contact listed in this bot profile.\nWebsite: ${miniAppUrl}\n\nWe never ask for your Telegram password, private login details, card PIN, or wallet seed phrase.`
};

bot.start(sendMainMenu);
bot.command('menu', sendMainMenu);
bot.command('about', (ctx) => ctx.reply(mainMenuText, mainMenu));
bot.command('basics', sendVipMenu);
bot.command('notes', sendMentorshipMenu);
bot.command('news', sendFundedMenu);
bot.command('resources', sendAccountMenu);
bot.command('community', sendReferralMenu);
bot.command('contact', (ctx) => ctx.reply(detailText.contact_details, Markup.inlineKeyboard([[adminButton], [backButton]])));
if (showFreeChannel) {
  bot.command('free', (ctx) => ctx.reply(
    'Free Educational Channel\n\nJoin the free channel for general learning updates and educational commentary. Content is for education and awareness only.',
    Markup.inlineKeyboard([[freeChannelButton], [riskButton], [backButton]])
  ));
}
bot.command('privacy', (ctx) => ctx.reply(detailText.privacy_details, Markup.inlineKeyboard([[adminButton], [backButton]])));
bot.command('terms', (ctx) => ctx.reply(detailText.terms_details, Markup.inlineKeyboard([[adminButton], [backButton]])));
bot.command('risk', (ctx) => ctx.reply(detailText.risk_details, Markup.inlineKeyboard([[adminButton], [backButton]])));
bot.command('disclaimer', (ctx) => ctx.reply(detailText.risk_details, Markup.inlineKeyboard([[adminButton], [backButton]])));
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

const botCommands = [
  { command: 'start', description: 'Open main menu' },
  { command: 'about', description: 'About this bot' },
  { command: 'basics', description: 'Open pre-study checklist' },
  { command: 'notes', description: 'Open risk planning notes' },
  { command: 'news', description: 'Open journal template' },
  { command: 'resources', description: 'Open pattern cards' },
  { command: 'community', description: 'Open beginner mistakes' },
  { command: 'privacy', description: 'View privacy information' },
  { command: 'terms', description: 'View terms' },
  { command: 'risk', description: 'View important notice' },
  { command: 'contact', description: 'Contact official support' }
];

if (showFreeChannel) {
  botCommands.splice(7, 0, { command: 'free', description: 'Open free educational channel' });
}

async function configureBotProfile() {
  await Promise.all([
    (bot.telegram as any).callApi('setMyName', { name: botProfileName }),
    (bot.telegram as any).callApi('setMyDescription', { description: botDescription }),
    (bot.telegram as any).callApi('setMyShortDescription', { short_description: botShortDescription }),
    bot.telegram.setMyCommands(botCommands)
  ]);
}

configureBotProfile().catch((error) => {
  console.error('Failed to configure bot profile:', error);
});

bot.launch().then(() => {
  console.log('Bot started.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
