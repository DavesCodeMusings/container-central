#!/usr/bin/env node

/**
 * An API to expose parts of the Docker API and also provide an interface
 * to docker-compose.yml files.
 */
const { exec } = require('child_process');
const express = require('express');  // npm install express for this one.
const fs = require('fs');
const http = require('http');

const configFile = './config.json';
var config = {};
try {
  config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
}
catch {
  console.warn(`${configFile} not found. Using default values.`);
}
const dockerSocket = '/var/run/docker.sock';
const dockerCompose = '/usr/local/bin/docker-compose';
const listenPort = config.listenPort || '8088';

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

app.get('/info', (req, res) => {
  let apiOptions = {
    socketPath: dockerSocket,
    method: 'GET',
    path: '/info'
  };

  let data = '';

  const apiReq = http.request(apiOptions, (apiRes) => {
    apiRes.on('data', d => {
      data += d.toString();
    });
    apiRes.on('end', () => {
      console.log(`${apiRes.statusCode} - ${apiOptions.path}`);
      let info = JSON.parse(data);
      let files = fs.readdirSync('compose');
      info.stacks = files.length;
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(info, null, 2));
    });
  });
  apiReq.on('error', err => {
    console.error(err)
  });
  apiReq.end();
});

app.get('/stacks', (req, res) => {
  let files = fs.readdirSync('compose');
  let stackInfo = [];
  files.forEach(file => {
    let info = {
      filename: file,
      content: fs.readFileSync(`compose/${file}`, { encoding: 'utf8' })
    }
    stackInfo.push(info);
  });
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(stackInfo, null, 2));
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

app.post('/pull/:imageTag', (req, res) => {
  let [image, tag] = req.params['imageTag'].split(':');
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

app.post('/stacks/:stackName/:action', (req, res) => {
  let stackName = req.params['stackName'];
  let action = req.params['action'];
  let composeDir = process.cwd() + '/compose';

  if (action == 'down' || action == 'up' || action == 'restart') {
    fs.stat(`${composeDir}/${stackName}.yml`, (err, stat) => {
      if (err) {
        res.status(404);
        res.send(`"${err.code} when looking for ${composeDir}/${stackName}.yml"`);
      }
      else {
        fs.stat(dockerCompose, (err, stat) => {
          if (err) {
            res.status(404);
            res.send(`"${err.code} when looking for ${dockerCompose}`);
          }
          else {
            if (action == 'up') {
              exec(`${dockerCompose} -f ${stackName}.yml -p ${stackName} up -d`, { cwd: composeDir }, (err, stdout, stderr) => {
                if (err) {
                  res.status(404);
                  res.send(`"${stderr}"`);
                }
                else {
                  res.send(`"${stdout}"`);
                }
              });
            }
            else {
              exec(`${dockerCompose} -f ${stackName}.yml -p ${stackName} ${action}`, { cwd: composeDir }, (err, stdout, stderr) => {
                if (err) {
                  res.status(404);
                  res.send(`"${stderr}"`);
                }
                else {
                  res.send(`"${stdout}"`);
                }
              });
            }
          }
        });
      }
    });
  }
  else {
    res.status(406);
    res.send(`"${action} is not a supported action."`)
  }
});

var server = app.listen(listenPort, '0.0.0.0', () => {
  let addr = server.address().address;
  let port = server.address().port;
  console.log(`Listening on ${addr}:${port}.`);
});
