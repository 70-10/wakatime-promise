const wakatime = require("./index")("YOUR_API_KEY");

wakatime.last7Days()
        .then(result => console.log(result))
        .catch(err => console.error(err));
