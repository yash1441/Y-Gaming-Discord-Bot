const {
	SlashCommandBuilder,
	EmbedBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	italic,
	spoiler,
	userMention,
	ButtonBuilder,
	ButtonStyle,
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Valo = require("../Utils/valo-stuff.js");

const { Font, RankCardBuilder, BuiltInGraphemeProvider } = require("canvacord");
const Jimp = require("jimp");

require("dotenv").config();
const logger = require("../Logger/logger.js");

const HenrikDevValorantAPI = require("unofficial-valorant-api");
const vapi = new HenrikDevValorantAPI(process.env.VALO_KEY);

const Sequelize = require("sequelize");
const sequelize = new Sequelize(
	process.env.DB_NAME,
	process.env.DB_USERNAME,
	process.env.DB_PASSWORD,
	{
		host: process.env.DB_IP,
		dialect: "mysql",
		logging: false,
	}
);
const valoLogin = require("../Models/valoLogin")(
	sequelize,
	Sequelize.DataTypes
);

const dataDirectory = path.join(__dirname, "../Data");
const rankThreshold = JSON.parse(
	fs.readFileSync(path.join(dataDirectory, "rank-threshold.json"))
);
const agentsData = JSON.parse(
	fs.readFileSync(path.join(dataDirectory, "agents.json"))
);
const mapsData = JSON.parse(
	fs.readFileSync(path.join(dataDirectory, "maps.json"))
);

module.exports = {
	data: new SlashCommandBuilder()
		.setName("valo")
		.setDescription("Commands related to Valorant.")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("account")
				.setDescription(
					"Get your account information (For development purposes)."
				)
				.addStringOption((option) =>
					option
						.setName("username")
						.setDescription("Enter a username with hashtag. Example: Name#Tag")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("crosshair")
				.setDescription("Share your crosshair.")
				.addStringOption((option) =>
					option
						.setName("profile-code")
						.setDescription("Enter a crosshair profile code.")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("lastmatch")
				.setDescription("Show your last match's scoreboard.")
				.addStringOption((option) =>
					option
						.setName("region")
						.setDescription("Choose the account's region.")
						.setRequired(true)
						.addChoices(
							{ name: "Asia", value: "ap" },
							{ name: "Europe", value: "eu" },
							{ name: "North America", value: "na" },
							{ name: "Korea", value: "kr" },
							{ name: "Latin America", value: "latam" },
							{ name: "Brazil", value: "br" }
						)
				)
				.addStringOption((option) =>
					option
						.setName("username")
						.setDescription("Enter a username with hashtag. Example: Name#Tag")
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("mode")
						.setDescription("Choose a valorant game mode.")
						.setRequired(false)
						.addChoices(
							{ name: "Competitive", value: "competitive" },
							{ name: "Custom", value: "custom" },
							{ name: "Deathmatch", value: "deathmatch" },
							{ name: "Escalation", value: "escalation" },
							{ name: "Team Deathmatch", value: "teamdeathmatch" },
							{ name: "Unrated", value: "unrated" },
							{ name: "Swiftplay", value: "swiftplay" },
							{ name: "Replication", value: "replication" },
							{ name: "Spikerush", value: "spikerush" }
						)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("lineup")
				.setDescription("Get lineups in Valorant.")
				.addStringOption((option) =>
					option
						.setName("agent")
						.setDescription("Choose an agent.")
						.setRequired(true)
						.addChoices(
							{ name: "Viper", value: "Viper" },
							{ name: "Sova", value: "Sova" },
							{ name: "Fade", value: "Fade" },
							{ name: "Killjoy", value: "Killjoy" },
							{ name: "Brimstone", value: "Brimstone" }
						)
				)
				.addStringOption((option) =>
					option
						.setName("map")
						.setDescription("Choose a map.")
						.setRequired(true)
						.addChoices(
							{ name: "Ascent", value: "Ascent" },
							{ name: "Bind", value: "Bind" },
							{ name: "Haven", value: "Haven" },
							{ name: "Icebox", value: "Icebox" },
							{ name: "Breeze", value: "Breeze" },
							{ name: "Split", value: "Split" },
							{ name: "Fracture", value: "Fracture" },
							{ name: "Pearl", value: "Pearl" }
						)
				)
				.addStringOption((option) =>
					option
						.setName("bombsite")
						.setDescription("Choose a bombsite")
						.setRequired(true)
						.addChoices({ name: "A", value: "A" }, { name: "B", value: "B" })
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("matches")
				.setDescription("Check your match history.")
				.addStringOption((option) =>
					option
						.setName("region")
						.setDescription("Choose the account's region.")
						.setRequired(true)
						.addChoices(
							{ name: "Asia", value: "ap" },
							{ name: "Europe", value: "eu" },
							{ name: "North America", value: "na" },
							{ name: "Korea", value: "kr" },
							{ name: "Latin America", value: "latam" },
							{ name: "Brazil", value: "br" }
						)
				)
				.addStringOption((option) =>
					option
						.setName("username")
						.setDescription(
							"Enter a valorant username with hashtag. Example: Name#Tag"
						)
						.setRequired(true)
				)
				.addIntegerOption((option) =>
					option
						.setName("matches")
						.setDescription(
							"Enter the number of matches to be pulled. Default: 5"
						)
						.setRequired(false)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("nightmarket")
				.setDescription("Check your Nightmarket.")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("rank")
				.setDescription("Check an account's rank.")
				.addStringOption((option) =>
					option
						.setName("region")
						.setDescription("Choose the account's region")
						.setRequired(true)
						.addChoices(
							{ name: "Asia", value: "ap" },
							{ name: "Europe", value: "eu" },
							{ name: "North America", value: "na" },
							{ name: "Korea", value: "kr" },
							{ name: "Latin America", value: "latam" },
							{ name: "Brazil", value: "br" }
						)
				)
				.addStringOption((option) =>
					option
						.setName("username")
						.setDescription(
							"Enter a valorant username with hashtag. Example: Name#Tag"
						)
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("store").setDescription("Check your store.")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("login")
				.setDescription(
					"Store your Valorant login for easier access to commands."
				)
		),
	async execute(interaction) {
		const subCommand = interaction.options.getSubcommand();

		if (subCommand === "account") {
			await interaction.deferReply({ ephemeral: true });
			if (!interaction.options.getString("username").includes("#")) {
				return await interaction.editReply({
					content: `**Error:** Cannot find __${interaction.options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\``,
				});
			}
			let valoID = "NULL";
			valoID = interaction.options.getString("username").split("#", 2);

			const accountData = await vapi.getAccount({
				name: valoID[0],
				tag: valoID[1],
			});

			await interaction.editReply({
				content: "```json\n" + JSON.stringify(accountData, null, 2) + "```",
			});
		} else if (subCommand === "crosshair") {
			await interaction.deferReply();
			let profileCode = interaction.options.getString("profile-code");
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
		} else if (subCommand === "lastmatch") {
			await interaction.deferReply();

			if (!interaction.options.getString("username").includes("#")) {
				return await interaction.editReply({
					content: `**Error:** Cannot find __${interaction.options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\``,
				});
			}

			let valoId = "NULL",
				match;
			valoId = interaction.options.getString("username").split("#", 2);

			const region = interaction.options.getString("region");
			const mode = interaction.options.getString("mode") ?? "Competitive";

			await vapi
				.getMatches({
					region: region,
					name: valoId[0],
					tag: valoId[1],
					size: 1,
					filter: mode,
				})
				.then((response) => {
					match = response;
				})
				.catch((er) => {
					console.log(er);
				});

			if (match.error) {
				interaction.editReply({
					content: `**Error:** Cannot find __${interaction.options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\`\n${
						match.error
					}`,
				});
				return;
			}

			if (match.data[0] == undefined || match.data[0] == undefined) {
				interaction.editReply({
					content: `**Error:** Cannot find last match data for __${interaction.options.getString(
						"username"
					)}__.`,
				});
				return;
			}

			if (mode == "Custom" && match.data[0].metadata.queue != "Standard")
				return await interaction.editReply({
					content:
						"Last custom match was not a Standard game which is the only type of Custom game that is supported.",
				});

			const players = {
				red: [],
				blue: [],
				red_score: match.data[0].teams.red.rounds_won,
				blue_score: match.data[0].teams.blue.rounds_won,
			};

			const map = match.data[0].metadata.map;
			const date = match.data[0].metadata.game_start_patched;
			const matchid = match.data[0].metadata.matchid;
			const file = `${matchid}.png`;

			for (const player of match.data[0].players.red) {
				const temp = {
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
			}

			for (const player of match.data[0].players.blue) {
				const temp = {
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
			}

			await createScoreboard(interaction, players, map, date, file);

			await interaction.editReply({ content: "", files: [file] });

			fs.unlinkSync(file);
		} else if (subCommand === "lineup") {
			await interaction.deferReply();

			let agent = interaction.options.getString("agent");
			let map = interaction.options.getString("map");
			let bombsite = interaction.options.getString("bombsite");

			let imageName = `${map}${bombsite}${agent}.png`;
			let file = path.join(__dirname, "../Images/Valorant/Lineups", imageName);

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
		} else if (subCommand === "matches") {
			await interaction.deferReply();

			if (!interaction.options.getString("username").includes("#")) {
				return await interaction.editReply({
					content: `**Error:** Cannot find __${interaction.options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\``,
				});
			}

			let number;

			interaction.options.getInteger("matches") == null
				? (number = 5)
				: (number = interaction.options.getInteger("matches"));

			number > 10 ? (number = 10) : (number = number);

			let valoId = "NULL",
				matches;
			valoId = interaction.options.getString("username").split("#", 2);

			await vapi
				.getMMRHistory({
					region: interaction.options.getString("region"),
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
				return await interaction.editReply({
					content: `**Error:** Cannot find __${interaction.options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\``,
				});
			}

			let match = [];

			for (i = 0; i < number; i++) {
				match.push(matches.data[i]);
			}

			let embeds = [];
			for (i = 0; i < match.length; i++) {
				if (match[i] == undefined) {
					i = match.length;
					continue;
				}
				let tempEmbed = new EmbedBuilder()
					.setDescription(`${match[i].date}`)
					.addFields(
						{ name: "Rank", value: `${match[i].currenttierpatched}` },
						{ name: "RR", value: `${match[i].mmr_change_to_last_game}` }
					)
					.setThumbnail(`${match[i].images.large}`);

				if (match[i].mmr_change_to_last_game > 0) tempEmbed.setColor("#00FF00");
				else if (match[i].mmr_change_to_last_game == 0)
					tempEmbed.setColor("#FF7F00");
				else tempEmbed.setColor("#FF0000");

				embeds.push(tempEmbed);
			}

			await interaction.editReply({
				content: `**${interaction.options.getString(
					"username"
				)}** - Last 5 Matches`,
				embeds: embeds,
			});
		} else if (subCommand === "nightmarket") {
			await interaction.deferReply();
			const userCreds = await valoLogin.findOne({
				where: { id: interaction.user.id },
			});
			if (!userCreds) {
				return await interaction.editReply({
					content: `Please use the </valo login:1127207637738606603> command first then try again.`,
				});
			}

			const build = await Valo.getVersion();
			const login = await Valo.authorize(
				build,
				userCreds.username,
				userCreds.password
			);

			if (login.error)
				return await interaction.editReply({
					content:
						"Invalid login attempt. If you are sure your credentials were correct then please check if 2FA is enabled because the bot doesn't support 2FA as of yet. If you did everything correctly, then maybe the bot is malfunctioning.",
				});

			login.build = build;

			const playerNightmarket = await Valo.getPlayerNightmarket(login);

			if (!playerNightmarket)
				return await interaction.editReply({
					content: `Nightmarket is not currently active.`,
				});

			const skins = await fetchNightmarketSkins(playerNightmarket);
			const embeds = [];

			for (const skin of skins) {
				const skinEmbed = new EmbedBuilder()
					.setColor("#2B2D31")
					.setTitle(skin.name)
					.setThumbnail(skin.icon)
					.setDescription(
						"### <:VP:1231857629740138539> " +
							skin.discountCosts +
							"\n🏷️ " +
							spoiler(italic(skin.discountPercent + "%"))
					);
				embeds.push(skinEmbed);
			}

			await interaction.editReply({ embeds: embeds });
		} else if (subCommand === "rank") {
			await interaction.deferReply({ ephemeral: false });
			if (!interaction.options.getString("username").includes("#")) {
				return await interaction.editReply({
					content: `**Error:** Cannot find __${interaction.options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\``,
				});
			}
			let valoID = "NULL";
			valoID = interaction.options.getString("username").split("#", 2);

			const mmrData = await vapi.getMMR({
				version: "v2",
				region: interaction.options.getString("region"),
				name: valoID[0],
				tag: valoID[1],
			});

			const accountData = await vapi.getAccount({
				name: valoID[0],
				tag: valoID[1],
			});

			if (mmrData.status == 404 || accountData.status == 404) {
				return await interaction.editReply({
					content: `**Error:** Cannot find __${interaction.options.getString(
						"username"
					)}__. Make sure the username is in this format - \`Name#Tag\``,
				});
			} else if (mmrData.status != 200) {
				return await interaction.editReply({
					content:
						"<@132784173311197184>\n\n" +
						"```json\n" +
						JSON.stringify(mmrData, null, 2) +
						"```",
				});
			} else if (accountData.status != 200) {
				return await interaction.editReply({
					content:
						"<@132784173311197184>\n\n" +
						"```json\n" +
						JSON.stringify(accountData, null, 2) +
						"```",
				});
			}

			let playerRankUnpatched = mmrData.data.current_data.currenttier;
			if (playerRankUnpatched == null) playerRankUnpatched = 0;
			let playerTier = `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${playerRankUnpatched}/largeicon.png`;
			let playerRank = mmrData.data.current_data.currenttierpatched;
			let playerRating = mmrData.data.current_data.ranking_in_tier;
			if (playerRating == null) playerRating = 0;
			let name = accountData.data.name;
			let tag = accountData.data.tag;
			//let playerCardSmall = accountData.data.card.small;
			let playerCardWide = "None";
			if (accountData.data.card) {
				playerCardWide = accountData.data.card.wide;
			}
			let puuid = accountData.data.puuid;
			let file, ratingColor, ratingRequired, leaderboard;

			const leaderboardData = await vapi.getLeaderboard({
				version: "v1",
				region: interaction.options.getString("region"),
				puuid: puuid,
			});

			if (leaderboardData.status != 200) {
				leaderboard = null;
			} else leaderboard = leaderboardData.data[0].leaderboardRank;

			if (playerRating <= 25) ratingColor = "#FF3333";
			else if (playerRating <= 75) ratingColor = "#FF6600";
			else ratingColor = "#00CC33";

			if (playerRankUnpatched == 24)
				ratingRequired =
					rankThreshold[`${interaction.options.getString("region")}`].immortal1;
			else if (playerRankUnpatched == 25)
				ratingRequired =
					rankThreshold[`${interaction.options.getString("region")}`].immortal2;
			else if (playerRankUnpatched == 26)
				ratingRequired =
					rankThreshold[`${interaction.options.getString("region")}`].immortal3;
			else if (playerRankUnpatched == 27) ratingRequired = playerRating;
			else ratingRequired = 100;

			Font.loadDefault();

			const card = new RankCardBuilder()
				.setDisplayName(name + "#" + tag)
				.setUsername(playerRank)
				.setAvatar(playerTier)
				.setCurrentXP(playerRating)
				.setRequiredXP(ratingRequired)
				.setProgressCalculator(() => {
					return (playerRating / ratingRequired) * 100;
				})
				.setLevel(null)
				.setRank(leaderboard)
				.setOverlay("#23272A")
				.setStatus("none")
				.setTextStyles({ xp: "RR:" })
				.setStyles({
					progressbar: { thumb: { style: { backgroundColor: ratingColor } } },
					username: { handle: { style: { "font-size": "1.5em" } } },
					statistics: {
						rank: {
							text: { style: { "font-size": "1.5em", color: "#FFFFFF" } },
							value: { style: { color: "#FFCC00" } },
						},
						xp: {
							text: { style: { "font-size": "1.5em", color: "#FFFFFF" } },
							value: { style: { color: ratingColor } },
						},
					},
				})
				.setGraphemeProvider(BuiltInGraphemeProvider.FluentEmojiFlat);

			if (playerCardWide != "None") {
				card.setBackground(playerCardWide);
			}

			const image = await card.build({
				format: "jpeg",
			});

			await interaction.editReply({ files: [image] });
		} else if (subCommand === "store") {
			await interaction.reply({
				content: "Trying to fetch your store, please wait...",
			});

			const userCreds = await valoLogin.findOne({
				where: { id: interaction.user.id },
			});
			if (!userCreds) {
				return await interaction.editReply({
					content: `Please use the </valo login:1127207637738606603> command first then try again.`,
				});
			}

			const retryButton = new ButtonBuilder()
				.setLabel("Retry")
				.setCustomId("retry_" + userCreds.username + "_" + userCreds.password)
				.setStyle(ButtonStyle.Primary)
				.setEmoji("🔁");

			const row = new ActionRowBuilder().addComponents(retryButton);

			const build = await Valo.getVersion();
			const login = await Valo.authorize(
				build,
				userCreds.username,
				userCreds.password
			);

			if (login.error) {
				return await interaction.editReply({
					content:
						"Invalid login attempt. If you are sure your credentials were correct then please check if 2FA is enabled because the bot doesn't support 2FA as of yet. If you did everything correctly, then maybe the bot is malfunctioning.",
					components: [row],
				});
			}

			login.build = build;

			const playerStore = await Valo.getStoreFront(login);

			let store;
			await vapi
				.getFeaturedItems({
					version: "v2",
				})
				.then((response) => {
					store = response;
				})
				.catch((error) => {
					logger.error(error);
				});

			const embeds = [];

			for (const bundle of store.data) {
				const bundleUUID = bundle.bundle_uuid;
				const bundleData = await axios.get(
					`https://valorant-api.com/v1/bundles/${bundleUUID}`
				);
				const embed = new EmbedBuilder()
					.setTitle(bundleData.data.data.displayName)
					.setColor("FA4454")
					.setImage(bundleData.data.data.displayIcon);

				if (
					bundleData.data.data.promoDescription !=
					bundleData.data.data.extraDescription
				) {
					embed.setDescription(
						bundleData.data.data.extraDescription +
							"\n\n" +
							bundleData.data.data.promoDescription
					);
				} else if (bundleData.data.data.extraDescription) {
					embed.setDescription(bundleData.data.data.extraDescription);
				}

				embeds.push(embed);
			}

			if (!playerStore) {
				return await interaction.editReply({
					content:
						"Invalid login attempt. If you are sure your credentials were correct then please check if 2FA is enabled because the bot doesn't support 2FA as of yet.",
				});
			}

			const skins = await fetchStoreSkins(playerStore);

			for (const skin of skins) {
				const skinEmbed = new EmbedBuilder()
					.setColor("#2B2D31")
					.setTitle(skin.name)
					.setThumbnail(skin.icon)
					.setDescription("<:VP:1077169497582080104> " + skin.cost);
				embeds.push(skinEmbed);
			}

			await interaction.deleteReply().catch(console.error);

			await interaction.channel.send({
				content: userMention(interaction.user.id),
				embeds: embeds,
			});
		} else if (subCommand === "login") {
			const modal = new ModalBuilder()
				.setCustomId("valoLogin")
				.setTitle("Valorant Login");

			const usernameInput = new TextInputBuilder()
				.setCustomId("username")
				.setLabel("Username")
				.setStyle(TextInputStyle.Short)
				.setRequired(true);

			const passwordInput = new TextInputBuilder()
				.setCustomId("password")
				.setLabel("Password")
				.setStyle(TextInputStyle.Short)
				.setRequired(true);

			const firstInput = new ActionRowBuilder().addComponents(usernameInput);
			const secondInput = new ActionRowBuilder().addComponents(passwordInput);

			modal.addComponents(firstInput, secondInput);

			await interaction.showModal(modal);

			const submit = await interaction
				.awaitModalSubmit({
					time: 60000,
					filter: (i) => i.user.id === interaction.user.id,
				})
				.catch((error) => {
					logger.error("Valo Login Modal Error");
					console.error(error);
					return null;
				});

			if (submit) {
				let username = submit.fields.getTextInputValue("username");
				let password = submit.fields.getTextInputValue("password");
				let id = interaction.user.id;

				const [credentials, created] = await valoLogin.findOrCreate({
					where: { id: id },
					defaults: { id: id, username: username, password: password },
				});

				if (!created) {
					await valoLogin.update(
						{ username: username, password: password },
						{ where: { id: id } }
					);
					return await submit
						.reply({
							content: `Successfully updated your Valorant credentials.`,
							ephemeral: true,
						})
						.catch(console.error);
				}
				return await submit.reply({
					content: `Successfully stored your Valorant credentials.`,
					ephemeral: true,
				});
			} else {
				await interaction.followUp({
					content: "Request timed out. Please try again.",
					ephemeral: true,
				});
			}
		}
	},
};

async function createScoreboard(interaction, players, map, date, file) {
	const scoreboardImage = await Jimp.read("ValorantScoreboardOverlay.png");

	await interaction.editReply({ content: "Loading agent images..." });

	const agents = {};

	for (const agent in agentsData) {
		agents[agent] = await Jimp.read(agentsData[agent].displayIcon);
		agents[agent].resize(64, 64);
	}

	await interaction.editReply({
		content: "Loading map image for " + map + "...",
	});

	if (map == "The Range") {
		return await interaction.editReply({
			content: "Bruh... You were in The Range.",
		});
	}

	const mapImage = await Jimp.read(mapsData[map].splash);
	await mapImage.resize(1920, 1080);

	await interaction.editReply({ content: "Loading fonts..." });

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

	await interaction.editReply({ content: "Creating scoreboard..." });

	mapImage.composite(scoreboardImage, 0, 0);

	for (i = 0, id = 0; i < 500; i += 100, id += 1) {
		const redAgent = players.red[id].character.replace("/", "_");
		const blueAgent = players.blue[id].character.replace("/", "_");
		// Agent
		mapImage.composite(agents[redAgent], agentX, agentY + i); //Red
		mapImage.composite(agents[blueAgent], agentX + agentDiff, agentY + i); //Blue

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

async function fetchNightmarketSkins(rawNightMarket) {
	const skins = [];

	for (const record of rawNightMarket) {
		const skin = await axios.get(
			"https://valorant-api.com/v1/weapons/skinlevels/" + record.Offer.OfferID
		);

		const discountCostsArray = Object.values(record.DiscountCosts);
		const discountCosts = discountCostsArray[0];
		const skinData = {
			name: skin.data.data.displayName,
			icon: skin.data.data.displayIcon,
			offerId: record.Offer.OfferID,
			discountPercent: record.DiscountPercent.toString(),
			discountCosts: discountCosts.toString(),
		};
		skins.push(skinData);
	}

	return skins;
}

async function fetchStoreSkins(rawStore) {
	const skins = [];

	for (const record of rawStore) {
		const skin = await axios.get(
			"https://valorant-api.com/v1/weapons/skinlevels/" + record.OfferID
		);

		const costsArray = Object.values(record.Cost);
		const cost = costsArray[0];
		const skinData = {
			name: skin.data.data.displayName,
			icon: skin.data.data.displayIcon,
			offerId: record.OfferID,
			cost: cost.toString(),
		};
		skins.push(skinData);
	}

	return skins;
}
