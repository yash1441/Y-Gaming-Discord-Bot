const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("lineup")
		.setDescription("Get lineups in Valorant")
		.addStringOption((option) =>
			option
				.setName("agent")
				.setDescription("Valorant agent")
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
				.setDescription("Valorant map")
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
				.setDescription("Valorant map bombsite")
				.setRequired(true)
				.addChoices({ name: "A", value: "A" }, { name: "B", value: "B" })
		),
	async execute(interaction, client) {
		await interaction.deferReply();

		let agent = interaction.options.getString("agent");
		let map = interaction.options.getString("map");
		let bombsite = interaction.options.getString("bombsite");

		let imageName = `${map}${bombsite}${agent}.png`;
		let file = path.join(__dirname, "../Lineups", imageName);

		console.log({ imageName, file });

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
	},
};
