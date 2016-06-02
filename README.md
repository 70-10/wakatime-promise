# wakatime-promise

```
$ npm install wakatime-promise
```

## example

```javascript
const wakatime = require("wakatime-promise")("YOUR_API_KEY");

wakatime.last7Days()
        .then(result => console.log(result))
        .catch(err => console.error(err));
```

## API

### `wakatime(apiKey)`

- Type: `string`

waka time api key

### `wakatime.currentUser()`

### `wakatime.last7Days()`

### `wakatime.last30Days()`

### `wakatime.last6Months()`

### `wakatime.lastYear()`

### `wakatime.summaries(start, end)`

#### `start`

- Type: `string`
- Format: `YYYY-MM-DD`

start date (exmaple: `2016-06-01`)

#### `end`

- Type: `string`
- Format: `YYYY-MM-DD`

end date (exmaple: `2016-06-01`)
