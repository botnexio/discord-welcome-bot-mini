import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig, parseColor, renderTemplate, buildWelcomeEmbed, handleMemberJoin, commandReply, COMMANDS, loginErrorMessage } from "../src/bot.js";

const ok = { DISCORD_TOKEN: "abc.def.ghi", WELCOME_CHANNEL_ID: "123456789012345678" };
const config = { welcomeChannelId: "1", autoRoleId: "2", title: "Hi {username}", message: "Welcome {user} to {server} (#{memberCount}) {other}", color: 1 };
const quiet = { error() {} };

test("valid minimal config uses defaults", () => {
  const c = loadConfig(ok);
  assert.equal(c.autoRoleId, null);
  assert.equal(c.guildId, null);
  assert.equal(c.color, 0x5865f2);
});
test("missing/placeholder token and bad IDs are rejected", () => {
  assert.throws(() => loadConfig({ ...ok, DISCORD_TOKEN: "" }), /DISCORD_TOKEN/);
  assert.throws(() => loadConfig({ ...ok, DISCORD_TOKEN: "your-bot-token-here" }), /DISCORD_TOKEN/);
  assert.throws(() => loadConfig({ ...ok, WELCOME_CHANNEL_ID: "general" }), /WELCOME_CHANNEL_ID/);
  assert.throws(() => loadConfig({ ...ok, AUTO_ROLE_ID: "x" }), /AUTO_ROLE_ID/);
  assert.throws(() => loadConfig({ ...ok, GUILD_ID: "x" }), /GUILD_ID/);
});
test("colors", () => {
  assert.equal(parseColor("#ff0000"), 0xff0000);
  assert.equal(parseColor("red"), null);
});
test("placeholders are replaced, unknown ones kept", () => {
  assert.equal(renderTemplate("{user}@{server}", { user: "<@1>", server: "S" }), "<@1>@S");
  const e = buildWelcomeEmbed(config, { id: "9", username: "ann", guildName: "Srv", memberCount: 5 });
  assert.equal(e.title, "Hi ann");
  assert.equal(e.description, "Welcome <@9> to Srv (#5) {other}");
});

function fakeMember({ bot = false, channelOk = true, roleFails = false } = {}) {
  const sent = [], added = [];
  return {
    sent, added, id: "9",
    user: { username: "ann", bot, displayAvatarURL: () => "https://cdn/x.png" },
    guild: { name: "Srv", memberCount: 3, channels: { fetch: async () => (channelOk ? { isTextBased: () => true, send: async (m) => sent.push(m) } : null) } },
    roles: { add: async (id) => { if (roleFails) throw new Error("Missing Permissions"); added.push(id); } },
  };
}
test("join sends embed and assigns role", async () => {
  const m = fakeMember();
  assert.deepEqual(await handleMemberJoin(m, config, quiet), { welcomed: true, roleAssigned: true });
  assert.ok(m.sent[0].embeds[0].description.startsWith("Welcome <@9> to Srv"));
  assert.deepEqual(m.added, ["2"]);
});
test("bots get no role; failures never throw; no role when not configured", async () => {
  assert.equal((await handleMemberJoin(fakeMember({ bot: true }), config, quiet)).roleAssigned, false);
  assert.deepEqual(await handleMemberJoin(fakeMember({ channelOk: false, roleFails: true }), config, quiet), { welcomed: false, roleAssigned: false });
  const m = fakeMember();
  await handleMemberJoin(m, { ...config, autoRoleId: null }, quiet);
  assert.deepEqual(m.added, []);
});
test("/ping and /help", () => {
  assert.deepEqual(COMMANDS.map((c) => c.name), ["ping", "help"]);
  assert.match(commandReply("ping", config, 42.4).content, /Pong! \(42 ms\)/);
  assert.match(commandReply("help", config, 0).content, /<#1>.*\n.*<@&2>/s);
  assert.equal(commandReply("nope", config, 0), null);
});
test("login errors become one clean line", () => {
  assert.match(loginErrorMessage({ code: "TokenInvalid", message: "An invalid token was provided." }), /DISCORD_TOKEN is invalid/);
  assert.match(loginErrorMessage({ message: "Used disallowed intents" }), /Server Members Intent/);
  assert.match(loginErrorMessage({ code: "ENOTFOUND" }), /cannot reach Discord/);
  assert.equal(loginErrorMessage(new Error("boom")), "Login failed: boom");
});
