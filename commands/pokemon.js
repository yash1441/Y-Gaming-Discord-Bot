const {
	SlashCommandBuilder,
	EmbedBuilder,
	AttachmentBuilder,
	bold,
	Colors,
} = require("discord.js");
const logger = require("../Logger/logger.js");
const axios = require("axios");
require("dotenv").config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName("pokemon")
		.setDescription("I wanna be the very best.")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("unscramble")
				.setDescription("Unscramble a pokemon name")
				.addStringOption((option) =>
					option
						.setName("name")
						.setDescription("Gimme the letters")
						.setRequired(true)
				)
		),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: false });

		if (interaction.options.getSubcommand() === "unscramble") {
			try {
				const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0');
				const pokemonNames = response.data.results.map(pokemon => pokemon.name);
				console.log(pokemonNames); // You can remove this line if you don't need to log the names
			} catch (error) {
				logger.error('Error fetching Pokemon data:', error);
				await interaction.followUp({ content: 'There was an error fetching the Pokemon data. Please try again later.', ephemeral: true });
				return;
			}
		}
	},
};
