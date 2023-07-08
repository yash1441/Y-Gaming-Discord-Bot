const { SlashCommandBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const logger = require("../Logger/logger.js");
const SteamID = require('steamid');
const axios = require("axios").default;

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
    try {
        const response = await axios.get(url, { 
            headers: {
                Cookie: "cookie=_ga=GA1.2.1019535976.1679595662;",
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
            }
        });
        console.log(response.data);
    } catch (error) {
        console.log('error');
    }
}