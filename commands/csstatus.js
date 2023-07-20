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

        const multiPlayerInfo = await getMultiPlayerInfo(status);

        const embed = new EmbedBuilder()
            .setTitle("CS:GO Status Ranks")
            .setColor("Random");

        for (const player of multiPlayerInfo) {
            await interaction.editReply({ content: `Getting rank for ${player.name}...` });
            embed.addFields({ name: player.name, value: RANK_NAMES[player.rank], inline: true });
        }

        await interaction.editReply({ content: "", embeds: [embed] });

        for (const player of multiPlayerInfo) {
            const [dbRank, created] = await csgoRanks.findOrCreate({ where: { steam_id: player.steamId }, defaults: { steam_id: player.steamId, current_rank: player.rank } });
            if (!created) {
                if (dbRank.current_rank != 0 && player.rank == 0) player.rank = dbRank.current_rank;
                await csgoRanks.update({ current_rank: player.rank }, { where: { steam_id: player.steamId } });
            }

        }
    },
};

async function getMultiLink(status) {
    let url = "https://csgostats.gg/player/multi?";

    for (const [index, player] of status.entries()) {
        url += `data[${index}][0]=${player.name}&data[${index}][1]=${player.steamId}&`;
    }

    return encodeURI(url);
}

async function getMultiPlayerInfo(status) {
    const players = status;
    const url = await getMultiLink(status);
    const html = await cloudscraper.get(url);

    if (html.includes("No matches have been added for this player")) {
        return 0;
    }

    const $ = cheerio.load(html);

    // Find the table element by its ID
    const table = $('#player-data-table');

    // Find the "rank" row by its data-type-row attribute
    const rankRow = table.find('tr[data-type-row="rank"]');

    // Extract the data from the "rank" row
    let rankData = rankRow.find('td img').map((index, element) => $(element).attr('data-rank-value')).get();

    for (const [index, player] of players.entries()) {
        if (!rankData[index]) rankData[index] = 0;
        player.rank = parseInt(rankData[index]);
    }

    return players;
}