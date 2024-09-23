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
		.addStringOption((option) =>
			option
				.setName("random-monster")
				.setDescription("Gives a random monster")
				.setRequired(true)
		),
	async execute(interaction) {
		await interaction.deferReply({
			content: `Generating a random monster...`,
			ephemeral: false,
		});

		const monsters = axios.get("https://mhw-db.com/monsters");
		console.log(monsters);

		await interaction.editReply({ content: `Test` });
	},
};
