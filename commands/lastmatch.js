const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const HenrikDevValorantAPI = require("unofficial-valorant-api");
const vapi = new HenrikDevValorantAPI();
const Jimp = require("jimp");
const logger = require("../Logger/logger.js");

const dataDirectory = path.join(__dirname, "../Data");
const agents = JSON.parse(
	fs.readFileSync(path.join(dataDirectory, "agents.json"))
);
const maps = JSON.parse(fs.readFileSync(path.join(dataDirectory, "maps.json")));

module.exports = {
	data: new SlashCommandBuilder()
		.setName("lastmatch")
		.setDescription("Last match scoreboard")
		.addStringOption((option) =>
			option
				.setName("region")
				.setDescription("Valorant account region")
				.setRequired(true)
				.addChoices(
					{ name: "Asia", value: "ap" },
					{ name: "Europe", value: "eu" },
					{ name: "North America", value: "na" },
					{ name: "Korea", value: "kr" },
					{ name: "Latin America", value: "latam" },
					{ name: "Brazil", value: "br" }
				)
		)
		.addStringOption((option) =>
			option
				.setName("username")
				.setDescription("Valorant username with hashtag. Example: Name#Tag")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("mode")
				.setDescription("Valorant game mode")
				.setRequired(false)
				.addChoices(
					{ name: "Competitive", value: "Competitive" },
					{ name: "Unrated", value: "Unrated" },
					{ name: "Swiftplay", value: "Swiftplay" },
					{ name: "Replication", value: "Replication" },
					{ name: "Spike Rush", value: "Spike Rush" },
					{ name: "Custom", value: "Custom" }
				)
		),
	async execute(interaction, client) {
		await interaction.deferReply();

		if (!interaction.options.getString("username").includes("#")) {
			return await interaction.editReply({
				content: `**Error:** Cannot find __${interaction.options.getString(
					"username"
				)}__. Make sure the username is in this format - \`Name#Tag\``,
			});
		}

		let valoId = "NULL",
			match;
		valoId = interaction.options.getString("username").split("#", 2);

		await vapi
			.getMatches({
				region: interaction.options.getString("region"),
				name: valoId[0],
				tag: valoId[1],
				size: 1,
				filter: interaction.options.getString("mode"),
			})
			.then((response) => {
				match = response;
			})
			.catch((er) => {
				console.log(er);
			});

		if (match.error) {
			interaction.editReply({
				content: `**Error:** Cannot find __${interaction.options.getString(
					"username"
				)}__. Make sure the username is in this format - \`Name#Tag\`\n${
					match.error
				}`,
			});
			return;
		}

		if (match.data[0] == undefined || match.data[0] == undefined) {
			interaction.editReply({
				content: `**Error:** Cannot find last match data for __${interaction.options.getString(
					"username"
				)}__.`,
			});
			return;
		}

		let players = {
			red: [],
			blue: [],
			red_score: match.data[0].teams.red.rounds_won,
			blue_score: match.data[0].teams.blue.rounds_won,
		};

		let map = match.data[0].metadata.map;
		let date = match.data[0].metadata.game_start_patched;
		let matchid = match.data[0].metadata.matchid;
		let file = `${matchid}.png`;

		match.data[0].players.red.forEach(function (player) {
			let temp = {
				puuid: player.puuid,
				name: player.name,
				tag: player.tag,
				character: player.character,
				currenttier: player.currenttier,
				currenttier_patched: player.currenttier_patched,
				stats: {
					kills: player.stats.kills,
					deaths: player.stats.deaths,
					assists: player.stats.assists,
					headshots: player.stats.headshots,
					nonheadshots: player.stats.bodyshots + player.stats.legshots,
					damage: player.damage_made,
				},
			};

			players.red.push(temp);
		});

		match.data[0].players.blue.forEach(function (player) {
			let temp = {
				puuid: player.puuid,
				name: player.name,
				tag: player.tag,
				character: player.character,
				currenttier: player.currenttier,
				currenttier_patched: player.currenttier_patched,
				stats: {
					kills: player.stats.kills,
					deaths: player.stats.deaths,
					assists: player.stats.assists,
					headshots: player.stats.headshots,
					nonheadshots: player.stats.bodyshots + player.stats.legshots,
					damage: player.damage_made,
				},
			};

			players.blue.push(temp);
		});

		await createScoreboard(players, map, date, file);

		await interaction.editReply({ files: [file] });

		fs.unlinkSync(file);
	},
};

