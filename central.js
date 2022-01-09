#!/usr/bin/env node

/**
 * An API to expose parts of the Docker API and also provide an interface
 * to docker-compose.yml files.
 */
import express, { urlencoded } from 'express';
import { exec } from 'child_process';
import { readFileSync, stat as _stat, mkdirSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { request } from 'http';

const configFile = 'config.json'
var config = {};
try {
  config = JSON.parse(readFileSync(new URL(configFile, import.meta.url), 'utf-8'));
}
catch (ex) {
  console.warn(`Unable to parse ${configFile}. Using default values.`);
  console.debug(ex);
}

/* Add defaults for any values not set */
config.gitNoVerifySSL = config.gitNoVerifySSL || false;
config.composeBinary = config.composeBinary || '/usr/local/bin/docker-compose';
config.listenPort = config.listenPort || '8088';

/* Many features rely on the docker-compose and the compose project files directory being present. */
if (!existsSync(config.composeBinary)) {
  console.warn(`Unable to find ${config.composeBinary}. Functionality will be limited.`);
}

let composeProjectsPath = new URL(join('data', 'compose', '/'), import.meta.url);  // There has to be a trailing slash!
if (!existsSync(composeProjectsPath)) {
  console.info(`Creating missing 'compose' directory.`);
  mkdirSync(composeProjectsPath);
}

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

/* Static content for the web client. */
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(readFileSync('static/index.html'));
});

app.get('/default.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.send(readFileSync('static/default.css'));
});

app.get('/icons/:filename', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(readFileSync(`static/icons/${req.params['filename']}`));
});

app.get('/script.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(readFileSync('static/script.js'));
});


/* API routes for main menu items */
app.get('/containers', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let path = req.path + '/json?all="true"';  // only running containers without all="true"
  let data = await callDockerAPI(path);
  console.info(`${res.statusCode} ${ip} API ${path}`);
  res.send(data);
});

app.get('/images', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let path = req.path + '/json';
  let data = await callDockerAPI(path);
  console.info(`${res.statusCode} ${ip} API ${path}`);
  res.send(data);
});

app.get('/info', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let data = await callDockerAPI(req.path);
  console.info(`${res.statusCode} ${ip} API ${req.path}`);
  res.send(data);
});

app.get('/projects', (req, res) => {
  let files = readdirSync(composeProjectsPath).filter(file => file.endsWith('.yml'));
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let projectInfo = [];
  files.forEach(file => {
    let info = {
      filename: file,
      content: readFileSync(new URL(file, composeProjectsPath), { encoding: 'utf8' })
    }
    projectInfo.push(info);
  });
  console.info(`200 ${ip} ${req.method} ${req.path}`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(projectInfo, null, 2));
});

app.get('/volumes', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let data = await callDockerAPI(req.path);
  console.info(`${res.statusCode} ${ip} API ${req.path}`);
  res.send(data);
});

app.get('/config', (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.info(`200 ${ip} ${req.method} ${req.path}`);
  res.json(config);
});

/* Uploading new config values. */
app.post('/config', (req, res) => {
  let proposedConfig = req.body;
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

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

  if (proposedConfig.composeBinary && existsSync(proposedConfig.composeBinary)) {
    config.composeBinary = proposedConfig.composeBinary
  }

  if (proposedConfig.listenPort) {  // use integer, not string
    config.listenPort = parseInt(proposedConfig.listenPort);
  }

  writeFileSync(configFile, JSON.stringify(config, null, 2));

  console.info(`302 ${ip} ${req.method} ${req.path}`);
  res.redirect('/');
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

app.post('/projects/git', (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!config.gitUrl) {
    console.error(`404 ${ip} ${req.method} ${req.path}`);
    console.debug(`gitUrl is not configured in ${configFile}`);
    res.status(404);
    res.json('Git URL not configured.');
  }
  else {
    let execOptions = { cwd: composeProjectsPath };
    if (config.gitNoVerifySSL) {
      execOptions['env'] = { 'GIT_SSL_NO_VERIFY': true };
    }
    if (!existsSync(new URL('.git', composeProjectsPath))) {  // If no local repo, try to recover by doing git clone.
      console.error(`No local copy of git repository. Trying git clone ${config.gitUrl}`);
      exec(`git clone ${config.gitUrl} . && git config pull.ff only`, execOptions, (err, stdout, stderr) => {
        if (err) {
          console.error(`500 ${ip} ${req.method} ${req.path}`);
          console.debug(stderr);
          res.status(500);
          res.json('git clone failed.');
        }
        else {
          console.info(`200 ${ip} ${req.method} ${req.path}`);
          res.json('git clone successful.');
        }
      });
    }
    else {
      exec(`git pull`, execOptions, (err, stdout, stderr) => {
        if (err) {
          console.error(`500 ${ip} ${req.method} ${req.path}`);
          console.debug(stderr);
          res.status(500);
          res.json('git pull failed.');
        }
        else {
          console.info(`200 ${ip} ${req.method} ${req.path}`);
          res.json('git pull successful.');
        }
      });
    }
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

app.post('/projects/:projectName/:action', (req, res) => {
  let projectName = req.params['projectName'];
  let action = req.params['action'];

  if (action != 'down' && action != 'up' && action != 'restart') {
    res.status(406);
    res.send(`"Unsupported action: ${action}."`)
  }
  else {
    if (!existsSync(join(composeProjectsPath.pathname, projectName + '.yml'))) {
      console.error(`File not found: ${join(composeProjectsPath.pathname, projectName + '.yml')}`);
      res.status(404);
      res.send(`"No such file: ${projectName}.yml"`);
    }
    else {
      if (!existsSync(config.composeBinary)) {
        console.error(`${err.code} when looking for ${config.composeBinary}`);
        res.status(404);
        res.send("docker-compose not found");
      }
      else {
        if (action == 'up') {
          exec(`${config.composeBinary} -f ${projectName}.yml -p ${projectName} up -d`, { cwd: composeProjectsPath }, (err, stdout, stderr) => {
            if (err) {
              console.error(`Command failed: ${config.composeBinary} -f ${projectName}.yml -p ${projectName} up -d`);
              console.debug(stderr);
              res.status(404);
              res.send(`"Deployment failed."`);
            }
            else {
              res.send(`"${stdout}"`);
            }
          });
        }
        else {
          exec(`${config.composeBinary} -f ${projectName}.yml -p ${projectName} ${action}`, { cwd: composeProjectsPath }, (err, stdout, stderr) => {
            if (err) {
              console.error(`Command failed: ${config.composeBinary} -f ${projectName}.yml -p ${projectName} ${action}`);
              console.debug(stderr);
              res.status(404);
              res.send(`"Action failed: ${action}"`);
            }
            else {
              console.debug(`Command succeeded: ${config.composeBinary} -f ${projectName}.yml -p ${projectName} ${action}`);
              console.debug(stderr);
              res.send(`"Successful ${action}"`);
            }
          });
        }
      }
    }
  }
});

var server = app.listen(config.listenPort, '0.0.0.0', () => {
  let addr = server.address().address;
  let port = server.address().port;
  console.log(`Listening on ${addr}:${port}.`);
});
