const { EmbedBuilder, bold } = require("discord.js");
const SteamID = require("steamid");
const cheerio = require("cheerio");
const cloudscraper = require("cloudscraper");
const axios = require("axios").default;
const fs = require("fs");
const path = require("path");
const logger = require("../Logger/logger.js");

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

async function getPlayerEmbed(steamId) {
    const sid = new SteamID(steamId);
    const steamId64 = sid.getSteamID64()

    let userStats = await getPlayerInfo(steamId64);

    if (userStats == 0) return 0;
    if (userStats == -1) return -1;

    const embed = new EmbedBuilder()
        .setTitle(`${escapeMarkdown(userStats.name)}'s CS:GO Rank`)
        .setDescription(`## ` + ranks[userStats.rank].name)
        .setThumbnail(`https://static.csgostats.gg/images/ranks/${userStats.rank}.png`)
        .addFields(
            { name: "Best Rank", value: ranks[userStats.bestRank].emoji + " " + ranks[userStats.bestRank].name, inline: false }
        )
        .setColor("Random");

    return embed;
}

async function getPlayerInfo(steamId) {
    const url = "https://csgostats.gg/player/" + steamId;
    const html = await cloudscraper.get(url);

    if (html.includes("No matches have been added for this player")) {
        return 0;
    }

    const $ = cheerio.load(html);

    const rankContainer = $('.csgo-rank');
    const playerName = $('#player-name').text().trim();
    const csgoCurrentRankImage = $('#csgo-rank .rank img').attr('src');
    const csgoCurrentRank = getPlayerRankIndex(csgoCurrentRankImage);
    const csgoBestRankImage = $('#csgo-rank .best img').attr('src');
    const csgoBestRank = getPlayerRankIndex(csgoBestRankImage);
    const cs2CurrentRank = $('#cs2-rank .rank .cs2rating span').text();
    const cs2CurrentRankImage = $('#cs2-rank .rank .cs2rating').css('background-image');
    const cs2BestRank = $('#cs2-rank .best .cs2rating span').text();
    const cs2BestRankImage = $('#cs2-rank .best .cs2rating').css('background-image');

    console.log({ rankContainer, playerName, csgoCurrentRankImage, csgoCurrentRank, csgoBestRankImage, csgoBestRank, cs2CurrentRank, cs2CurrentRankImage, cs2BestRank, cs2BestRankImage });
    

    if (rankContainer.length > 0) {
        const rankImages = rankContainer.find('img[src]');
        console.log({ rankImages });
        const playerData = {};

        playerData.rank = getPlayerRankIndex(0, rankImages);
        playerData.bestRank = getPlayerRankIndex(1, rankImages);

        if (playerData.rank == null) playerData.rank = 0;
        if (playerData.bestRank == null) playerData.bestRank = playerData.rank;

        const [userRanks, created] = await csgoRanks.findOrCreate({ where: { steam_id: steamId }, defaults: { steam_id: steamId, current_rank: playerData.rank, best_rank: playerData.bestRank } });
        if (!created) {
            if (userRanks.current_rank != 0 && playerData.rank == 0) playerData.rank = userRanks.current_rank;
            if (userRanks.best_rank != 0 && playerData.bestRank == 0) playerData.bestRank = userRanks.best_rank;
            await csgoRanks.update({ current_rank: playerData.rank, best_rank: playerData.bestRank }, { where: { steam_id: steamId } });
        }

        playerData.name = playerName;

        return playerData;
    } else return -1;
}

function getPlayerRankIndex(rankImage) {
    const rankIndex = parseInt(rankImage.split('/ranks/')[1].split('.png')[0]);
    return rankIndex;
}

async function getMultiLink(status) {
    let url = "https://csgostats.gg/player/multi?";

    for (const [index, player] of status.entries()) {
        let playerName = encodeURI(player.name.replace('#', '%23'));
        url += `data[${index}][0]=${playerName}&data[${index}][1]=${player.steamId}&`;
    }

    return url;
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

function escapeMarkdown(text) {
    var unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1'); // unescape any "backslashed" character
    var escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1'); // escape *, _, `, ~, \
    return escaped;
}

async function getSkinNamesList() {
    const jsonData = fs.readFileSync(path.join(__dirname, '../Data/cs-items.json'), 'utf8');
    const itemsData = JSON.parse(jsonData);
    const itemsArray = [];

    for (const itemId in itemsData) {
        const item = itemsData[itemId];
        const itemName = item.name;
        if (itemName) itemsArray.push(itemName);
    }

    return itemsArray;

    // const data = JSON.parse(jsonData);
    // await axios.get('https://bymykel.github.io/CSGO-API/api/en/all.json').then((response) => {
    //     const itemsData = response.data;
    //     const itemsArray = [];

    //     for (const itemId in itemsData) {
    //         const item = itemsData[itemId];
    //         const itemName = item.name;
    //         if (itemName) itemsArray.push(itemName);
    //     }

    //     const itemsString = JSON.stringify(itemsData, null, 2);
    //     fs.writeFileSync(path.join(__dirname, '../Data/cs-items.json'), itemsString);
    //     logger.info('CSGO: Loaded ' + itemsArray.length + ' items.');
    //     return itemsArray;
    // });
}

async function getSkinWearsList(itemName) {
    const jsonData = fs.readFileSync(path.join(__dirname, '../Data/cs-items.json'), 'utf8');
    const itemsData = JSON.parse(jsonData);
    const wearsArray = [];

    for (const itemId in itemsData) {
        const item = itemsData[itemId];
        if (item.name == itemName && item.wears) {
            item.wears.forEach(wear => wearsArray.push(wear));
        } else continue;
    }

    if (wearsArray.length < 1) wearsArray.push('NA');

    return wearsArray;
}

async function getSkinData(skin, log) {
    const url = "https://buff-price.czernouskovi.eu/item?name=" + encodeURI(skin);
    let skinData = {};
    await axios.get(url).then((response) => {
        skinData = response.data;
        if (!skinData) skinData = { error: "Unable to find " + skin + " in the BUFF database." }
    }).catch((error) => {
        skinData = { error: "Unable to find " + skin + " in the BUFF database." }
    });

    if (log) console.log(skinData);
    return skinData;
}

module.exports = { getStatusEmbed, getPlayerEmbed, getSkinNamesList, getSkinWearsList, getSkinData };