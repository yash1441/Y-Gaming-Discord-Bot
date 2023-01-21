const {
	Client,
	Collection,
	GatewayIntentBits,
	EmbedBuilder,
	ActivityType,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const twitch = require("node-twitch");
require("dotenv").config();
const logger = require("./Logger/logger.js");

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildVoiceStates,
	],
	partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

const twitch = new TwitchApi({
	client_id: "cb7n9qw551wz1wdkdog9p54zk1npb3",
	client_secret: "8c32pt17vakr4enqe9n3f5dzbg1b4w",
});

let isLive = false;

////////////////////
/// ADD COMMANDS ///
////////////////////

let files = fs.readdirSync("./"),
	file;

for (file of files) {
	if (file.startsWith("autoAdd")) {
		require("./" + file);
	}
}

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	client.commands.set(command.data.name, command);
}

////////////////////
//// BOT EVENTS ////
////////////////////

client.on("ready", () => {
	logger.info(`Discord bot went online. Username: ${client.user.tag}`);
	client.user.setPresence({
		activities: [
			{
				name: `in ${client.guilds.cache.size} servers`,
				type: ActivityType.Streaming,
				url: "https://twitch.tv/Tansmh",
			},
		],
		status: `dnd`,
	});
	let serverlist = "";
	client.guilds.cache.forEach((guild) => {
		serverlist = serverlist.concat(
			" - " + guild.name + ": ID: " + guild.id + "\n"
		);
	});

	const embed = new EmbedBuilder()
		.setColor("Random")
		.setTitle("Servers that have Y-Gaming Discord Bot", "")
		.setDescription(serverlist);
	client.users.fetch("132784173311197184").then((user) => {
		try {
			user.send({ embeds: [embed] });
		} catch (err) {
			console.log("err");
		}
	});

	setInterval(() => {
		twitch.getStreams({ channel: "ygamingplay" }).then((response) => {
			if (response.data.length > 0 && !isLive) {
				isLive = true;
				const channel = client.channels.cache.get("770859213273694208");
				channel.send("ESL CSGO is live! Go check out their stream!");
			} else if (response.data.length == 0) {
				isLive = false;
			}
		});
	}, 60000);
});

client.on("interactionCreate", async (interaction) => {
	if (interaction.isChatInputCommand()) {
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) return;

		try {
			await command.execute(interaction, client);
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content: "There was an error while executing this command!",
			});
		}
	}
});

client.login(process.env.DISCORD_TOKEN);
