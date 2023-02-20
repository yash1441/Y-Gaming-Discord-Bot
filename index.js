const {
	Client,
	Collection,
	GatewayIntentBits,
	EmbedBuilder,
	ActivityType,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const TwitchApi = require("node-twitch").default;
require("dotenv").config();
const logger = require("./Logger/logger.js");
const Valorant = require("@liamcottle/valorant.js");
const axios = require("axios").default;

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
	client_id: process.env.TWITCH_ID,
	client_secret: process.env.TWITCH_SECRET,
});

const valorantAPI = new Valorant.API(Valorant.Regions.AsiaPacific);

// const dataDirectory = path.join(__dirname, "Data");
// const weapons = JSON.parse(
// 	fs.readFileSync(path.join(dataDirectory, "weapons.json"))
// );

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

client.on("ready", async () => {
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

	await getValorantVersion("https://valorant-api.com/v1/version");

	setInterval(() => {
		checkLive("tansmh");
	}, 10000);
});

client.on("interactionCreate", async (interaction) => {
	if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
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
	} else if (interaction.isModalSubmit()) {
		if (interaction.customId === "valorant-login") {
			await interaction.deferReply({ ephemeral: true });
			const username = interaction.fields.getTextInputValue("username");
			const password = interaction.fields.getTextInputValue("password");

			const rawNightMarket = await getNightMarket(
				process.env.VALO_USERNAME,
				process.env.VALO_PASSWORD
			);

			const skins = await fetchSkins(rawNightMarket);

			const embeds = [];

			for (const skin of skins) {
				console.log({ skin });
				// const skinEmbed = new EmbedBuilder()
				// 	.setTitle(skin.name)
				// 	.setThumbnail(skin.icon)
				// 	.setDescription(skin.discountCosts);
				// embeds.push(skinEmbed);
			}

			// await interaction.editReply({ embeds: embeds });
		}
	}
});

client.login(process.env.DISCORD_TOKEN);

async function checkLive(channel) {
	const stream = await getChannel(channel);
	if (stream && !isLive) {
		// Stream went LIVE //
		isLive = true;

		const user = await getUser(stream.user_login);
		if (!user) return console.log("User not found - " + stream.user_login);

		const game = await getGame(parseInt(stream.game_id));
		if (!game) return console.log("Game not found - " + stream.game_name);

		await sendLiveEmbed(
			stream,
			user,
			game,
			"992356452368920607",
			"770854206046470164"
		);
	} else if (!stream && isLive) {
		// Stream went OFFLINE //
		isLive = false;

		const user = await getUser(channel);
		if (!user) return console.log("User not found - " + channel);

		const video = await getVideo(user.id);
		if (!video) return console.log("Video not found - " + user.id);

		await sendOfflineEmbed(user, video, "992356452368920607");

		return;
	} else if (stream && isLive) {
		// Stream LIVE update //
		return;
	} else {
		// Stream OFFLINE update //
		return;
	}
}

async function getChannel(channel) {
	const stream = await twitch.getStreams({ channel: channel });
	if (stream.data.length > 0) {
		const stream_data = {
			user_id: stream.data[0].user_id,
			user_login: stream.data[0].user_login,
			user_name: stream.data[0].user_name,
			game_id: stream.data[0].game_id,
			game_name: stream.data[0].game_name,
			title: stream.data[0].title,
			viewer_count: stream.data[0].viewer_count,
			started_at: stream.data[0].started_at,
			thumbnail_url: stream.data[0].thumbnail_url
				.replace("{width}", "1280")
				.replace("{height}", "720"),
			tags: stream.data[0].tags,
		};
		return stream_data;
	} else return false;
}

async function getUser(user_login) {
	const user = await twitch.getUsers(user_login);
	if (user.data.length > 0) {
		const user_data = {
			id: user.data[0].id,
			broadcaster_type: user.data[0].broadcaster_type,
			description: user.data[0].description,
			profile_image_url: user.data[0].profile_image_url,
			offline_image_url: user.data[0].offline_image_url,
			view_count: user.data[0].view_count,
			created_at: user.data[0].created_at,
		};
		return user_data;
	} else return false;
}

async function getGame(game_id) {
	const game = await twitch.getGames(game_id);
	if (game.data.length > 0) {
		const game_data = {
			box_art_url: game.data[0].box_art_url
				.replace("{width}", "300")
				.replace("{height}", "300"),
			igdb_id: game.data[0].igdb_id,
		};
		return game_data;
	} else return false;
}

