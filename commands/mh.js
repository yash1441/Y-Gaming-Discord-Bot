const { SlashCommandBuilder } = require("discord.js");
const logger = require("../Logger/logger.js");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

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
		await interaction.deferReply({
			content: `Generating a random monster...`,
			ephemeral: false,
		});

		const monstersData = await axios.get("https://mhw-db.com/monsters");

        const monster = await getRandomMonster(monstersData.data);

		await interaction.editReply({ content: monster.name });
	},
};

async function getRandomMonster(monstersData) {
    const randomIndex = Math.floor(Math.random() * monstersData.length);
    return monstersData[randomIndex];
}