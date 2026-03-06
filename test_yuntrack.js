const crypto = require('crypto');

const SECRET_KEY = 'f3c42837e3b46431ddf5d7db7d67017d';
const ts = Date.now();
const numList = ['YT2606100701461222'];
const str = 'Timestamp=' + ts + '&NumberList=' + JSON.stringify(numList);
const sig = crypto.createHmac('sha256', SECRET_KEY).update(str).digest('hex');

const payload = {
    NumberList: numList,
    CaptchaVerification: '',
    Year: 0,
    Timestamp: ts,
    Signature: sig,
};

fetch('https://services.yuntrack.com/Track/Query', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://www.yuntrack.com',
        'Referer': 'https://www.yuntrack.com/',
        'Authorization': 'Nebula token:undefined',
    },
    body: JSON.stringify(payload),
})
    .then(r => r.json())
    .then(d => console.log(JSON.stringify(d, null, 2)))
    .catch(e => console.error(e));
