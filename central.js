#!/usr/bin/env node

/**
 * An API to expose parts of the Docker API for simple container management.
 */
import express, { urlencoded } from 'express';
import { exec } from 'child_process';
import { readFileSync, stat as _stat, mkdirSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { request } from 'http';

const configFile = join('data', 'config.json');
var config = {};
try {
  config = JSON.parse(readFileSync(new URL(configFile, import.meta.url), 'utf-8'));
}
catch (ex) {
  console.warn(`Unable to parse ${configFile}. Using default values.`);
  console.debug(ex);
}

/* Add defaults for any values not set */
config.listenPort = config.listenPort || '8088';

/* Parse quick commands file and report errors at startup to avoid surprises later. */
const quickCommandsFile = new URL('data/quick_commands.json', import.meta.url);
var quickCommands = [];
try {
  quickCommands = JSON.parse(readFileSync(quickCommandsFile, 'utf-8'));
}
catch (ex) {
  console.warn(`Unable to parse ${quickCommandsFile}. Container quick commands will be unavailable.`);
  console.debug(ex);
}

/**
 * Promise wrapper for http.request to Docker API.
 * (Node-fetch has no plans to support Unix sockets, so here we are...)
 * @param {string} path, the API URL path.
 * @param {string} method, GET or POST. Defaults to GET.
 * @return {object} a promise to be filled with the API response.
*/
function callDockerAPI(path, method = 'GET', body = '') {
  return new Promise((resolve, reject) => {
    let options = {
      socketPath: '/var/run/docker.sock',
      method: method,
      path: path
    };
    if (body) {
      options.headers = { "Content-Type": "application/json" };
      body = decodeURIComponent(body);
    }

    const req = request(options, (res) => {
      let data = '';

      res.on('data', d => {
        data += d.toString();
      });

      res.on('end', () => {
        console.info(`${res.statusCode} API ${options.method} ${options.path}`);
        let reply = '';
        switch (res.statusCode) {
          case 204:
            reply = `"Success"`;
            break;
          case 304:
            reply = `"Unchanged"`;
            break;
          case 404:
            reply = `"Not Found"`;
          default:
            reply = data;
        }
        resolve(reply);
      });
    });

    req.on('error', err => {
      reject(err);
    });
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

const app = express();
app.use(urlencoded({ extended: true }));
app.use(express.static(new URL('client', import.meta.url).pathname));

/* API routes for main menu items */
app.get('/containers', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let path = req.path + '/json?all="true"';  // only running containers without all="true"
  let data = await callDockerAPI(path);
  console.info(`${res.statusCode} ${ip} API ${path}`);
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
});

app.get('/images', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let path = req.path + '/json';
  let data = await callDockerAPI(path);
  console.info(`${res.statusCode} ${ip} API ${path}`);
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
});

app.get('/info', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let data = await callDockerAPI(req.path);
  console.info(`${res.statusCode} ${ip} API ${req.path}`);
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
});

app.get('/projects', (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let projectInfo = [];
  console.info(`200 ${ip} ${req.method} ${req.path}`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(projectInfo, null, 2));
});

app.get('/volumes', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let data = await callDockerAPI(req.path);
  console.info(`${res.statusCode} ${ip} API ${req.path}`);
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
});

app.get('/config', (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.info(`200 ${ip} ${req.method} ${req.path}`);
  res.json(config);
});

// A list of available quick commands to choose from.
app.get('/containers/exec', (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  console.info(`200 ${ip} ${req.method} ${req.path}`);
  res.json(quickCommands);
});

app.post('/containers/:containerId/:action', async (req, res) => {
  let action = req.params['action'];
  let containerId = req.params['containerId'];
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (action == 'stop' || action == 'start' || action == 'restart') {
    let reply = await callDockerAPI(`/containers/${containerId}/${action}`, 'POST');
    res.send(reply);
  }
  else if (action == 'exec') {
    let commandId = req.body.cmd;

    let quickCmdObj = quickCommands.find(commandObj => commandObj.id == commandId);
    if (!quickCmdObj) {
      console.error(`404 ${ip} ${req.method} ${req.path}`);
      console.debug(`Command not found when looking for: ${commandId}`);
      res.status(404);
      res.send('Command not found.');
    }
    else {
      console.debug(`Executing command '${quickCmdObj.cmd}'`);
      let execCmd = quickCmdObj.cmd.split(' ');  // for 'ls -l', exec wants ["ls", "-l"]
      let execObj = {
        'Tty': true,
        'AttachStdin': false,
        'AttachStdout': true,
        'AttachStderr': true,
        'Cmd': execCmd
      };  // See: https://docs.docker.com/engine/api/v1.41/#operation/ContainerExec
      let execReply = await callDockerAPI(`/containers/${containerId}/${action}`, 'POST', encodeURIComponent(JSON.stringify(execObj)));
      console.debug(execReply);
      let execId = JSON.parse(execReply).Id;
      let startObj = {
        'Detach': false,
        'Tty': true
      };  // See: https://docs.docker.com/engine/api/v1.41/#operation/ExecStart
      let startReply = await callDockerAPI(`/exec/${execId}/start`, 'POST', encodeURIComponent(JSON.stringify(startObj)));
      console.debug(startReply);
      console.info(`200 ${ip} ${req.method} ${req.path}`);
      res.send(`${startReply.replace(/\n/, '<br>')}`);
    }
  }
  else {
    console.error(`404 ${ip} ${req.method} ${req.path}`);
    console.debug(`Requested action was: ${action}, but that is not a valid action.`);
    res.status(404);
    res.send(`"Unrecognized action: ${action}."`);
  }
});

app.post('/:target/prune', async (req, res) => {
  let target = req.params['target'];
  if (target == 'containers' || target == 'images' || target == 'volumes') {
    let reply = await callDockerAPI(req.path, 'POST');
    res.send(reply);
  }
  else {
    res.status(406);
    res.send(`"${target} is unsupported."`);
  }
});

app.post('/images/pull/:imageTag', async (req, res) => {
  let [image, tag] = req.params['imageTag'].split(':');
  console.debug(`Pulling: ${image}:${tag}`);

  let reply = await callDockerAPI(`/images/create?fromImage=${image}&platform=arm&repo=hub.docker.com&tag=${tag}`, 'POST');
  console.log(reply);
  res.send(reply);
});

var server = app.listen(config.listenPort, '0.0.0.0', () => {
  let addr = server.address().address;
  let port = server.address().port;
  console.log(`Listening on ${addr}:${port}.`);
});
