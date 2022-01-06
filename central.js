#!/usr/bin/env node

/**
 * An API to expose parts of the Docker API and also provide an interface
 * to docker-compose.yml files.
 */
import { exec } from 'child_process';
import express, { urlencoded } from 'express';  // npm install express for this one.
import { readFileSync, stat as _stat, mkdirSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { request } from 'http';

const dockerSocket = '/var/run/docker.sock';

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

  const apiReq = request(apiOptions, (apiRes) => {
    let data = '';

    apiRes.on('data', d => {
      data += d.toString();
    });
    apiRes.on('end', () => {
      let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      console.info(`${apiRes.statusCode} ${ip} API ${req.method} ${apiOptions.path}`);
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
app.get('/containers', callDockerAPI);
app.get('/images', callDockerAPI);
app.get('/info', callDockerAPI);

app.get('/stacks', (req, res) => {
  let files = readdirSync(composeProjectsPath).filter(file => file.endsWith('.yml'));
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  let stackInfo = [];
  files.forEach(file => {
    let info = {
      filename: file,
      content: readFileSync(new URL(file, composeProjectsPath), { encoding: 'utf8' })
    }
    stackInfo.push(info);
  });
  console.info(`200 ${ip} ${req.method} ${req.path}`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(stackInfo, null, 2));
});

app.get('/volumes', callDockerAPI);
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

app.post('/containers/:containerId/:action', (req, res) => {
  let action = req.params['action'];
  let containerId = req.params['containerId'];
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (action == 'stop' || action == 'start' || action == 'restart') {
    let apiOptions = {
      socketPath: dockerSocket,
      method: 'POST',
      path: `/containers/${containerId}/${action}`
    };

    const apiReq = request(apiOptions, (apiRes) => {
      let data = '';

      apiRes.on('data', d => {
        data += d.toString();
      });
      apiRes.on('end', () => {
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
  else if (action == 'exec') {
    let commandId = req.body.cmd;

    let cmd = '';
    for (let i = 0; i < quickCommands.length; i++) {
      if (quickCommands[i].id == commandId) {
        cmd = quickCommands[i].cmd;
        break;
      }
    }

    if (!cmd) {
      console.error(`404 ${ip} ${req.method} ${req.path}`);
      console.debug(`Command not found when looking for: ${commandId}`);
      res.status(404);
      res.send('Command not found.');
    }
    else {
      let result = "";

      console.info(`200 ${ip} ${req.method} ${req.path}`);
      console.debug(`Executing command '${cmd}'`);
      res.send(`${result || 'Command complete.'}`);
    }
  }
  else {
    console.error(`404 ${ip} ${req.method} ${req.path}`);
    console.debug(`Requested action was: ${action}, but that is not a valid action.`);
    res.status(404);
    res.send(`"Unrecognized action: ${action}."`);
  }
});

app.get('/stacks/git', (req, res) => {
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

      const apiReq = request(apiOptions, (apiRes) => {
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
  const apiReq = request(apiOptions, (apiRes) => {
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

  if (action != 'down' && action != 'up' && action != 'restart') {
    res.status(406);
    res.send(`"Unsupported action: ${action}."`)
  }
  else {
    if (!existsSync(join(composeProjectsPath.pathname, stackName + '.yml'))) {
      console.error(`File not found: ${join(composeProjectsPath.pathname, stackName + '.yml')}`);
      res.status(404);
      res.send(`"No such file: ${stackName}.yml"`);
    }
    else {
      if (!existsSync(config.composeBinary)) {
        console.error(`${err.code} when looking for ${config.composeBinary}`);
        res.status(404);
        res.send("docker-compose not found");
      }
      else {
        if (action == 'up') {
          exec(`${config.composeBinary} -f ${stackName}.yml -p ${stackName} up -d`, { cwd: composeProjectsPath }, (err, stdout, stderr) => {
            if (err) {
              console.error(`Command failed: ${config.composeBinary} -f ${stackName}.yml -p ${stackName} up -d`);
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
          exec(`${config.composeBinary} -f ${stackName}.yml -p ${stackName} ${action}`, { cwd: composeProjectsPath }, (err, stdout, stderr) => {
            if (err) {
              console.error(`Command failed: ${config.composeBinary} -f ${stackName}.yml -p ${stackName} ${action}`);
              console.debug(stderr);
              res.status(404);
              res.send(`"Action failed: ${action}"`);
            }
            else {
              console.debug(`Command succeeded: ${config.composeBinary} -f ${stackName}.yml -p ${stackName} ${action}`);
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
