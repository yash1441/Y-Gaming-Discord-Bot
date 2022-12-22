const {
	Client,
	GatewayIntentBits,
	EmbedBuilder,
	ActivityType,
	SlashCommandBuilder,
	AttachmentBuilder,
} = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const HenrikDevValorantAPI = require("unofficial-valorant-api");
const canvacord = require("canvacord");
const Jimp = require("jimp");
const request = require("request-promise");
require("dotenv").config();

const vapi = new HenrikDevValorantAPI();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildVoiceStates,
	],
	partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

let ranksData = fs.readFileSync("rank-threshold.json");
const rankThreshold = JSON.parse(ranksData);

let agentsData = fs.readFileSync("agents.json");
const agents = JSON.parse(agentsData);

let mapsData = fs.readFileSync("maps.json");
const maps = JSON.parse(mapsData);

// To debug client.on issues //
// client.on("debug", ( e ) => console.log(e));

client.on("ready", () => {
	console.log(`-> ${client.user.tag} discord bot connected.`);
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
});

client.on("interactionCreate", async (interaction) => {
	if (interaction.isCommand()) {
		const { commandName, options } = interaction;

		if (commandName === "rank") {
			options.getBoolean("ephemeral") == null
				? await interaction.deferReply({ ephemeral: false })
				: await interaction.deferReply({
						ephemeral: options.getBoolean("ephemeral"),
				  });
			if (!options.getString("username").includes("#")) {
				interaction.editReply({
					content: `**Error:** Cannot find __${options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\``,
				});
				return;
			}
			let valoID = "NULL";
			valoID = options.getString("username").split("#", 2);
			let mmrURL =
				"https://api.henrikdev.xyz/valorant/v2/mmr/" +
				options.getString("region") +
				"/" +
				valoID[0] +
				"/" +
				valoID[1];
			let accountURL =
				"https://api.henrikdev.xyz/valorant/v1/account/" +
				valoID[0] +
				"/" +
				valoID[1] +
				"?force=true";
			let leaderboardURL;
			let puuid,
				playerTier,
				playerRank,
				playerRating,
				playerCardSmall,
				playerCardWide,
				Name,
				Tag,
				file,
				ratingColor,
				ratingRequired,
				playerRankUnpatched,
				errorFound = false,
				leaderboard;
			await axios
				.get(encodeURI(mmrURL))
				.then((res) => {
					playerRankUnpatched = res.data.data.current_data.currenttier;
					if (playerRankUnpatched == null) playerRankUnpatched = 0;
					playerTier =
						"https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/" +
						playerRankUnpatched +
						"/largeicon.png";
					playerRank = res.data.data.current_data.currenttierpatched;
					playerRating = res.data.data.current_data.ranking_in_tier;
					if (playerRating == null) playerRating = 0;
				})
				.catch((error) => {
					interaction.editReply({
						content: `**Error:** Cannot find __${options.getString(
							"username"
						)}__. Make sure the username is in this format - \`Name#Tag\`\n${
							error.message
						}`,
					});
					console.log(error.code);
					errorFound = true;
				});

			await axios
				.get(encodeURI(accountURL))
				.then((res) => {
					Name = res.data.data.name;
					Tag = res.data.data.tag;
					playerCardSmall = res.data.data.card.small;
					playerCardWide = res.data.data.card.wide;
					puuid = res.data.data.puuid;
					leaderboardURL =
						"https://api.henrikdev.xyz/valorant/v1/leaderboard/" +
						options.getString("region") +
						"?puuid=" +
						puuid;
				})
				.catch((error) => {
					interaction.editReply({
						content: `**Error:** Cannot find __${options.getString(
							"username"
						)}__. Make sure the username is in this format - \`Name#Tag\`\n${
							error.message
						}`,
					});
					errorFound = true;
				});

			if (playerRankUnpatched == 27) {
				await axios
					.get(encodeURI(leaderboardURL))
					.then((res) => {
						leaderboard = res.data.data[0].leaderboardRank;
					})
					.catch((error) => {
						interaction.editReply({
							content: `**Error:** Cannot find __${options.getString(
								"username"
							)}__. Make sure the username is in this format - \`Name#Tag\`\n${
								error.message
							}`,
						});
						errorFound = true;
					});
			}

			if (errorFound) return;

			if (playerRating <= 25) ratingColor = "#FF0000";
			else if (playerRating <= 75) ratingColor = "#FF7F00";
			else ratingColor = "#00FF00";

			if (playerRankUnpatched == 24)
				ratingRequired =
					rankThreshold[`${options.getString("region")}`].immortal1;
			else if (playerRankUnpatched == 25)
				ratingRequired =
					rankThreshold[`${options.getString("region")}`].immortal2;
			else if (playerRankUnpatched == 26)
				ratingRequired =
					rankThreshold[`${options.getString("region")}`].immortal3;
			else if (playerRankUnpatched == 27) ratingRequired = playerRating;
			else ratingRequired = 100;

			const rankCard = new canvacord.Rank()
				.setAvatar(playerTier)
				.setCustomStatusColor("#42454900")
				.setRank(1, "Ascendant", false)
				.setLevel(10, "RR", false)
				.setUsername(Name)
				.setDiscriminator("0000")
				.setCurrentXP(playerRating, ratingColor)
				.setRequiredXP(ratingRequired)
				.setBackground("IMAGE", playerCardWide);

			if (playerRankUnpatched == 27) rankCard.setLevel(leaderboard, "#", true);

			await rankCard.build().then((buffer) => {
				file = `${Name}-RankCard.png`;
				canvacord.write(buffer, file);
			});

			// const rankEmbed = new EmbedBuilder()
			// 	.setColor('#FF0000')
			// 	.setTitle(`${Name}#${Tag}`)
			// 	.addFields(
			// 		{ name: 'Rank', value: `${playerRank}` },
			// 		{ name: 'RR', value: `${playerRating}` }
			// 	)
			// 	.setThumbnail(playerTier)
			// 	.setImage(playerCardWide);

			await interaction.editReply({ files: [file] });

			fs.unlinkSync(file);
			//This will fetch all your slash commands
			//const commands = await client.application.commands.fetch();
			//Returns a collection of application commands
			//console.log(commands);
		} else if (commandName == "crosshair") {
			await interaction.deferReply();
			let profileCode = options.getString("profile-code");
			let crosshairEmbed, file;
			const crosshairBuffer = await vapi.getCrosshair({
				code: profileCode,
			});

			fs.writeFileSync(`crosshair.png`, crosshairBuffer.data);
			file = "crosshair.png";

			crosshairEmbed = new EmbedBuilder()
				.setColor("#00FF00")
				.setTitle("Crosshair")
				.setDescription("`" + profileCode + "`")
				.setImage("attachment://crosshair.png");

			await interaction.editReply({ embeds: [crosshairEmbed], files: [file] });

			fs.unlinkSync(file);
		} else if (commandName == "puuid") {
			await interaction.deferReply({ ephemeral: true });
			if (!options.getString("username").includes("#")) {
				interaction.editReply({
					content: `**Error:** Cannot find __${options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\``,
				});
				return;
			}
			let valoID = "NULL";
			valoID = options.getString("username").split("#", 2);
			let accountURL =
				"https://api.henrikdev.xyz/valorant/v1/account/" +
				valoID[0] +
				"/" +
				valoID[1] +
				"?force=true";
			let puuid;
			await axios
				.get(encodeURI(accountURL))
				.then((res) => {
					puuid = res.data.data.puuid;
				})
				.catch((error) => {
					interaction.editReply({
						content: `**Error:** Cannot find __${options.getString(
							"username"
						)}__. Make sure the username is in this format - \`Name#Tag\`\n${
							error.message
						}`,
					});
					return;
				});

			await interaction.editReply({
				content: `**${options.getString("username")}**\n\`${puuid}\``,
			});
		} else if (commandName == "lineup") {
			await interaction.deferReply();

			let agent = capitalizeFirst(options.getString("agent"));
			let map = capitalizeFirst(options.getString("map"));
			let bombsite = capitalizeFirst(options.getString("bombsite"));

			let imageName = `${map}${bombsite}${agent}.png`;
			let file = path.join(__dirname, "Lineups", imageName);

			fs.access(file, fs.F_OK, (err) => {
				if (err) {
					interaction.editReply({
						content: `**${agent} - ${map} ${bombsite}** has not been added yet.`,
					});
				} else
					interaction.editReply({
						content: `**${agent} - ${map} ${bombsite}**`,
						files: [`${file}`],
					});
			});
		} else if (commandName == "matches") {
			await interaction.deferReply();

			if (!options.getString("username").includes("#")) {
				interaction.editReply({
					content: `**Error:** Cannot find __${options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\``,
				});
				return;
			}

			let valoId = "NULL",
				matches;
			valoId = options.getString("username").split("#", 2);
			await vapi
				.getMMRHistory({
					region: options.getString("region"),
					name: valoId[0],
					tag: valoId[1],
				})
				.then((response) => {
					matches = response;
				})
				.catch((er) => {
					console.log(er);
				});

			if (matches.error) {
				interaction.editReply({
					content: `**Error:** Cannot find __${options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\``,
				});
				return;
			}

			let match = [
				matches.data[0],
				matches.data[1],
				matches.data[2],
				matches.data[3],
				matches.data[4],
			];
			let embed = [];
			for (i = 0; i < 5; i++) {
				embed[i] = new EmbedBuilder()
					.setDescription(`${match[i].date}`)
					.addFields(
						{ name: "Rank", value: `${match[i].currenttierpatched}` },
						{ name: "RR", value: `${match[i].mmr_change_to_last_game}` }
					)
					.setThumbnail(`${match[i].images.large}`);

				if (match[i].mmr_change_to_last_game > 0) embed[i].setColor("#00FF00");
				else if (match[i].mmr_change_to_last_game == 0)
					embed[i].setColor("#FF7F00");
				else embed[i].setColor("#FF0000");
			}

			interaction.editReply({
				content: `**${options.getString("username")}** - Last 5 Matches`,
				embeds: [embed[0], embed[1], embed[2], embed[3], embed[4]],
			});
		} else if (commandName == "lastmatch") {
			await interaction.deferReply();

			if (!options.getString("username").includes("#")) {
				interaction.editReply({
					content: `**Error:** Cannot find __${options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\``,
				});
				return;
			}

			let valoId = "NULL",
				match;
			valoId = options.getString("username").split("#", 2);

			await vapi
				.getMatches({
					region: options.getString("region"),
					name: valoId[0],
					tag: valoId[1],
					size: 1,
					filter: "Competitive",
				})
				.then((response) => {
					match = response;
				})
				.catch((er) => {
					console.log(er);
				});

			if (match.error) {
				interaction.editReply({
					content: `**Error:** Cannot find __${options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\`\n${
						match.error
					}`,
				});
				return;
			}

			if (match.data[0] == undefined || match.data[0] == undefined) {
				interaction.editReply({
					content: `**Error:** Cannot find last match data for __${options.getString(
						"username"
					)}__.`,
				});
				return;
			}

			let players = {
				red: [],
				blue: [],
				red_score: match.data[0].teams.red.rounds_won,
				blue_score: match.data[0].teams.blue.rounds_won,
			};

			let map = match.data[0].metadata.map;
			let date = match.data[0].metadata.game_start_patched;
			let matchid = match.data[0].metadata.matchid;
			let file = `${matchid}.png`;

			match.data[0].players.red.forEach(function (player) {
				let temp = {
					puuid: player.puuid,
					name: player.name,
					tag: player.tag,
					character: player.character,
					currenttier: player.currenttier,
					currenttier_patched: player.currenttier_patched,
					stats: {
						kills: player.stats.kills,
						deaths: player.stats.deaths,
						assists: player.stats.assists,
						headshots: player.stats.headshots,
						nonheadshots: player.stats.bodyshots + player.stats.legshots,
						damage: player.damage_made,
					},
				};

				players.red.push(temp);
			});

			match.data[0].players.blue.forEach(function (player) {
				let temp = {
					puuid: player.puuid,
					name: player.name,
					tag: player.tag,
					character: player.character,
					currenttier: player.currenttier,
					currenttier_patched: player.currenttier_patched,
					stats: {
						kills: player.stats.kills,
						deaths: player.stats.deaths,
						assists: player.stats.assists,
						headshots: player.stats.headshots,
						nonheadshots: player.stats.bodyshots + player.stats.legshots,
						damage: player.damage_made,
					},
				};

				players.blue.push(temp);
			});

			await createScoreboard(players, map, date, file);

			// let lastmatchEmbed1 = new EmbedBuilder()
			// 	.setTitle(map)
			// 	.setDescription(`${date}\n\n**${players.red_score}** - **${players.blue_score}**`)
			// 	.setColor('#2F3136')

			// let lastmatchEmbed2 = new EmbedBuilder().setColor('#2F3136');
			// let lastmatchEmbed3 = new EmbedBuilder().setColor('#2F3136');

			// players.red.forEach(function(reds) {
			// 	lastmatchEmbed2.addFields(
			// 		{ name: `**${reds.name}#${reds.tag}**`, value: `${reds.character}`, inline: true },
			// 		{ name: `**Kills (A)**`, value: `**${reds.stats.kills}** (${reds.stats.assists})`, inline: true },
			// 		{ name: `**Deaths**`, value: `${reds.stats.deaths}`, inline: true }
			// 	);
			// });

			// players.blue.forEach(function(blues) {
			// 	lastmatchEmbed3.addFields(
			// 		{ name: `**${blues.name}#${blues.tag}**`, value: `${blues.character}`, inline: true },
			// 		{ name: `**Kills (A)**`, value: `**${blues.stats.kills}** (${blues.stats.assists})`, inline: true },
			// 		{ name: `**Deaths**`, value: `${blues.stats.deaths}`, inline: true }
			// 	);
			// });

			await interaction.editReply({ files: [file] });

			fs.unlinkSync(file);
		} else if (commandName == "imagine") {
			await interaction.reply({ content: "Getting your login info..." });
			let prompt = options.getString("prompt");

			let stuff = {
				method: "POST",
				url: "https://api.openai.com/v1/images/generations",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.OPENAI_KEY}`,
				},
				data: { prompt: prompt, n: 1, size: "1024x1024" },
			};

			let url = undefined;

			await axios
				.request(stuff)
				.then(function (response) {
					url = response.data.data[0].url;
					//interaction.editReply({ content: response.data.data[0].url });
				})
				.catch(function (error) {
					interaction.editReply({ content: "No" });
				});

			if (url == undefined) {
				return;
			}

			await interaction.editReply({
				content: "Just kidding, generating image...",
			});

			file = prompt.replace(/ /g, "-") + ".jpg";

			await request.head(url, function () {
				request(url)
					.pipe(fs.createWriteStream(file))
					.on("error", () => {
						console.log(error);
					})
					.on("finish", () => {
						interaction
							.editReply({ content: `**Prompt** \`${prompt}\``, files: [file] })
							.then(() => {
								fs.unlinkSync(file);
							});
					});
			});
		}
	}
});

