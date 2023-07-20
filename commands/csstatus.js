const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } = require("discord.js");
const logger = require("../Logger/logger.js");
const SteamID = require("steamid");
const cheerio = require("cheerio");
const cloudscraper = require("cloudscraper");

const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_IP,
    dialect: 'mysql',
    logging: false
});
const csgoRanks = require("../Models/csgoRanks")(sequelize, Sequelize.DataTypes);

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
	data: new ContextMenuCommandBuilder()
		.setName("Get Ranks")
		.setType(ApplicationCommandType.Message),

	async execute(interaction) {
        await interaction.reply({ content: "Checking if it is a valid CS:GO status message..." });

		const message = interaction.targetMessage;
		if (message.embeds.length > 0) {
            return await interaction.editReply({ content: "This is not a valid CS:GO status message." });
        }

        await interaction.editReply({ content: "Collecting player names and Steam IDs..." });

        const regex = /(\d+)\s+(\d+)\s+"([^"]+)"\s+([^\s]+)/g;
        let match;
        const status = [];

        while ((match = regex.exec(message.content)) !== null) {
            const [, userid, , name, steamId] = match;
            status.push({ name, steamId });
        }

        const link = await getMultiLink(status);
        logger.debug(link);

        const embed = new EmbedBuilder()
            .setTitle("CS:GO Status Ranks")
            .setColor("Random");

        for (const player of status) {
            await interaction.editReply({ content: `Getting rank for ${player.name}...` });
            let sid = new SteamID(player.steamId);

            let userStats = await getPlayerRank(sid.getSteamID64());

            if (userStats === 0) {
                embed.addFields({ name: player.name, value: "Unranked", inline: true });
            } else if (userStats === -1) {
                embed.addFields({ name: player.name, value: "Error", inline: true });
            } else {
                embed.addFields({ name: player.name, value: RANK_NAMES[userStats.rank], inline: true });
            }
        }

        await interaction.editReply({ content: "", embeds: [embed] });
	},
};

async function getMultiLink(status) {
    let url = "https://csgostats.gg/player/multi?";

    for (const [index, player] of status) {
        url += `data[${index}][0]=${player.name}&data[${index}][1]=${player.player.steamId}&`;
    }

    return url;
}

async function getPlayerRank(steamId) {
    const url = "https://csgostats.gg/player/" + steamId;
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

        if (playerData.rank == null) playerData.rank = 0;
        if (playerData.bestRank == null) playerData.bestRank = playerData.rank;

        const [userRanks, created] = await csgoRanks.findOrCreate({ where: { steam_id: steamId }, defaults: { steam_id: steamId, current_rank: playerData.rank, best_rank: playerData.bestRank } });
        if (!created) {
            if (userRanks.current_rank != 0 && playerData.rank == 0) playerData.rank = userRanks.current_rank;
            if (userRanks.best_rank != 0 && playerData.bestRank == 0) playerData.bestRank = userRanks.best_rank;
            await csgoRanks.update({ current_rank: playerData.rank, best_rank: playerData.bestRank }, { where: { steam_id: steamId } });
        }

        return playerData;
    } else return -1;
}

function getRank(index, rankImages) {
    if (index >= rankImages.length) {
      return null;
    }

    const imageSrc = rankImages.eq(index).attr('src');
    const rankIndex = parseInt(imageSrc.split('/ranks/')[1].split('.png')[0]);

    return rankIndex;
};