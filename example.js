const wakatime = require("./index")("YOUR_API_KEY");

async function main() {
  const result = await wakatime.last7Days();
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
