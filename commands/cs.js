const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../Logger/logger.js");
const SteamID = require("steamid");
const cheerio = require("cheerio");
const cloudscraper = require("cloudscraper");

const RANK_NAMES = [
    "Silver I",
    "Silver II",
    "Silver III",
    "Silver IV",
    "Silver Elite",
    "Silver Elite Master",
    "Gold Nova I",
    "Gold Nova II",
    "Gold Nova III",
    "Gold Nova Master",
    "Master Guardian I",
    "Master Guardian II",
    "Master Guardian Elite",
    "Distinguished Master Guardian",
    "Legendary Eagle",
    "Legendary Eagle Master",
    "Supreme Master First Class",
    "The Global Elite",
];

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
            await interaction.reply({ content: "Checking if it is a valid Steam ID..." });
            
            const steamId = interaction.options.getString("steam-id");

            if (!steamId.startsWith("STEAM_")) {
                return await interaction.editReply({ content: `\`${steamId}\` is an invalid Steam ID.` });
            }

            let sid = new SteamID(steamId);
            let url = "https://csgostats.gg/player/" + sid.getSteamID64();

            let userStats = await getPlayerRank(url);

            if (userStats === 0) {
                return await interaction.editReply({ content: `No matches have been added for \`${steamId}\`.` });
            } else if (userStats === -1) {
                return await interaction.editReply({ content: `An error occured while fetching data for \`${steamId}\`.` });
            }

            console.log({ userStats });

            const embed = new EmbedBuilder()
                .setTitle(`${interaction.user.username}'s CS:GO Rank`)
                .setDescription(`## ` + RANK_NAMES[userStats.rank])
                .setThumbnail(`https://static.csgostats.gg/images/ranks/${userStats.rank + 1}.png`)
                .addFields(
                    { name: "Best Rank", value: userStats.bestRank !== null ? RANK_NAMES[userStats.bestRank] : RANK_NAMES[userStats.rank], inline: false }
                )
                .setColor("Random");

            await interaction.editReply({ content: "", embeds: [embed] });
        }
	},
};

async function getPlayerRank(url) {
    const html = await cloudscraper.get(url);

    if (html.includes("No matches have been added for this player")) {
        return 0;
    }

    const $ = cheerio.load(html);

    const rankContainer = $('.player-ranks');
    
    if (rankContainer.length > 0) {
        const rankImages = rankContainer.find('img[src]');
        const playerData = {};

        playerData.rank = getRank(0, rankImages);
        playerData.bestRank = getRank(1, rankImages);

        return playerData;
    } else return -1;
}

function getRank(index, rankImages) {
    if (index >= rankImages.length) {
      return null;
    }

    const imageSrc = rankImages.eq(index).attr('src');
    const rankIndex = parseInt(imageSrc.split('/ranks/')[1].split('.png')[0]) - 1;

    return rankIndex;
};