#!/usr/bin/env node

/**
 * An API to expose parts of the Docker API and also provide an interface
 * to docker-compose.yml files.
 */

const dockerSocket = '/var/run/docker.sock';
const listenPort = '8088';

const express = require('express');  // npm install express for this one.
const fs = require('fs');
const http = require('http');

/**
 * Callback function used for Docker API GET requests.
 * @param {object} req, the express.js request.
 * @param {object} res, the express.js response.
 */
function callAPI(req, res) {
  let apiOptions = {
    socketPath: dockerSocket,
    method: 'GET'
  };

  switch (req.path) {
    case '/containers':
      apiOptions.path = req.path + '/json?all="true"';
      break;
    case '/images':
      apiOptions.path = req.path + '/json';
      break;
    default:
      apiOptions.path = req.path;
  }

  let data = '';

  const apiReq = http.request(apiOptions, (apiRes) => {
    console.log(`${apiRes.statusCode} - ${apiOptions.path}`);
    apiRes.on('data', d => {
      data += d.toString();
    });
    apiRes.on('end', () => {
      res.setHeader("Content-Type", "application/json");
      res.send(data);
    });
  });
  apiReq.on('error', err => {
    console.error(err)
  });
  apiReq.end();
}

const app = express();

/* Static content for the web client. */
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(fs.readFileSync('static/index.html'));
});
app.get('/default.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.send(fs.readFileSync('static/default.css'));
});
app.get('/icons/:filename', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(fs.readFileSync(`static/icons/${req.params['filename']}`));
});
app.get('/script.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(fs.readFileSync('static/script.js'));
});


/* API routes */
app.get('/containers', callAPI);
app.get('/images', callAPI);
app.get('/volumes', callAPI);

app.get('/stacks', (req, res) => {
  let files = fs.readdirSync('compose');
  let yaml = {};
  files.forEach(file => {
    yaml[file] = fs.readFileSync(`compose/${file}`, { encoding: 'utf8' });
  });
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(yaml, null, 2));
});

app.post('/pull/:imageTag', (req, res) => {
  let [image, tag] = req.params['imageTag'].split(':');
  console.log(`Pulling ${image}:${tag}`);
  let apiOptions = {
    socketPath: dockerSocket,
    method: 'POST',
    path: `/images/create?fromImage=${image}&platform=arm&repo=hub.docker.com&tag=${tag}`
  };

  let data = '';
  const apiReq = http.request(apiOptions, (apiRes) => {
    console.log(`${apiRes.statusCode} - ${apiOptions.path}`);
    apiRes.on('data', d => {
      data += d.toString();
    });
    apiRes.on('end', () => {
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(data, null, 2));
    });
  });
  apiReq.on('error', err => {
    console.error(err)
  });
  apiReq.end();
});

app.post('/containers/:containerId/:action', (req, res) => {
  let action = req.params['action'];

  if (action == 'stop' || action == 'start' || action == 'restart') {
    let containerId = req.params['containerId'];
    let apiOptions = {
      socketPath: dockerSocket,
      method: 'POST',
      path: `/containers/${containerId}/${action}`
    };
    let data = '';

    const apiReq = http.request(apiOptions, (apiRes) => {
      apiRes.on('data', d => {
        data += d.toString();
      });
      apiRes.on('end', () => {
        console.log(`${apiRes.statusCode} - ${apiOptions.path}`);
        let message = '';
        switch (apiRes.statusCode) {
          case 204:
            message = `"success"`;
            break;
          case 304:
            message = `"unchanged"`;
            break;
          default:
            message = `"unknown"`;
        }
        res.send(message);
      });
    });
    apiReq.on('error', err => {
      console.error(err)
    });
    apiReq.end();
  }
  else {
    res.send(`"${action} is not recognized."`);
  }
});

var server = app.listen(listenPort, '0.0.0.0', () => {
  let addr = server.address().address;
  let port = server.address().port;
  console.log(`Listening on ${addr}:${port}.`);
});
