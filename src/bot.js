// Discord Welcome Bot Mini – single file: welcome embed, auto-role on join, /ping, /help.
// Pure helpers are exported for the tests; the bot only starts when this file is run directly (npm start).
import { pathToFileURL } from "node:url";

const SNOWFLAKE = /^\d{17,20}$/;

/** Reads and validates configuration from an env object. Throws with a readable message on errors. */
export function loadConfig(env = process.env) {
  const errors = [];
  const token = (env.DISCORD_TOKEN ?? "").trim();
  if (!token || token === "your-bot-token-here") errors.push("DISCORD_TOKEN missing – copy .env.example to .env");
  const welcomeChannelId = (env.WELCOME_CHANNEL_ID ?? "").trim();
  if (!SNOWFLAKE.test(welcomeChannelId)) errors.push("WELCOME_CHANNEL_ID must be a channel ID (17–20 digits)");
  const autoRoleId = (env.AUTO_ROLE_ID ?? "").trim() || null;
  if (autoRoleId && !SNOWFLAKE.test(autoRoleId)) errors.push("AUTO_ROLE_ID must be a role ID (17–20 digits) or empty");
  const guildId = (env.GUILD_ID ?? "").trim() || null;
  if (guildId && !SNOWFLAKE.test(guildId)) errors.push("GUILD_ID must be a server ID (17–20 digits) or empty");
  const color = parseColor(env.WELCOME_COLOR);
  if (color === null) errors.push("WELCOME_COLOR must be a hex color like #5865F2");
  if (errors.length) throw new Error(errors.join("\n"));
  return {
    token,
    welcomeChannelId,
    autoRoleId,
    guildId,
    title: (env.WELCOME_TITLE ?? "").trim() || "Welcome!",
    message: (env.WELCOME_MESSAGE ?? "").trim() || "Welcome {user} to {server}!",
    color,
  };
}

export function parseColor(v) {
  if (v === undefined || v.trim() === "") return 0x5865f2;
  const m = /^#?([0-9a-f]{6})$/i.exec(v.trim());
  return m ? parseInt(m[1], 16) : null;
}

/** Replaces {user}, {username}, {server} and {memberCount}; unknown placeholders stay as they are. */
export function renderTemplate(template, vars) {
  return template.replace(/\{(user|username|server|memberCount)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** Plain embed object (works with discord.js `send({ embeds: [..] })`). */
export function buildWelcomeEmbed(config, member) {
  const vars = { user: `<@${member.id}>`, username: member.username, server: member.guildName, memberCount: member.memberCount };
  const embed = {
    title: renderTemplate(config.title, vars).slice(0, 256),
    description: renderTemplate(config.message, vars).slice(0, 4096),
    color: config.color,
  };
  if (member.avatarUrl) embed.thumbnail = { url: member.avatarUrl };
  return embed;
}

/** Handles one join: sends the welcome embed and assigns the auto-role. Errors are logged, never thrown. */
export async function handleMemberJoin(member, config, log = console) {
  const info = {
    id: member.id,
    username: member.user?.username ?? "",
    guildName: member.guild?.name ?? "",
    memberCount: member.guild?.memberCount ?? "",
    avatarUrl: member.user?.displayAvatarURL?.() ?? null,
  };
  const results = { welcomed: false, roleAssigned: false };
  try {
    const channel = await member.guild.channels.fetch(config.welcomeChannelId);
    if (channel?.isTextBased?.()) {
      await channel.send({ content: `<@${info.id}>`, embeds: [buildWelcomeEmbed(config, info)] });
      results.welcomed = true;
    } else {
      log.error?.("welcome channel not found or not a text channel", { channel: config.welcomeChannelId });
    }
  } catch (err) {
    log.error?.("welcome message failed", { err: err?.message });
  }
  if (config.autoRoleId && !member.user?.bot) {
    try {
      await member.roles.add(config.autoRoleId, "Auto-role on join");
      results.roleAssigned = true;
    } catch (err) {
      log.error?.("auto-role failed (bot role below the target role? Manage Roles missing?)", { err: err?.message });
    }
  }
  return results;
}

/** Slash commands (registered on start: on GUILD_ID instantly if set, otherwise globally). */
export const COMMANDS = [
  { name: "ping", description: "Check that the bot is online" },
  { name: "help", description: "Show what this bot does" },
];

export function helpText(config) {
  return [
    "**Discord Welcome Bot Mini**",
    `• Welcomes new members in <#${config.welcomeChannelId}>`,
    config.autoRoleId ? `• Gives new members the role <@&${config.autoRoleId}>` : "• Auto-role: off",
    "• /ping – check that the bot is online",
    "• /help – this message",
  ].join("\n");
}

/** Returns the reply for a slash command, or null for unknown commands. */
export function commandReply(name, config, latencyMs) {
  if (name === "ping") return { content: `Pong! (${Math.max(0, Math.round(latencyMs))} ms)`, ephemeral: true };
  if (name === "help") return { content: helpText(config), ephemeral: true };
  return null;
}

/** One clean line for login failures (no stack trace). */
export function loginErrorMessage(err) {
  const code = err?.code ?? "";
  if (code === "TokenInvalid") return "Login failed: DISCORD_TOKEN is invalid. Copy the bot token from the Developer Portal (Bot → Reset Token) into .env.";
  if (code === "DisallowedIntents" || /disallowed intents/i.test(err?.message ?? "")) return "Login failed: enable \"Server Members Intent\" in the Developer Portal (Bot → Privileged Gateway Intents).";
  if (["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(code)) return `Login failed: cannot reach Discord (${code}). Check your internet connection.`;
  return `Login failed: ${err?.message ?? String(err)}`;
}

async function main() {
  await import("dotenv/config");
  const { Client, Events, GatewayIntentBits, MessageFlags } = await import("discord.js");
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  // GuildMembers is a privileged intent: enable "Server Members Intent" in the Developer Portal.
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  client.once(Events.ClientReady, async (c) => {
    console.log(`ready as ${c.user.tag} on ${c.guilds.cache.size} server(s)`);
    try {
      if (config.guildId) await c.application.commands.set(COMMANDS, config.guildId);
      else await c.application.commands.set(COMMANDS);
    } catch (err) {
      console.error("registering slash commands failed", err?.message);
    }
  });
  client.on(Events.GuildMemberAdd, (member) => handleMemberJoin(member, config));
  client.on(Events.InteractionCreate, async (i) => {
    if (!i.isChatInputCommand()) return;
    const r = commandReply(i.commandName, config, client.ws.ping);
    if (!r) return;
    await i.reply({ content: r.content, flags: r.ephemeral ? MessageFlags.Ephemeral : undefined }).catch((err) => console.error("reply failed", err?.message));
  });
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => client.destroy().finally(() => process.exit(0)));
  try {
    await client.login(config.token);
  } catch (err) {
    console.error(loginErrorMessage(err));
    await client.destroy().catch(() => {});
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
