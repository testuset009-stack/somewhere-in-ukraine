// express server for tv and phone host
// binds to 0.0.0.0 on port 3000
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

var require = createRequire(
import.meta.url
);
var api = require('./engine/api.cjs');

var __filename = fileURLToPath(
import.meta.url
);
var __dirname = path.dirname(__filename);

var PORT = Number(process.env.PORT) || 3000;
var app = express();

app.use(express.json({ limit: '5mb' }));

// return clean json on malformed body
// avoids leaking html stack traces
app.use(function (
err: any,
req: any,
res: any,
next: any
) {
if (err && err.type === 'entity.parse.failed') {
res.status(400).json({
ok: false,
error: 'Invalid JSON'
});
return;
}
next(err);
});

// serve mobile controller on /host
// points directly to public phone page
app.get('/host', function (req, res) {
res.sendFile(
path.join(__dirname, 'public', 'phone.html')
);
});

app.use(
express.static(
path.join(__dirname, 'public')
)
);
app.use(api);

var server = app.listen(
PORT,
'0.0.0.0',
function () {
console.log(
'Des v Ukraini server on :' + PORT
);
}
);

// close http server cleanly on exit signal
// lets process stop without hung sockets
function stopServer() {
server.close(function () {
process.exit(0);
});
}

process.on('SIGINT', stopServer);
process.on('SIGTERM', stopServer);
