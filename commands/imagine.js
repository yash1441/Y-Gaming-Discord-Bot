const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const request = require("request-promise");
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
	organization: process.env.OPENAI_ORG,
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
		const prompt = interaction.options.getString("prompt");

		console.log(prompt);

		const response = await openai.createImage({
			prompt: prompt,
			n: 1,
			size: "512x512",
			response_format: "url",
			user: interaction.user.id,
		});

		const url = response.data.data[0].url;

		console.log(url);

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
