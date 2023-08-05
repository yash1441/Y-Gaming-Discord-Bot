const { EmbedBuilder } = require("discord.js");
const logger = require("../Logger/logger.js");
const cheerio = require("cheerio");
const cloudscraper = require("cloudscraper");

const Sequelize = require('sequelize');
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
    host: process.env.DB_IP,
    dialect: 'mysql',
    logging: false
});
const csgoRanks = require("../Models/csgoRanks")(sequelize, Sequelize.DataTypes);

async function getMultiLink(status) {
    let url = "https://csgostats.gg/player/multi?";

    for (const [index, player] of status.entries()) {
        let playerName = encodeURI(player.name.replace('#', '%23'));
        url += `data[${index}][0]=${playerName}&data[${index}][1]=${player.steamId}&`;
    }

    return url;
}

async function getMultiPlayerInfo(status) {
    const players = status;
    const url = await getMultiLink(status);
    const html = await cloudscraper.get(url);

    const $ = cheerio.load(html);
    const table = $('#player-data-table');
    const rankRow = table.find('tr[data-type-row="rank"]');

    let rankData = rankRow.find('td img').map((index, element) => $(element).attr('data-rank-value')).get();

    for (const [index, player] of players.entries()) {
        if (!rankData[index]) rankData[index] = 0;
        player.rank = parseInt(rankData[index]);
    }

    return players;
}

async function getStatusEmbed(message) {
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
        embed.addFields({ name: player.name, value: RANK_NAMES[player.rank], inline: false });
    }

    await interaction.editReply({ content: "", embeds: [embed] });

    for (const player of multiPlayerInfo) {
        const [dbRank, created] = await csgoRanks.findOrCreate({ where: { steam_id: player.steamId }, defaults: { steam_id: player.steamId, current_rank: player.rank } });
        if (!created) {
            if (dbRank.current_rank != 0 && player.rank == 0) player.rank = dbRank.current_rank;
            await csgoRanks.update({ current_rank: player.rank }, { where: { steam_id: player.steamId } });
        }
    }

    return embed;
}

module.exports = { getStatusEmbed };