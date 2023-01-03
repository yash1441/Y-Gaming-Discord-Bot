const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const canvacord = require("canvacord");

const dataDirectory = path.join(__dirname, "../Data");
const rankThreshold = JSON.parse(
	fs.readFileSync(path.join(dataDirectory, "rank-threshold.json"))
);

module.exports = {
	data: new SlashCommandBuilder()
		.setName("rank")
		.setDescription("Check rank in Valorant")
		.addStringOption((option) =>
			option
				.setName("region")
				.setDescription("Valorant account region")
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
				.setDescription("Valorant username with hashtag. Example: Name#Tag")
				.setRequired(true)
		),
	async execute(interaction, client) {
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
		let mmrURL =
			"https://api.henrikdev.xyz/valorant/v2/mmr/" +
			interaction.options.getString("region") +
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
					content: `**Error:** Cannot find __${interaction.options.getString(
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
					interaction.options.getString("region") +
					"?puuid=" +
					puuid;
			})
			.catch((error) => {
				interaction.editReply({
					content: `**Error:** Cannot find __${interaction.options.getString(
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
						content: `**Error:** Cannot find __${interaction.options.getString(
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
				rankThreshold[`${interaction.options.getString("region")}`].immortal1;
		else if (playerRankUnpatched == 25)
			ratingRequired =
				rankThreshold[`${interaction.options.getString("region")}`].immortal2;
		else if (playerRankUnpatched == 26)
			ratingRequired =
				rankThreshold[`${interaction.options.getString("region")}`].immortal3;
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

		await interaction.editReply({ files: [file] });

		fs.unlinkSync(file);
	},
};
