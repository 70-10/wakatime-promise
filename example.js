const wakatime = require("./index")("YOUR_API_KEY");

wakatime
  .last7Days()
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
