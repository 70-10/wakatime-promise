const co = require("co");
const wakatime = require("./index")("YOUR_API_KEY");

co(function *() {
  const result = yield wakatime.last7Days();
  console.log(result);
}).catch(console.error);
