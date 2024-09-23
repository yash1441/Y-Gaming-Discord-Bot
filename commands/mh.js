const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");
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
				.setName("random-monster")
				.setDescription("Gives a random monster")
		),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: false });

		const monster =
			monstersData[Math.floor(Math.random() * monstersData.length)];

		const file = new AttachmentBuilder("./Images/MHW/Monsters/Icons/" + monster.name + ".png")

		const embed = new EmbedBuilder()
			.setTitle(monster.name)
			.setDescription(monster.description)
			.addFields({
				name: "Species",
				value: monster.species,
				inline: false,
			})
			.setThumbnail("attachment://" + encodeURI(monster.name) + ".png");

		await interaction.editReply({ embeds: [embed], files: [file] });
	},
};
