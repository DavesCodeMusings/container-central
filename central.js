#!/usr/bin/env node

/**
 * An API to expose parts of the Docker API and also provide an interface
 * to docker-compose.yml files.
 */
const { exec } = require('child_process');
const express = require('express');  // npm install express for this one.
const fs = require('fs');
const path = require('path');
const http = require('http');

const configFile = path.join(__dirname, 'data', 'config.json');
var config = {};
try {
  config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
}
catch (ex) {
  console.warn(`Unable to parse ${configFile}\n${ex}\nUsing default values instead.`);
}

/* Add defaults for any values not set */
config.gitNoVerifySSL = config.gitNoVerifySSL || false;
config.listenPort = config.listenPort || '8088';

const composeBinary = '/usr/local/bin/docker-compose';
const composeDirectory = path.join(__dirname, 'data', 'compose');
const dockerSocket = '/var/run/docker.sock';
const quickCommandsFile =  path.join(__dirname, 'data', 'quick_commands.json');

/* Many things rely on the compose files directory being present. */
fs.stat(composeDirectory, (err, stat) => {
  if (err) {
    console.info(`Creating missing directory: ${composeDirectory}`);
    fs.mkdirSync(composeDirectory);
  }
});

/* Parse the command palette file and report errors at startup to avoid surprises later. */
var quickCommands = [];
try {
  quickCommands = JSON.parse(fs.readFileSync(quickCommandsFile, 'utf-8'));
}
catch (ex) {
  console.warn(`Unable to parse ${quickCommandsFile}\n${ex}\nContainer quick commands will be unavailable.`)
}

/**
 * Callback function used for Docker API GET requests.
 * @param {object} req, the express.js request.
 * @param {object} res, the express.js response.
 */
function callDockerAPI(req, res) {
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
      console.info(`${apiRes.statusCode} ${ip} ${apiOptions.path}`);
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
app.use(express.urlencoded({extended: true}));

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


/* API routes for main menu items */
app.get('/containers', callDockerAPI);
app.get('/images', callDockerAPI);
app.get('/info', callDockerAPI);

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

app.get('/volumes', callDockerAPI);
app.get('/config', (req, res) => {
  res.json(config);
});

app.post('/config', (req, res) => {
  let proposedConfig = req.body;
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.info(`${ip} POST /config ${JSON.stringify(proposedConfig)}`);

  if (proposedConfig.gitUrl === 'undefined') {  // use empty string, not undefined
    config.gitUrl == '';
  }
  else {
    config.gitUrl = proposedConfig.gitUrl;
  }

  if (proposedConfig.gitNoVerifySSL == 'true') {  // use boolean, not string
    config.gitNoVerifySSL = true;
  }
  else {
    config.gitNoVerifySSL = false;
  }

  if (proposedConfig.listenPort) {  // use integer, not string
    config.listenPort = parseInt(proposedConfig.listenPort);
  }

  res.redirect('/');
});

// Return a list of available commands.
app.get('/exec', (req, res) => {
  res.json(quickCommands);
});

app.get('/stacks/git', (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!config.gitUrl) {
    res.status(404);
    res.json('URL not configured.');
    console.error(`404 ${ip} /stacks/git\ngitUrl is not configured in ${configFile}`);
  }
  else if (!fs.existsSync(composeDirectory)) {
    res.status(404);
    res.json('No such directory.');
    console.error(`404 ${ip} /stacks/git\nCannot find compose YAML directory: ${composeDirectory}`);
  }
  else {  // All the prerequisites have checked out.
    let execOptions = { cwd: composeDirectory };
    if (config.gitNoVerifySSL) {
      execOptions['env'] = { 'GIT_SSL_NO_VERIFY': true };
    }
    if (!fs.existsSync(`${composeDirectory}/.git`)) {  // If no local repo, try to recover by doing git clone.
      console.error(`No local copy of git repository. Trying git clone ${config.gitUrl}`);
      exec(`git clone ${config.gitUrl} . && git config pull.ff only`, execOptions, (err, stdout, stderr) => {
        if (err) {
          console.error(`500 ${ip} /stacks/git\n${stderr}`);
          res.status(500);
          res.json('git clone failed.');
        }
        else {
          console.info(`200 ${ip} /stacks/git`);
          res.json('git clone successful.');
        }
      });
    }
    else {
      exec(`git pull`, execOptions, (err, stdout, stderr) => {
        if (err) {
          console.error(`500 ${ip} /stacks/git\n${stderr}`);
          res.status(500);
          res.json('git pull failed.');
        }
        else {
          console.info(`200 ${ip} /stacks/git`);
          res.json('git pull successful.');
        }
      });
    }
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
        console.info(`${apiRes.statusCode} ${ip} ${apiOptions.path}`);
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
          console.info(`${apiRes.statusCode} ${ip} ${apiOptions.path}`);
          res.status(apiRes.statusCode);
          res.send('"success"');  // JSON is expected by the client, so extra quoting is required.
        });
      });
      apiReq.on('error', err => {
        console.error(err);
        console.error(data);
        res.status(500);
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
      console.info(`${apiRes.statusCode} ${ip} ${apiOptions.path}`);
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

var server = app.listen(config.listenPort, '0.0.0.0', () => {
  let addr = server.address().address;
  let port = server.address().port;
  console.log(`Listening on ${addr}:${port}.`);
});
