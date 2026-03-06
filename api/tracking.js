const crypto = require('crypto');

const YUNTRACK_API = 'https://services.yuntrack.com/Track/Query';
const SECRET_KEY = 'f3c42837e3b46431ddf5d7db7d67017d';
const TRACKING_NUMBER = 'YT2606100701461222';

function generateSignature(timestamp, numberList) {
  const stringToSign = 'Timestamp=' + timestamp + '&NumberList=' + JSON.stringify(numberList);
  return crypto.createHmac('sha256', SECRET_KEY).update(stringToSign).digest('hex');
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const timestamp = Date.now();
    const numberList = [TRACKING_NUMBER];
    const signature = generateSignature(timestamp, numberList);

    const payload = {
      NumberList: numberList,
      CaptchaVerification: '',
      Year: 0,
      Timestamp: timestamp,
      Signature: signature,
    };

    const response = await fetch(YUNTRACK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.yuntrack.com',
        'Referer': 'https://www.yuntrack.com/parcelTracking?id=' + TRACKING_NUMBER,
        'Authorization': 'Nebula token:undefined',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('json')) {
      // Cloudflare or similar protection returned HTML
      return res.status(503).json({
        error: 'Tracking service temporarily unavailable',
        fallback: true,
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'YunTrack API error',
        status: response.status,
        fallback: true,
      });
    }

    const data = await response.json();

    // Parse and simplify the response for the frontend
    const result = data.ResultList && data.ResultList[0];
    if (!result || !result.TrackInfo) {
      return res.status(404).json({
        error: 'No tracking data found',
        fallback: true,
      });
    }

    const info = result.TrackInfo;
    const events = (info.DetailsTrackInfo || []).map(function (e) {
      return {
        date: e.ProcessDate,
        description: e.ProcessContent,
        isSignature: e.IsSignature || false,
      };
    });

    const simplified = {
      trackingNumber: info.WaybillNumber,
      lastMileNumber: info.TrackingNumber,
      orderNumber: info.CustomerOrderNumber,
      status: result.Status,
      originCountry: info.OriginCountryCode,
      destinationCountry: info.DestinationCountryCode,
      events: events,
      lastUpdate: events.length > 0 ? events[0].date : null,
    };

    return res.status(200).json(simplified);
  } catch (error) {
    console.error('Tracking API error:', error.message);
    return res.status(500).json({
      error: 'Failed to fetch tracking data',
      message: error.message,
      fallback: true,
    });
  }
};
