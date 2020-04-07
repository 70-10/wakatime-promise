# wakatime-promise

```
$ npm install wakatime-promise
```

## example

```javascript
const wakatime = require("wakatime-promise")("YOUR_API_KEY");

async function main() {
  const data = await wakatime.last7Days();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
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
