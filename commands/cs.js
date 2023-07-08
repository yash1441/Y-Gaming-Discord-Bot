const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const logger = require("../Logger/logger.js");
const SteamID = require('steamid');
const axios = require("axios").default;
const osmosis = require('osmosis');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("cs")
		.setDescription("Commands related to Counter-Strike.")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("rank")
				.setDescription("Get the CS:GO rank of a player.")
                .addStringOption((option) =>
                    option
                        .setName("steam-id")
                        .setDescription("Enter the Steam ID of the player. Example: STEAM_1:1:123456789")
                        .setRequired(true)
                    )
		),
	async execute(interaction) {
		const subCommand = interaction.options.getSubcommand();

        if (subCommand === "rank") {
            await interaction.reply({ content: "Checking if it is a valid Steam ID...", ephemeral: true });
            
            const steamId = interaction.options.getString("steam-id");

            if (!steamId.startsWith("STEAM_")) {
                return await interaction.editReply({ content: `\`${steamId}\` is an invalid Steam ID.` });
            }

            let sid = new SteamID(steamId);
            let url = "https://csgostats.gg/player/" + sid.getSteamID64();

            await getPlayerRank(url, interaction);

            await interaction.editReply({ content: `\`${steamId}\` is a valid Steam ID.` });
        }
	},
};

async function getPlayerRank(url, interaction) {
    await osmosis.get(url).log(console.log).error(console.log).debug(console.log);
}