const wakatime = require("./index")("YOUR_API_KEY");

async function main() {
  const data = await wakatime.last7Days();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
