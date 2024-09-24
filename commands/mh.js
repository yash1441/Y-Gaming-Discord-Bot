const {
	SlashCommandBuilder,
	EmbedBuilder,
	AttachmentBuilder,
	bold,
	Colors,
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
						.setAutocomplete(true)
						.setRequired(true)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("random-monster")
				.setDescription("Gives a random monster")
				.addStringOption((option) =>
					option
						.setName("size")
						.setDescription("The size of the monster")
						.addChoices(
							{ name: "Small", value: "small" },
							{ name: "Large", value: "large" }
						)
						.setRequired(false)
				)
		),
	async autocomplete(interaction) {
		const focusedValue = interaction.options
			.getFocused()
			.toLowerCase()
			.split(" ");
		const choices = monstersData.map((monster) => monster.name).slice();
		const filtered = choices
			.filter((choice) => {
				const choiceLower = choice.toLowerCase();
				return (
					focusedValue.every((word) => choiceLower.includes(word)) ||
					focusedValue.some((word) => choiceLower.includes(word))
				);
			})
			.sort((a, b) => {
				const aScore = focusedValue.reduce(
					(score, word) =>
						score + (a.toLowerCase().includes(word) ? 1 : 0),
					0
				);
				const bScore = focusedValue.reduce(
					(score, word) =>
						score + (b.toLowerCase().includes(word) ? 1 : 0),
					0
				);
				return bScore - aScore;
			})
			.slice(0, 25);
		await interaction.respond(
			filtered.map((choice) => ({ name: choice, value: choice }))
		);
	},
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
				)
				.setColor(Colors.Blurple);

			await interaction.editReply({ embeds: [embed], files: [file] });
		} else if (interaction.options.getSubcommand() === "random-monster") {
			const type = interaction.options.getString("size");

			let monsterIndexMin = 0;
			let monsterIndexMax = 58;

			type === "small" ? (monsterIndexMax = 15) : null;
			type === "large" ? (monsterIndexMin = 16) : null;

			const monsterIndex = Math.floor(
				Math.random() * (monsterIndexMax - monsterIndexMin + 1) +
					monsterIndexMin
			);

			const monster = monstersData[monsterIndex];

			const file = new AttachmentBuilder(
				"./Images/MHW/Monsters/Icons/" +
					escapeStuff(monster.name) +
					".png"
			);

			const embed = new EmbedBuilder()
				.setTitle(monster.name)
				.setDescription(monster.description)
				.addFields(
					{
						name: "Species",
						value: monster.species,
						inline: true,
					},
					{
						name: "Size",
						value: monster.type,
						inline: true,
					}
				)
				.setThumbnail(
					"attachment://" + escapeStuff(monster.name) + ".png"
				)
				.setColor(Colors.Blurple);

			await interaction.editReply({ embeds: [embed], files: [file] });
		}
	},
};

function escapeStuff(string) {
	return string.replace(/ /g, "_").replace("'", "__");
}
