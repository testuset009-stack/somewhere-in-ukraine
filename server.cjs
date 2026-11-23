// commonjs server entry for android apk
// runs same api and static public dir
var express = require('express');
var path = require('path');
var api = require('./engine/api.cjs');

var PORT = Number(process.env.PORT) || 3000;
var app = express();

app.use(express.json({ limit: '5mb' }));

// return clean json on malformed body
// avoids leaking html stack traces
app.use(function (err, req, res, next) {
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
// lets android wrapper stop cleanly
function stopServer() {
server.close(function () {
process.exit(0);
});
}

process.on('SIGINT', stopServer);
process.on('SIGTERM', stopServer);