async function getVideo(user_id) {
	const video = await twitch.getVideos({ user_id: user_id });
	if (video.data.length > 0) {
		const video_data = {
			id: video.data[0].id,
			url: video.data[0].url,
			thumbnail_url: video.data[0].thumbnail_url
				.replace("%{width}", "1280")
				.replace("%{height}", "720"),
		};
		return video_data;
	} else return false;
}

async function sendLiveEmbed(
	stream,
	user,
	game,
	channelId,
	roleId = undefined
) {
	const channel = client.channels.cache.get(channelId);
	const tags = "`" + stream.tags.join("` `") + "`";

	let message;
	roleId
		? (message = `<@&${roleId}> ${stream.user_name} is **Live**!`)
		: (message = `${stream.user_name} is **Live**!`);

	const button = new ButtonBuilder()
		.setLabel("Watch Stream")
		.setEmoji("<a:TanWiggle:961250315989049414>")
		.setStyle(ButtonStyle.Link)
		.setURL("https://twitch.tv/" + stream.user_name);

	const row = new ActionRowBuilder().addComponents(button);

	const embed = new EmbedBuilder()
		.setColor("#6441A4")
		.setAuthor({
			name: stream.user_name,
			iconURL: user.profile_image_url,
			url: "https://twitch.tv/" + stream.user_name,
		})
		.setThumbnail(game.box_art_url)
		.setTitle(stream.title)
		.setURL("https://twitch.tv/" + stream.user_name)
		.setDescription("**Game**\n" + stream.game_name + "\n\n" + tags)
		.setImage(
			stream.thumbnail_url.replace("{width}", "1280").replace("{height}", "720")
		)
		.setTimestamp()
		.setFooter({
			text: "Started streaming",
			iconURL:
				"https://www.tailorbrands.com/wp-content/uploads/2021/04/twitch-logo.png",
		});
	channel.send({
		content: message,
		embeds: [embed],
		components: [row],
	});
}

async function sendOfflineEmbed(user, video, channelId) {
	const channel = client.channels.cache.get(channelId);
	const messages = await channel.messages.fetch({ limit: 1 });
	const lastMessage = messages.first();
	if (lastMessage.author.id === client.user.id) {
		const lastEmbed = lastMessage.embeds[0];
		const embed = new EmbedBuilder()
			.setColor(lastEmbed.color)
			.setAuthor(lastEmbed.author)
			.setThumbnail(lastEmbed.thumbnail.url)
			.setTitle(lastEmbed.title)
			.setURL(lastEmbed.url)
			.setDescription(lastEmbed.description)
			.setImage(user.offline_image_url)
			.setTimestamp()
			.setFooter({
				text: "Last live",
				iconURL:
					"https://www.tailorbrands.com/wp-content/uploads/2021/04/twitch-logo.png",
			});

		const button = new ButtonBuilder()
			.setLabel("Watch VOD")
			.setEmoji("<a:TanWiggle:961250315989049414>")
			.setStyle(ButtonStyle.Link)
			.setURL(video.url);

		const row = new ActionRowBuilder().addComponents(button);

		lastMessage.edit({
			content: `${lastEmbed.author.name} went offline!`,
			embeds: [embed],
			components: [row],
		});
	}
}

async function getValorantVersion(url) {
	await axios.get(url).then((response) => {
		valorantAPI.user_agent =
			"RiotClient/" +
			response.data.data.riotClientBuild +
			" rso-auth (Windows;10;;Professional, x64)";
		valorantAPI.client_version = response.data.data.riotClientVersion;
	});

	return logger.info(
		"Valorant API User Agent: " +
			valorantAPI.user_agent +
			" | Valorant API Client Version: " +
			valorantAPI.client_version
	);
}

async function getNightMarket(username, password) {
	await valorantAPI.authorize(username, password);
	const response = await valorantAPI
		.getPlayerStoreFront(valorantAPI.user_id)
		.catch((error) => {
			logger.error(error);
		});

	return response.data.BonusStore.BonusStoreOffers;
}

async function fetchSkins(rawNightMarket) {
	const skins = [];

	for (const record of rawNightMarket) {
		const skin = await axios.get(
			"https://valorant-api.com/v1/weapons/skinlevels/" + record.Offer.OfferID
		);
		const skinData = {
			name: skin.data.data.displayName,
			icon: skin.data.data.displayIcon,
			offerId: record.Offer.OfferID,
			discountPercent: record.DiscountPercent,
			discountCosts: record.DiscountCosts,
		};
		skins.push(skinData);
	}

	return skins;
}