async function createScoreboard(players, map, date, file) {
	const scoreboardImage = await Jimp.read("ValorantScoreboardOverlay.png");
	let mapImage;

	logger.debug("Loading agent images...");

	const Fade = await Jimp.read(agents.Fade["displayIcon"]);
	const Breach = await Jimp.read(agents.Breach["displayIcon"]);
	const Raze = await Jimp.read(agents.Raze["displayIcon"]);
	const Chamber = await Jimp.read(agents.Chamber["displayIcon"]);
	const KAY_O = await Jimp.read(agents["KAY/O"]["displayIcon"]);
	const Skye = await Jimp.read(agents.Skye["displayIcon"]);
	const Cypher = await Jimp.read(agents.Cypher["displayIcon"]);
	const Viper = await Jimp.read(agents.Viper["displayIcon"]);
	const Reyna = await Jimp.read(agents.Reyna["displayIcon"]);
	const Neon = await Jimp.read(agents.Neon["displayIcon"]);
	const Jett = await Jimp.read(agents.Jett["displayIcon"]);
	const Killjoy = await Jimp.read(agents.Killjoy["displayIcon"]);
	const Brimstone = await Jimp.read(agents.Brimstone["displayIcon"]);
	const Omen = await Jimp.read(agents.Omen["displayIcon"]);
	const Sage = await Jimp.read(agents.Sage["displayIcon"]);
	const Astra = await Jimp.read(agents.Astra["displayIcon"]);
	const Sova = await Jimp.read(agents.Sova["displayIcon"]);
	const Yoru = await Jimp.read(agents.Yoru["displayIcon"]);
	const Phoenix = await Jimp.read(agents.Phoenix["displayIcon"]);
	const Harbor = await Jimp.read(agents.Harbor["displayIcon"]);

	Fade.resize(64, 64);
	Breach.resize(64, 64);
	Raze.resize(64, 64);
	Chamber.resize(64, 64);
	KAY_O.resize(64, 64);
	Skye.resize(64, 64);
	Cypher.resize(64, 64);
	Viper.resize(64, 64);
	Reyna.resize(64, 64);
	Neon.resize(64, 64);
	Jett.resize(64, 64);
	Killjoy.resize(64, 64);
	Brimstone.resize(64, 64);
	Omen.resize(64, 64);
	Sage.resize(64, 64);
	Astra.resize(64, 64);
	Sova.resize(64, 64);
	Yoru.resize(64, 64);
	Phoenix.resize(64, 64);
	Harbor.resize(64, 64);

	logger.debug("Loading map image for " + map + "...");

	switch (map) {
		case "Ascent":
			mapImage = await Jimp.read(maps.Ascent["splash"]);
			break;
		case "Bind":
			mapImage = await Jimp.read(maps.Bind["splash"]);
			break;
		case "Haven":
			mapImage = await Jimp.read(maps.Haven["splash"]);
			break;
		case "Split":
			mapImage = await Jimp.read(maps.Split["splash"]);
			break;
		case "Icebox":
			mapImage = await Jimp.read(maps.Icebox["splash"]);
			break;
		case "Breeze":
			mapImage = await Jimp.read(maps.Breeze["splash"]);
			break;
		case "Fracture":
			mapImage = await Jimp.read(maps.Fracture["splash"]);
			break;
		case "Pearl":
			mapImage = await Jimp.read(maps.Pearl["splash"]);
			break;
		case "Lotus":
			mapImage = await Jimp.read(maps.Lotus["splash"]);
			break;
		default:
			mapImage = await Jimp.read(maps["The Range"]);
			break;
	}
	await mapImage.resize(1920, 1080);

	logger.debug("Loading fonts...");

	const font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
	const font64 = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
	const font128 = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);
	const agentX = 55,
		agentY = 485,
		agentDiff = 1750;
	const nameX = 140,
		nameY = 500,
		nameDiff = 990,
		nameWrap = 435;
	const killX = 625,
		deathX = 698,
		assistX = 773;
	const scoreX = 845,
		scoreY = 155,
		scoreDiff = 230;
	const mapX = 960,
		mapY = 10,
		mapDiff = 12.5;

	logger.debug("Creating scoreboard...");

	mapImage.composite(scoreboardImage, 0, 0);

	for (i = 0, id = 0; i < 500; i += 100, id += 1) {
		// Agent
		mapImage.composite(
			eval(players.red[id].character.replace("/", "_")),
			agentX,
			agentY + i
		); //Red
		mapImage.composite(
			eval(players.blue[id].character.replace("/", "_")),
			agentX + agentDiff,
			agentY + i
		); //Blue

		//Name#Tag
		mapImage.print(font32, nameX, nameY + i, players.red[id].name, nameWrap); //Red
		mapImage.print(
			font32,
			nameX + nameDiff,
			nameY + i,
			players.blue[id].name,
			nameWrap
		); //Blue

		//Kill
		mapImage.print(
			font32,
			killX,
			nameY + i,
			{
				text: players.red[id].stats.kills.toString(),
				alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
			},
			0,
			0
		);
		mapImage.print(
			font32,
			killX + nameDiff,
			nameY + i,
			{
				text: players.blue[id].stats.kills.toString(),
				alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
			},
			0,
			0
		);

		//Death
		mapImage.print(
			font32,
			deathX,
			nameY + i,
			{
				text: players.red[id].stats.deaths.toString(),
				alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
			},
			0,
			0
		);
		mapImage.print(
			font32,
			deathX + nameDiff,
			nameY + i,
			{
				text: players.blue[id].stats.deaths.toString(),
				alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
			},
			0,
			0
		);

		//Assist
		mapImage.print(
			font32,
			assistX,
			nameY + i,
			{
				text: players.red[id].stats.assists.toString(),
				alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
			},
			0,
			0
		);
		mapImage.print(
			font32,
			assistX + nameDiff,
			nameY + i,
			{
				text: players.blue[id].stats.assists.toString(),
				alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
			},
			0,
			0
		);
	}

	// Score
	mapImage.print(
		font128,
		scoreX,
		scoreY,
		{
			text: players.red_score.toString(),
			alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
			alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
		},
		0,
		0
	); // Red
	mapImage.print(
		font128,
		scoreX + scoreDiff,
		scoreY,
		{
			text: players.blue_score.toString(),
			alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
			alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
		},
		0,
		0
	); // Blue

	// Map
	mapImage.print(
		font64,
		mapX,
		mapY,
		{
			text: map,
			alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
			alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
		},
		0,
		0
	);
	mapImage.print(
		font32,
		mapX / 2,
		mapY * mapDiff,
		{
			text: date,
			alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
			alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM,
		},
		960,
		0
	);

	await mapImage.writeAsync(file);
}
