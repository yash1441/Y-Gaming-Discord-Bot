const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const canvacord = require("canvacord");
const HenrikDevValorantAPI = require("unofficial-valorant-api");
const vapi = new HenrikDevValorantAPI();

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
		//let playerRank = mmrData.data.current_data.currenttierpatched;
		let playerRating = mmrData.data.current_data.ranking_in_tier;
		if (playerRating == null) playerRating = 0;
		let name = accountData.data.name;
		//let tag = accountData.data.tag;
		//let playerCardSmall = accountData.data.card.small;
		let playerCardWide = accountData.data.card.wide;
		let puuid = accountData.data.puuid;
		let file, ratingColor, ratingRequired, leaderboard;

		if (playerRankUnpatched == 27) {
			const leaderboardData = await vapi.getLeaderboard({
				version: "v1",
				region: interaction.options.getString("region"),
				puuid: puuid,
			});

			if (leaderboardData.status != 200) {
				return await interaction.editReply({
					content:
						"<@132784173311197184>\n\n" +
						"```json\n" +
						JSON.stringify(leaderboardData, null, 2) +
						"```",
				});
			}

			leaderboard = leaderboardData.data[0].leaderboardRank;
		}

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
			.setUsername(name)
			.setDiscriminator("0000")
			.setCurrentXP(playerRating, ratingColor)
			.setRequiredXP(ratingRequired)
			.setBackground("IMAGE", playerCardWide);

		if (playerRankUnpatched == 27) rankCard.setLevel(leaderboard, "#", true);

		await rankCard.build().then((buffer) => {
			file = `${name}-RankCard.png`;
			canvacord.write(buffer, file);
		});

		await interaction.editReply({ files: [file] });

		fs.unlinkSync(file);
	},
};
