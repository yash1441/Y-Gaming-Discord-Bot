const { SlashCommandBuilder, MessageFlags } = require("discord.js");
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
						.setName("letters")
						.setDescription("Gimme the letters")
						.setRequired(true)
				)
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		if (interaction.options.getSubcommand() === "unscramble") {
			const scrambledText = interaction.options.getString("letters");
			const response = await axios.get(
				"https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0"
			);
			const pokemonNames = response.data.results.map(
				(pokemon) => pokemon.name
			);

			const unscrambledPokemon = pokemonNames.filter((name) => {
				const nameLetters = name.split("").sort().join("");
				const scrambledLetters = scrambledText
					.split("")
					.sort()
					.join("");
				return scrambledLetters === nameLetters;
			});

			const result =
				unscrambledPokemon.join(", ") || "No matching Pokémon found.";
			await interaction.editReply({
				content: result,
			});
		}
	},
};
