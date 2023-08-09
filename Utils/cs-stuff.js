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

const ranks = [
    {
        name: "Unranked",
        emoji: "<:unranked:>"
    },
    {
        name: "Silver I",
        emoji: "<:s1:>"
    },
    {
        name: "Silver II",
        emoji: "<:s2:>"
    },
    {
        name: "Silver III",
        emoji: "<:s3:>"
    },
    {
        name: "Silver IV",
        emoji: "<:s4:>"
    },
    {
        name: "Silver Elite",
        emoji: "<:se:>"
    },
    {
        name: "Silver Elite Master",
        emoji: "<:sem:>"
    },
    {
        name: "Gold Nova I",
        emoji: "<:gn1:>"
    },
    {
        name: "Gold Nova II",
        emoji: "<:gn2:>"
    },
    {
        name: "Gold Nova III",
        emoji: "<:gn3:>"
    },
    {
        name: "Gold Nova Master",
        emoji: "<:gnm:>"
    },
    {
        name: "Master Guardian I",
        emoji: "<:mg1:>"
    },
    {
        name: "Master Guardian II",
        emoji: "<:mg2:>"
    },
    {
        name: "Master Guardian Elite",
        emoji: "<:mge:>"
    },
    {
        name: "Distinguished Master Guardian",
        emoji: "<:dmg:>"
    },
    {
        name: "Legendary Eagle",
        emoji: "<:le:>"
    },
    {
        name: "Legendary Eagle Master",
        emoji: "<:lem:>"
    },
    {
        name: "Supreme Master First Class",
        emoji: "<:smfc:>"
    },
    {
        name: "The Global Elite",
        emoji: "<:ge:>"
    },

]

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
        embed.addFields({ name: player.name, value: ranks[player.rank].name, inline: false });
    }

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