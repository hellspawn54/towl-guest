import db from "../database.js";
import { QUESTS } from "./quests.js";
import { LEVELS } from "./levels.js";
import { addXP } from "./levelEngine.js";

export async function getPlayer(discordId) {
  const [rows] = await db.query(
    "SELECT * FROM players WHERE discord_id = ?",
    [discordId]
  );
  return rows[0];
}

export function getQuestByCode(code) {
  return QUESTS.find(q => q.code === code);
}

export async function startQuest(discordId, questCode) {
  const quest = getQuestByCode(questCode);
  if (!quest) return { error: "Quest not found." };

  const player = await getPlayer(discordId);
  if (!player) return { error: "Player not found." };

  const playerLevelIndex = LEVELS.indexOf(player.level);
  const requiredLevelIndex = LEVELS.indexOf(quest.required_level);

  if (playerLevelIndex < requiredLevelIndex) {
    return { error: `You must be **${quest.required_level}** to start this quest.` };
  }

  await db.query(
    `INSERT INTO quest_progress (player_id, quest_id, status, progress, target)
     SELECT ?, id, 'in_progress', 0, ?
     FROM quests WHERE code = ?
     ON DUPLICATE KEY UPDATE status='in_progress', progress=0, target=?`,
    [player.id, quest.target, questCode, quest.target]
  );

  return { success: true, quest };
}

export async function updateQuestProgress(discordId, questCode, amount, client) {
  const player = await getPlayer(discordId);
  if (!player) return;

  const [rows] = await db.query(
    `SELECT qp.*, q.reward_tokens, q.reward_role
     FROM quest_progress qp
     JOIN quests q ON q.id = qp.quest_id
     WHERE qp.player_id = ? AND q.code = ?`,
    [player.id, questCode]
  );

  const progress = rows[0];
  if (!progress || progress.status !== "in_progress") return;

  const newProgress = progress.progress + amount;

  if (newProgress >= progress.target) {
    await db.query(
      `UPDATE quest_progress SET status='completed', progress=target WHERE id=?`,
      [progress.id]
    );

    await db.query(
      `UPDATE players SET tokens = tokens + ? WHERE id=?`,
      [progress.reward_tokens, player.id]
    );

    const xpReward = progress.reward_tokens * 2;

    await addXP(discordId, xpReward, client);

    return {
      completed: true,
      reward_tokens: progress.reward_tokens,
      xp_reward: xpReward,
      reward_role: progress.reward_role
    };
  }

  await db.query(
    `UPDATE quest_progress SET progress=? WHERE id=?`,
    [newProgress, progress.id]
  );

  return { completed: false, progress: newProgress };
}
