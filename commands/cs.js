const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../Logger/logger.js");
const SteamID = require("steamid");
const cheerio = require("cheerio");
const cloudscraper = require("cloudscraper");

// const Sequelize = require('sequelize');
// const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
//     host: process.env.DB_IP,
//     dialect: 'mysql',
//     logging: false
// });
// const csgoRanks = require("../Models/csgoRanks")(sequelize, Sequelize.DataTypes);

const RANK_NAMES = [
    "Unranked",
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

            let userStats = await getPlayerInfo(url);

            if (userStats === 0) {
                return await interaction.editReply({ content: `No matches have been added for \`${steamId}\`.` });
            } else if (userStats === -1) {
                return await interaction.editReply({ content: `An error occured while fetching data for \`${steamId}\`.` });
            }

            logger.debug("userStats.rank: " + userStats.rank);

            const embed = new EmbedBuilder()
                .setTitle(`${userStats.name}'s CS:GO Rank`)
                .setDescription(`## ` + RANK_NAMES[userStats.rank])
                .setThumbnail(`https://static.csgostats.gg/images/ranks/${userStats.rank}.png`)
                .addFields(
                    { name: "Best Rank", value: RANK_NAMES[userStats.bestRank], inline: false }
                )
                .setColor("Random");

            await interaction.editReply({ content: "", embeds: [embed] });
        }
	},
};

async function getPlayerInfo(url) {
    const html = await cloudscraper.get(url);

    if (html.includes("No matches have been added for this player")) {
        return 0;
    }

    const $ = cheerio.load(html);

    const rankContainer = $('.player-ranks');
    const playerContainer = $('.player-ident-outer');
    const playerName = playerContainer.find('#player-name').text().trim();
    
    if (rankContainer.length > 0) {
        const rankImages = rankContainer.find('img[src]');
        const playerData = {};

        playerData.rank = getRank(0, rankImages);
        playerData.bestRank = getRank(1, rankImages);

        if (playerData.rank == null) playerData.rank = 0;
        if (playerData.bestRank == null) playerData.bestRank = playerData.rank;

        playerData.name = playerName;

        return playerData;
    } else return -1;
}

function getRank(index, rankImages) {
    if (index >= rankImages.length) {
      return null;
    }

    const imageSrc = rankImages.eq(index).attr('src');
    const rankIndex = parseInt(imageSrc.split('/ranks/')[1].split('.png')[0]);

    logger.debug("rankIndex: " + rankIndex);

    return rankIndex;
};