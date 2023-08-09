const { EmbedBuilder, bold } = require("discord.js");
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
        emoji: "<:unranked:1138816376497246219>"
    },
    {
        name: "Silver I",
        emoji: "<:s1:1138816485586899014>"
    },
    {
        name: "Silver II",
        emoji: "<:s2:1138816575579889816>"
    },
    {
        name: "Silver III",
        emoji: "<:s3:1138816605720158218>"
    },
    {
        name: "Silver IV",
        emoji: "<:s4:1138816638045667378>"
    },
    {
        name: "Silver Elite",
        emoji: "<:se:1138816693230108792>"
    },
    {
        name: "Silver Elite Master",
        emoji: "<:sem:1138816721948528683>"
    },
    {
        name: "Gold Nova I",
        emoji: "<:gn1:1138816766689161338>"
    },
    {
        name: "Gold Nova II",
        emoji: "<:gn2:1138816791762698393>"
    },
    {
        name: "Gold Nova III",
        emoji: "<:gn3:1138816817289244753>"
    },
    {
        name: "Gold Nova Master",
        emoji: "<:gnm:1138816869726433390>"
    },
    {
        name: "Master Guardian I",
        emoji: "<:mg1:1138816904761442306>"
    },
    {
        name: "Master Guardian II",
        emoji: "<:mg2:1138816950689091614>"
    },
    {
        name: "Master Guardian Elite",
        emoji: "<:mge:1138816976228200478>"
    },
    {
        name: "Distinguished Master Guardian",
        emoji: "<:dmg:1138817027629400196>"
    },
    {
        name: "Legendary Eagle",
        emoji: "<:le:1138817060735033374>"
    },
    {
        name: "Legendary Eagle Master",
        emoji: "<:lem:1138817083216506882>"
    },
    {
        name: "Supreme Master First Class",
        emoji: "<:smfc:1138817119182663770>"
    },
    {
        name: "The Global Elite",
        emoji: "<:ge:1138817149570404442>"
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

    let namesArray = [], ranksArray = [], steamIdArray = [];

    for (const player of multiPlayerInfo) {
        namesArray.push(bold(escapeMarkdown(player.name)));
        steamIdArray.push(player.steamId);
        ranksArray.push(ranks[player.rank].emoji);
    }

    embed.addFields(
        { name: 'Player', value: namesArray.join('\n'), inline: true },
        { name: 'Steam ID', value: steamIdArray.join('\n'), inline: true },
        { name: 'Rank', value: ranksArray.join('\n'), inline: true },
    );

    for (const player of multiPlayerInfo) {
        const [dbRank, created] = await csgoRanks.findOrCreate({ where: { steam_id: player.steamId }, defaults: { steam_id: player.steamId, current_rank: player.rank } });
        if (!created) {
            if (dbRank.current_rank != 0 && player.rank == 0) player.rank = dbRank.current_rank;
            await csgoRanks.update({ current_rank: player.rank }, { where: { steam_id: player.steamId } });
        }
    }

    return embed;
}

function escapeMarkdown(text) {
    var unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1'); // unescape any "backslashed" character
    var escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1'); // escape *, _, `, ~, \
    return escaped;
  }

module.exports = { getStatusEmbed };