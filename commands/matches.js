const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const HenrikDevValorantAPI = require("unofficial-valorant-api");
const vapi = new HenrikDevValorantAPI();

module.exports = {
	data: new SlashCommandBuilder()
		.setName("matches")
		.setDescription("Match history")
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
		)
		.addIntegerOption((option) =>
			option
				.setName("number")
				.setDescription("Number of matches")
				.setRequired(false)
		),
	async execute(interaction, client) {
		await interaction.deferReply();

		if (!interaction.options.getString("username").includes("#")) {
			return await interaction.editReply({
				content: `**Error:** Cannot find __${interaction.options.getString(
					"username"
				)}__. Make sure the username is in this format - \`Name#Tag\``,
			});
		}

		let number;

		interaction.options.getInteger("number") == null
			? (number = 5)
			: (number = interaction.options.getInteger("number"));

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
	},
};
