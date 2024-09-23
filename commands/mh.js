const { SlashCommandBuilder } = require("discord.js");
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

		const monster = await getRandomMonster(monstersData);

		await interaction.editReply({ content: monster.name });
	},
};

async function getRandomMonster(monstersData) {
	const randomIndex = Math.floor(Math.random() * monstersData.length);
	return monstersData[randomIndex];
}