client.login(process.env.DISCORD_TOKEN);

function capitalizeFirst(word) {
	return word.charAt(0).toUpperCase() + word.slice(1);
}

async function createScoreboard(players, map, date, file) {
	const scoreboardImage = await Jimp.read("ValorantScoreboardOverlay.png");
	let mapImage;

	const Fade = await Jimp.read(agents.Fade["displayIcon"]);
	const Breach = await Jimp.read(agents.Breach["displayIcon"]);
	const Raze = await Jimp.read(agents.Raze["displayIcon"]);
	const Chamber = await Jimp.read(agents.Chamber["displayIcon"]);
	const KAY_O = await Jimp.read(agents["KAY/O"]["displayIcon"]);
	const Skye = await Jimp.read(agents.Skye["displayIcon"]);
	const Cypher = await Jimp.read(agents.Cypher["displayIcon"]);
	const Viper = await Jimp.read(agents.Viper["displayIcon"]);
	const Reyna = await Jimp.read(agents.Reyna["displayIcon"]);
	const Neon = await Jimp.read(agents.Neon["displayIcon"]);
	const Jett = await Jimp.read(agents.Jett["displayIcon"]);
	const Killjoy = await Jimp.read(agents.Killjoy["displayIcon"]);
	const Brimstone = await Jimp.read(agents.Brimstone["displayIcon"]);
	const Omen = await Jimp.read(agents.Omen["displayIcon"]);
	const Sage = await Jimp.read(agents.Sage["displayIcon"]);
	const Astra = await Jimp.read(agents.Astra["displayIcon"]);
	const Sova = await Jimp.read(agents.Sova["displayIcon"]);
	const Yoru = await Jimp.read(agents.Yoru["displayIcon"]);
	const Phoenix = await Jimp.read(agents.Phoenix["displayIcon"]);
	const Harbor = await Jimp.read(agents.Harbor["displayIcon"]);

	Fade.resize(64, 64);
	Breach.resize(64, 64);
	Raze.resize(64, 64);
	Chamber.resize(64, 64);
	KAY_O.resize(64, 64);
	Skye.resize(64, 64);
	Cypher.resize(64, 64);
	Viper.resize(64, 64);
	Reyna.resize(64, 64);
	Neon.resize(64, 64);
	Jett.resize(64, 64);
	Killjoy.resize(64, 64);
	Brimstone.resize(64, 64);
	Omen.resize(64, 64);
	Sage.resize(64, 64);
	Astra.resize(64, 64);
	Sova.resize(64, 64);
	Yoru.resize(64, 64);
	Phoenix.resize(64, 64);
	Harbor.resize(64, 64);

	switch (map) {
		case "Ascent":
			mapImage = await Jimp.read(maps.Ascent["splash"]);
			break;
		case "Bind":
			mapImage = await Jimp.read(maps.Bind["splash"]);
			break;
		case "Haven":
			mapImage = await Jimp.read(maps.Haven["splash"]);
			break;
		case "Split":
			mapImage = await Jimp.read(maps.Split["splash"]);
			break;
		case "Icebox":
			mapImage = await Jimp.read(maps.Icebox["splash"]);
			break;
		case "Breeze":
			mapImage = await Jimp.read(maps.Breeze["splash"]);
			break;
		case "Fracture":
			mapImage = await Jimp.read(maps.Fracture["splash"]);
			break;
		case "Pearl":
			mapImage = await Jimp.read(maps.Pearl["splash"]);
			break;
		default:
			mapImage = await Jimp.read(maps["The Range"]);
			break;
	}
	mapImage.resize(1920, 1080);

	const font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
	const font64 = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
	const font128 = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);
	const agentX = 55,
		agentY = 485,
		agentDiff = 1750;
	const nameX = 140,
		nameY = 500,
		nameDiff = 990,
		nameWrap = 435;
	const killX = 625,
		deathX = 698,
		assistX = 773;
	const scoreX = 845,
		scoreY = 155,
		scoreDiff = 230;
	const mapX = 960,
		mapY = 10,
		mapDiff = 12.5;

	mapImage.composite(scoreboardImage, 0, 0);

	for (i = 0, id = 0; i < 500; i += 100, id += 1) {
		// Agent
		mapImage.composite(
			eval(players.red[id].character.replace("/", "_")),
			agentX,
			agentY + i
		); //Red
		mapImage.composite(
			eval(players.blue[id].character.replace("/", "_")),
			agentX + agentDiff,
			agentY + i
		); //Blue

		//Name#Tag
		mapImage.print(font32, nameX, nameY + i, players.red[id].name, nameWrap); //Red
		mapImage.print(
			font32,
			nameX + nameDiff,
			nameY + i,
			players.blue[id].name,
			nameWrap
		); //Blue

		//Kill
		mapImage.print(
			font32,
			killX,
			nameY + i,
			{
				text: players.red[id].stats.kills.toString(),
				alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
			},
			0,
			0
		);
		mapImage.print(
			font32,
			killX + nameDiff,
			nameY + i,
			{
				text: players.blue[id].stats.kills.toString(),
				alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
			},
			0,
			0
		);

		//Death
		mapImage.print(
			font32,
			deathX,
			nameY + i,
			{
				text: players.red[id].stats.deaths.toString(),
				alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
			},
			0,
			0
		);
		mapImage.print(
			font32,
			deathX + nameDiff,
			nameY + i,
			{
				text: players.blue[id].stats.deaths.toString(),
				alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
			},
			0,
			0
		);

		//Assist
		mapImage.print(
			font32,
			assistX,
			nameY + i,
			{
				text: players.red[id].stats.assists.toString(),
				alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
			},
			0,
			0
		);
		mapImage.print(
			font32,
			assistX + nameDiff,
			nameY + i,
			{
				text: players.blue[id].stats.assists.toString(),
				alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
			},
			0,
			0
		);
	}

	// Score
	mapImage.print(
		font128,
		scoreX,
		scoreY,
		{
			text: players.red_score.toString(),
			alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
			alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
		},
		0,
		0
	); // Red
	mapImage.print(
		font128,
		scoreX + scoreDiff,
		scoreY,
		{
			text: players.blue_score.toString(),
			alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
			alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
		},
		0,
		0
	); // Blue

	// Map
	mapImage.print(
		font64,
		mapX,
		mapY,
		{
			text: map,
			alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
			alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
		},
		0,
		0
	);
	mapImage.print(
		font32,
		mapX / 2,
		mapY * mapDiff,
		{
			text: date,
			alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
			alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
		},
		960,
		0
	);

	await mapImage.writeAsync(file);
}
