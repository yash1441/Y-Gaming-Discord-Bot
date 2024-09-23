const {
	SlashCommandBuilder,
	EmbedBuilder,
	AttachmentBuilder,
	bold,
} = require("discord.js");
const logger = require("../Logger/logger.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const dataDirectory = path.join(__dirname, "../Data/");
const monstersData = JSON.parse(
	fs.readFileSync(path.join(dataDirectory, "monsters.json"))
);

module.exports = {
	data: new SlashCommandBuilder()
		.setName("mh")
		.setDescription("May the Sapphire Star guide you.")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("monster")
				.setDescription("Search for a monster")
				.addStringOption((option) =>
					option
						.setName("name")
						.setDescription("The name of the monster")
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("random-monster")
				.setDescription("Gives a random monster")
		),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: false });

		if (interaction.options.getSubcommand() === "monster") {
			const name = interaction.options.getString("name");
			const monsterIndex = monstersData.findIndex(
				(monster) => monster.name === name
			);
			if (!monsterIndex) {
				return await interaction.editReply({
					content: "Cannot find " + bold(name),
				});
			}

			const monster = monstersData[monsterIndex];

			const file = new AttachmentBuilder(
				"./Images/MHW/Monsters/Icons/" +
					escapeStuff(monster.name) +
					".png"
			);

			const embed = new EmbedBuilder()
				.setTitle(monster.name)
				.setDescription(monster.description)
				.addFields({
					name: "Species",
					value: monster.species,
					inline: false,
				})
				.setThumbnail(
					"attachment://" + escapeStuff(monster.name) + ".png"
				);

			await interaction.editReply({ embeds: [embed], files: [file] });
		} else if (interaction.options.getSubcommand() === "random-monster") {
			const monster =
				monstersData[Math.floor(Math.random() * monstersData.length)];

			const file = new AttachmentBuilder(
				"./Images/MHW/Monsters/Icons/" +
					escapeStuff(monster.name) +
					".png"
			);

			const embed = new EmbedBuilder()
				.setTitle(monster.name)
				.setDescription(monster.description)
				.addFields({
					name: "Species",
					value: monster.species,
					inline: false,
				})
				.setThumbnail(
					"attachment://" + escapeStuff(monster.name) + ".png"
				);

			await interaction.editReply({ embeds: [embed], files: [file] });
		}
	},
};

function escapeStuff(string) {
	return string.replace(/ /g, "_").replace("'", "=");
}
