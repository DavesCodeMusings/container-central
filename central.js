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
const composeBinary = '/usr/local/bin/docker-compose';
const composeDirectory = config.composeDirectory || process.cwd() + '/compose';
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
    apiRes.on('data', d => {
      data += d.toString();
    });
    apiRes.on('end', () => {
      let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      console.log(`${apiRes.statusCode} ${ip} ${apiOptions.path}`);
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
app.get('/info', callAPI);
app.get('/volumes', callAPI);

app.get('/stacks', (req, res) => {
  let files = fs.readdirSync(composeDirectory).filter(file => file.endsWith('.yml'));
  let stackInfo = [];
  files.forEach(file => {
    let info = {
      filename: file,
      content: fs.readFileSync(`${composeDirectory}/${file}`, { encoding: 'utf8' })
    }
    stackInfo.push(info);
  });
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(stackInfo, null, 2));
});

app.get('/stacks/git/pull', (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!config.gitUrl) {
    res.status(404);
    res.json('Not configured.');
    console.error(`404 ${ip} /stacks/git/pull\ngitUrl is not configured in ${configFile}`);
  }
  else if (!fs.existsSync(composeDirectory)) {
    res.status(404);
    res.json('No such directory.');
    console.error(`404 ${ip} /stacks/git/pull\nCannot find compose YAML directory: ${composeDirectory}`);
  }
  else if (!fs.existsSync(`${composeDirectory}/.git`)) {
    res.status(404);
    res.json('No repository.');
    console.error(`404 ${ip} /stacks/git/pull\nCannot find git repository info: ${composeDirectory}/.git`);
  }
  else {
    exec(`git pull`, { cwd: composeDirectory }, (err, stdout, stderr) => {
      if (err) {
        console.error(`500 ${ip} /stacks/git/pull\n${stderr}`);
      }
      else {
        console.log(`200 ${ip} /stacks/git/pull`);
        res.json('Success');
      }
    });
  }
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
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        console.log(`${apiRes.statusCode} ${ip} ${apiOptions.path}`);
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

app.post('/:target/prune', (req, res) => {
  let target = req.params['target'];
  if (target == 'containers' || target == 'images' || target == 'volumes') {
    let apiOptions = {
      socketPath: dockerSocket,
      method: 'POST',
      path: `/${target}/prune`
    };

    if (target == 'containers' || target == 'images' || target == 'volumes') {
      let data = '';

      const apiReq = http.request(apiOptions, (apiRes) => {
        apiRes.on('data', d => {
          data += d.toString();
        });
        apiRes.on('end', () => {
          let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
          console.log(`${apiRes.statusCode} ${ip} ${apiOptions.path}`);
          res.status(apiRes.statusCode);
          res.send('"success"');  // JSON is expected by the client, so extra quoting is required.
        });
      });
      apiReq.on('error', err => {
        console.error(err);
        console.log(data);
        res.status(apiRes.statusCode);
        res.send('"error"');
      });
      apiReq.end();
    }
    else {
      res.send(`"${target} is not recognized."`);
    }
  }
});

app.post('/images/pull/:imageTag', (req, res) => {
  let [image, tag] = req.params['imageTag'].split(':');
  let apiOptions = {
    socketPath: dockerSocket,
    method: 'POST',
    path: `/images/create?fromImage=${image}&platform=arm&repo=hub.docker.com&tag=${tag}`
  };

  let data = '';
  const apiReq = http.request(apiOptions, (apiRes) => {
    apiRes.on('data', d => {
      data += d.toString();
    });
    apiRes.on('end', () => {
      let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      console.log(`${apiRes.statusCode} ${ip} ${apiOptions.path}`);
      res.status(apiRes.statusCode);
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

  if (action == 'down' || action == 'up' || action == 'restart') {
    fs.stat(`${composeDirectory}/${stackName}.yml`, (err, stat) => {
      if (err) {
        res.status(404);
        res.send(`"${err.code} when looking for ${composeDirectory}/${stackName}.yml"`);
      }
      else {
        fs.stat(composeBinary, (err, stat) => {
          if (err) {
            res.status(404);
            res.send(`"${err.code} when looking for ${composeBinary}`);
          }
          else {
            if (action == 'up') {
              exec(`${composeBinary} -f ${stackName}.yml -p ${stackName} up -d`, { cwd: composeDirectory }, (err, stdout, stderr) => {
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
              exec(`${composeBinary} -f ${stackName}.yml -p ${stackName} ${action}`, { cwd: composeDirectory }, (err, stdout, stderr) => {
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
