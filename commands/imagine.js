const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const request = require("request-promise");
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
	apiKey: process.env.OPENAI_KEY,
});
const openai = new OpenAIApi(configuration);

module.exports = {
	data: new SlashCommandBuilder()
		.setName("imagine")
		.setDescription("Generate an image with OpenAI")
		.addStringOption((option) =>
			option
				.setName("prompt")
				.setDescription("Image generation prompt")
				.setRequired(true)
		),
	async execute(interaction, client) {
		await interaction.reply({ content: "Getting your login info..." });
		let prompt = interaction.options.getString("prompt");

		let response = await openai.createImage({
			prompt: prompt,
		});

		let url = response.data.data[0].url;

		await interaction.editReply({
			content: "Just kidding, generating image...",
		});

		file = prompt.replace(/ /g, "-") + ".jpg";

		await request.head(url, function () {
			request(url)
				.pipe(fs.createWriteStream(file))
				.on("error", () => {
					console.log(error);
				})
				.on("finish", () => {
					interaction
						.editReply({ content: `**Prompt** \`${prompt}\``, files: [file] })
						.then(() => {
							fs.unlinkSync(file);
						});
				});
		});
	},
};
