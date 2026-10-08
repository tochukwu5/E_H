import User from '../models/User.js';
import Match from '../models/Match.js';
import Job from '../models/Job.js';
import { tg, sendTelegram } from '../channels/telegram.js';
import { prepareApplication } from './applyEngine.js';
import { env } from '../config/env.js';

const HELP = `<b>EmployHunt bot</b>
I send job matches here as soon as they're found.

Each alert has buttons:
• <b>Open and apply</b> — opens the job
• <b>Save</b> — keep it in your matches
• <b>Skip</b> — hide it
• <b>Draft application</b> — I write a tailored cover letter

/status — your plan and today's alerts
/pause — stop alerts
/resume — start alerts again`;

async function answer(cbId, text) {
  await tg('answerCallbackQuery', { callback_query_id: cbId, text, show_alert: false }).catch(() => {});
}

export async function handleTelegramUpdate(update) {
  if (update.message) {
    const chatId = String(update.message.chat.id);
    const text = (update.message.text || '').trim();

    if (text.startsWith('/start')) {
      const code = text.split(' ')[1];
      if (!code) return sendTelegram(chatId, `Hi! To connect, open EmployHunt → Settings → Alerts and tap <b>Connect Telegram</b>.\n\n${env.siteUrl}/app/settings/alerts`);
      const user = await User.findOne({ 'alerts.telegram.linkCode': code });
      if (!user) return sendTelegram(chatId, 'That link has expired. Open Settings → Alerts on EmployHunt and tap Connect Telegram again.');
      user.alerts.telegram.chatId = chatId;
      user.alerts.telegram.enabled = true;
      user.alerts.telegram.username = update.message.from?.username;
      await user.save();
      return sendTelegram(chatId, `✅ Connected to <b>${user.name}</b>'s EmployHunt account.\n\n${HELP}`);
    }

    const user = await User.findOne({ 'alerts.telegram.chatId': chatId });
    if (!user) return sendTelegram(chatId, `This chat isn't connected yet. Open ${env.siteUrl}/app/settings/alerts and tap Connect Telegram.`);

    if (text === '/pause') {
      user.alerts.telegram.enabled = false;
      await user.save();
      return sendTelegram(chatId, 'Alerts paused. Send /resume to turn them back on.');
    }
    if (text === '/resume') {
      user.alerts.telegram.enabled = true;
      await user.save();
      return sendTelegram(chatId, 'Alerts are on again.');
    }
    if (text === '/status') {
      const today = await Match.countDocuments({ user: user._id, createdAt: { $gte: new Date(Date.now() - 864e5) } });
      return sendTelegram(chatId, `Plan: <b>${user.plan}</b>\nMatches in the last 24h: <b>${today}</b>\nActive searches: <b>${user.searches.filter((s) => s.active).length}</b>`);
    }
    return sendTelegram(chatId, HELP);
  }

  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = String(cb.message?.chat?.id);
    const [action, matchId] = String(cb.data || '').split(':');
    const user = await User.findOne({ 'alerts.telegram.chatId': chatId });
    const match = user && (await Match.findOne({ _id: matchId, user: user._id }));
    if (!match) return answer(cb.id, 'This match is no longer available.');

    if (action === 'save') {
      match.status = 'saved';
      await match.save();
      return answer(cb.id, 'Saved to your matches');
    }
    if (action === 'skip') {
      match.status = 'skipped';
      await match.save();
      await tg('deleteMessage', { chat_id: chatId, message_id: cb.message.message_id }).catch(() => {});
      return answer(cb.id, 'Skipped');
    }
    if (action === 'draft') {
      const job = await Job.findById(match.job);
      try {
        await answer(cb.id, 'Writing your cover letter…');
        const app = await prepareApplication(user, job, { match, mode: 'approve' });
        return sendTelegram(chatId, `<b>Draft ready: ${job.title}</b>\n\n${app.coverLetter.replace(/[<>&]/g, '')}\n\nEdit it or mark it applied: ${env.siteUrl}/app/applications`, {
          inline_keyboard: [[{ text: 'Open and apply', url: job.applyUrl || job.url }]],
        });
      } catch (e) {
        return sendTelegram(chatId, e.message);
      }
    }
    return answer(cb.id, 'Unknown action');
  }
}
