/**
 * Load main content based on #hash part of URL. (e.g. http://host#images displays image information.)
 * Called when the page loads, this allows bookmarks or external links to bring up a specific view.
 */
function selectViewFromURL() {
  let view = document.location.hash;
  console.debug("Requested view is:", view);
  switch (view) {
    case '#containers':
      viewContainers();
      break;
    case '#images':
      viewImages();
      break;
    case '#projects':
      viewProjects();
      break;
    case '#volumes':
      viewVolumes();
      break;
    case '#config':
      viewConfig();
      break;
    default:
      viewInfo();
  }
}

/**
 * Show a pop-up message similar to alert(msg) but styled with css and auto-closing.
 * @param {string} msg, the text to display.
 */
function showAlert(msg) {
  console.info(`alert: ${msg}`);
  alertDiv = document.getElementById('alert');
  alertDiv.innerHTML = msg;
  alertDiv.style.display = 'block';
  setTimeout(() => { alertDiv.style.display = 'none'; }, 9000);
}

/**
 * A wrapper for the /containers start, stop API calls.
 * @param {string} action, one of: start, stop, restart, prune.
 * @param {string} containerId, the uuid of the container.
 */
async function containerControl(action, containerId) {
  switch (action) {
    case 'start':
      showAlert('Starting container...');
      break;
    case 'stop':
      showAlert('Stopping container...');
      break;
    case 'prune':
      showAlert('Pruning stopped containers...');
    default:
      showAlert(`Container ${action}...`);
  }
  if (containerId) {
    let response = await fetch(`/containers/${containerId}/${action}`, { method: 'POST' });
    if (response.status == 200) {
      switch (action) {
        case 'start':
          showAlert('Container started.');
          break;
        case 'stop':
          showAlert('Container stopped.');
          break;
        default:
          showAlert(`Successful container ${action}.`);
      }
    }
    viewContainers();
  }
  else {  // Actions that do not act on a specific container ID.
    let response = await fetch(`/containers/${action}`, { method: 'POST' });
    if (response.status == 200) {
      switch (action) {
        case 'prune':
          showAlert('Containers pruned.');
          break;
        default:
          showAlert(`Successful container ${action}.`);
      }
    }
    viewContainers();
  }
}

/**
 * Exectute one of the pre-defined commands against a container and return the results.
 * @param {string} containerID, the container guid where the command will be executed.
 * @param {string} commandID, the guid of the pre-defined command.
 */
async function containerExec(containerID, commandID) {
  let options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: `cmd=${commandID}`
  }
  let response = await fetch(`/containers/${containerID}/exec/`, options);
  if (response.status != 200) {
    showAlert(`${infoResponse.status} received while fetching ${window.location.origin}/info`);
  }
  else {
    result = await response.text();
    showAlert(result);
  }
}

/**
 * A wrapper for the /images API call that URI encodes the image tag.
 * @param {string} action, one of: pull, prune.
 * @param {string} imageTag, in the format name:tag. (e.g. debian:lite)
 */
async function imageControl(action, imageTag) {
  if (action == 'pull') {
    showAlert('Pulling image...');
    let encodedImageTag = encodeURIComponent(imageTag);
    let response = await fetch(`/images/pull/${encodedImageTag}`, { method: 'POST' });
    if (response.status == 200) {
      showAlert('Image pull complete.');
    }
    viewImages();
  }
  if (action == 'prune') {
    showAlert('Pruning images...');
    let response = await fetch('/images/prune', { method: 'POST' });
    if (response.status == 200) {
      showAlert('Images pruned.');
    }
    viewImages();
  }
}

/**
 * A wrapper for the /projects up, down, restart API calls.
 * @param {string} action, one of: start, stop, restart.
 * @param {string} projectName, the project name (i.e. projectName.yml).
 */
async function projectControl(action, projectName) {
  switch (action) {
    case 'git-pull':
      showAlert('Pulling compose files from git repository...');
      break;
    case 'up':
      showAlert(`Deploying ${projectName}...`);
      break;
    case 'down':
      showAlert(`Stopping ${projectName}...`);
      break;
    case 'restart':
      showAlert(`Redeploying ${projectName}...`);
      break;
    default:
      showAlert(`${projectName} ${action}`);
  }
  if (action == 'git-pull') {
    let response = await fetch(`/projects/git`, { method: 'POST' });
    if (response.status == 200) {
      showAlert('Compose files are up to date.');
    }
    else {
      let msg = await response.text();
      showAlert(`Git pull error: ${msg}`);
    }
    viewProjects();
  }
  else {
    let response = await fetch(`/projects/${projectName}/${action}`, { method: 'POST' });
    if (response.status == 200) {
      switch (action) {
        case 'up':
          showAlert(`${projectName} deployed.`);
          break;
        case 'down':
          showAlert(`${projectName} is down.`);
          break;
        case 'restart':
          showAlert(`${projectName} redeployed.`);
          break;
        default:
          showAlert(`${projectName} ${action} complete.`);
      }
    }
    viewProjects();
  }
}

/**
 * Retrieve data from the /containers API call and format as HTML for viewing. 
 */
async function viewInfo() {
  let html = `
    <h2>{{Name}}</h2>
    <p>
      <img alt="Host" src="icons/memory.svg"> {{NCPU}} CPU / {{ram}}G<br>
      <span class="grouping">
        <a href="javascript:viewContainers()" title="Containers">
          <img alt="Running:" src="icons/play.svg"> {{ContainersRunning}}/{{Containers}}
          <img alt="Paused:" src="icons/pause.svg"> {{ContainersPaused}}
          <img alt="Stopped:" src="icons/stop.svg"> {{ContainersStopped}}
        </a>
      </span>
      <br class="optional">
      <span class="grouping">
        <a href="javascript:viewImages()" title="Images">
          <img alt="Images:" src="icons/file-outline.svg"> {{Images}}
        </a>
      </span>
      <span class="grouping">
        <a href="javascript:viewProjects()" title="Projects">
          <img alt="Projects:" src="icons/format-list-bulleted-type.svg"> {{numProjects}}
        </a>
      </span>
      <span class="grouping">
        <a href="javascript:viewVolumes()" title="Volumes">
          <img alt="Volumes:" src="icons/database-outline.svg"> {{numVolumes}}
        </a>
      </span>
    </p>
  `;

  // Most of the information for template placeholders comes from the /info API call.
  console.info(`Fetching info from ${window.location.origin}/info`);
  try {
    let infoResponse = await fetch(window.location.origin + '/info');
    if (infoResponse.status != 200) {
      console.error(`${infoResponse.status} received while fetching ${window.location.origin}/info`);
    }
    else {
      let info = await infoResponse.json();
      html = html.replace(/{{\w+}}/g, (match) => {
        let property = match.replace(/^{{/, '').replace(/}}$/, '');
        return ((typeof info[property] === 'undefined') ? match : info[property]);
      });

      // Make MemTotal more user-friendly with units in GiBytes.
      html = html.replace(/{{ram}}/, (info.MemTotal / 1024 / 1024 / 1024).toFixed(2));
    }
  }
  catch {
    showAlert(`API request failed.`);
  }

  // Docker Compose projects are not part of the /info API call.
  console.info(`Fetching projects from ${window.location.origin}/projects`);
  try {
    let projectsResponse = await fetch(window.location.origin + '/projects');
    if (projectsResponse.status != 200) {
      console.error(`${projectsResponse.status} received while fetching ${window.location.origin}/projects`);
    }
    else {
      let projectsInfo = await projectsResponse.json();
      html = html.replace(/{{numProjects}}/, projectsInfo.length);
    }
  }
  catch {
    showAlert(`API request failed.`);
  }

  // A count of volumes is not included in /info and must be gathered separately.
  console.info(`Fetching volumes from ${window.location.origin}/volumes`);
  try {
    let volumesResponse = await fetch(window.location.origin + '/volumes');
    if (volumesResponse.status != 200) {
      console.error(`${volumesResponse.status} received while fetching ${window.location.origin}/volumes`);
    }
    else {
      let volumesInfo = await volumesResponse.json();
      html = html.replace(/{{numVolumes}}/, volumesInfo.Volumes.length);
    }
  }
  catch {
    showAlert(`API request failed.`);
  }

  document.getElementsByTagName('main')[0].innerHTML = html;
}

/**
 * Retrieve data from the /containers API call and format as HTML for viewing. 
 */
async function viewContainers() {
  let html = `<h2>Containers <img alt="refresh" class="control-aside" src="icons/refresh.svg" onclick="viewContainers();"></h2>`;
  let template = `
    <details>
      <summary><img alt="{{State}}" src="icons/{{stateIcon}}"> {{name}}
        <span class="popup-controls grouping">
          <a href="javascript:containerControl('stop', '{{Id}}');" title="Stop Container"><img alt="stop" src="icons/stop.svg"></a>
          <a href="javascript:containerControl('start', '{{Id}}');" title="Start Container"><img alt="start" src="icons/play.svg"></a>
          <a href="javascript:containerControl('restart', '{{Id}}');" title="Restart Container"><img alt="restart" src="icons/restart.svg"></a>
        </span>
      </summary>
      <p>{{Id}}</p>
      <p><img alt="Created:" src="icons/calendar-clock.svg"> {{createDate}}. {{Status}}</p>
      <p><img alt="Image:" src="icons/file-outline.svg"> <a href="javascript:viewImages('{{imageTag}}');" title="Jump to Image">{{imageTag}}</a></p>
      {{projectInfo}}
      {{quickCommands}}
    </details>
  `;

  // Image IDs are referenced in container. Fetching image data allows more friendly image tags.
  // But it's not critical, so failure to retrieve is not fatal.
  console.info(`Fetching image info from ${window.location.origin}/images`);
  let imageData = [];
  try {
    let imagesResponse = await fetch(window.location.origin + '/images');
    if (imagesResponse.status != 200) {
      console.error(`${imagesResponse.status} received while fetching ${window.location.origin}/images`);
    }
    else {
      imageData = await imagesResponse.json();
      console.debug(`${imageData.length} image(s) retrieved.`);
    }
  }
  catch (ex) {
    console.warn(`API call 'GET /images' failed. ${ex}`);
  }

  // Containers may use quick commands. A GET call to /containers/exec will retrieve these.
  // Also not fatal if the call fails.
  console.info(`Fetching quick commands from ${window.location.origin}/containers/exec`);
  let quickCommands = [];
  try {
    let quickCommandsResponse = await fetch(window.location.origin + '/containers/exec');
    if (quickCommandsResponse.status != 200) {
      console.error(`${quickCommandsResponse.status} received while fetching ${window.location.origin}/containers/exec`);
    }
    else {
      quickCommands = await quickCommandsResponse.json();
      console.debug(`${quickCommands.length} command(s) retrieved.`);
    }
  }
  catch (ex) {
    console.warn(`API call 'GET /containers/exec' failed. ${ex}`);
  }

  // And finally... Containers!
  console.info(`Fetching container info from ${window.location.origin}/containers`);
  let containerData = [];
  let anyStopped = 0;
  try {
    let containersResponse = await fetch(window.location.origin + '/containers');
    if (containersResponse.status != 200) {
      showAlert(`API request failed.`);
      console.error(`${containersResponse.status} received while fetching ${window.location.origin}/containers`);
    }
    else {
      containerData = await containersResponse.json();
      console.debug(`${containerData.length} container(s) retrieved.`);
    }
  }
  catch (ex) {
    showAlert(`API request failed.`);
    console.error(`API call 'GET /containers' failed. ${ex}`);
  }
  
  containerData.forEach(container => {
    let htmlChunk = template;

    // Fill in placeholders with data from the API call.
    htmlChunk = htmlChunk.replace(/{{\w+}}/g, (match) => {
      let property = match.replace(/^{{/, '').replace(/}}$/, '');
      return ((typeof container[property] === 'undefined') ? match : container[property]);
    });

    // An icon stowing stopped, started, or paused is not returned from the API, but it can be derived. 
    let stateIcon = '';
    switch (container.State) {
      case 'running':
        stateIcon = 'play-circle-outline.svg';
        break;
      case 'exited':
        stateIcon = 'stop-circle.svg';
        anyStopped++;
        break;
      case 'paused':
        stateIcon = 'pause-circle.svg';
        break;
      case 'created':
        stateIcon = 'dots-horizontal-circle-outline.svg';
        break;
      default:
        stateIcon = 'circle-outline.svg';
    }
    htmlChunk = htmlChunk.replace(/{{stateIcon}}/, stateIcon);

    // Container names come with a leading /, but look better without it.
    htmlChunk = htmlChunk.replace(/{{name}}/, container.Names[0].replace(/\//, ''));

    // The API uses unix epoch time, but people read date-time stamps.
    htmlChunk = htmlChunk.replace(/{{createDate}}/, new Date(container.Created * 1000).toLocaleString());

    // The containers API call does not cross-reference user-friendly tags, only sha256 image IDs.
    let imageTag = container.ImageID;  // Fallback in case of no match.
    imageData.forEach(image => {
      if (image.Id == container.ImageID && image.RepoTags) {
        imageTag = image.RepoTags[0];
      }
    });
    htmlChunk = htmlChunk.replace(/{{imageTag}}/g, imageTag);

    // Docker Compose puts information in labels, but not all containers are started using docker-compose.
    if (container.Labels && container.Labels['com.docker.compose.project']) {
      let projectName = container.Labels['com.docker.compose.project'];
      htmlChunk = htmlChunk.replace(/{{projectInfo}}/, `<p><img alt="Project:" src="icons/format-list-bulleted-type.svg"> <a href="javascript:viewProjects('${projectName}');" title="Jump to Project">${projectName}</a></p>`);
    }
    else {
      htmlChunk = htmlChunk.replace(/{{projectInfo}}/, '');
    }

    // Some containers may have a pre-defined list of quick commands to choose from.
    htmlChunk = htmlChunk.replace(/{{quickCommands}}/, (match) =>{
      paletteHTML = '';
      quickCommands.forEach((command) => {
        if (container.Names[0].includes(command.filter)) {
          paletteHTML += `<p><img alt="command" src="icons/console.svg"> <a href="javascript:containerExec('${container.Id}', '${command.id}')" title="${command.tooltip}">${command.cmd}</a></p>`;
        }
      });
      return paletteHTML;
    });

    html += htmlChunk;
  });

  if (anyStopped) {
    html += `<p><img alt="trash-can" class="control-aside" onclick="containerControl('prune');" src="icons/trash-can-outline.svg"><p>`;
  }

  document.getElementsByTagName('main')[0].innerHTML = html;
}


/**
 * Retrieve data from the /images API call and format as HTML for viewing.
 * @param {string} tagOfInterest, image tag used to open the details for a particular image.
 */
async function viewImages(tagOfInterest) {
  let html = `<h2>Images <img alt="refresh" class="control-aside" src="icons/refresh.svg" onclick="viewImages();"></h2>`;
  let template = `
    <details id="{{tag}}">
      <summary><img alt="freshness indicator" src={{ageIcon}}> {{tag}}
        <span class="popup-controls grouping">
          <a href="javascript:imageControl('pull', '{{tag}}')" title="Pull Latest Image"><img alt="pull" src="icons/download.svg"></a>
        </span>
      </summary>
      <p>{{Id}}</p>
      <p><img alt="Created:" src="icons/calendar-clock.svg"> {{createDate}}</p>
      <p><img alt="Created:" src="icons/chart-arc.svg"> {{size}}M</p>
      </p>
    </details>
  `;

  console.info(`Fetching image info from ${window.location.origin}/images`);
  try {
    let imagesResponse = await fetch(window.location.origin + '/images');
    if (imagesResponse.status != 200) {
      console.error(`${imagesResponse.status} received while fetching ${window.location.origin}/images`);
      html += `<p>API error ${imagesResponse.status}</p>`;
    }
    else {
      let imageData = await imagesResponse.json();
      console.debug(`${imageData.length} image(s) retrieved.`);

      let now = new Date();  // Used as a baseline to calculate image age.
      let anyUnused = 0;
      imageData.forEach(image => {
        image.createDate = new Date(image.Created * 1000).toLocaleString();
        if (now - image.Created * 1000 < 30 * 86400000) {  // 86400000 is one day in milliseconds.
          image.ageIcon = 'icons/file-outline.svg';
        }
        else {
          image.ageIcon = 'icons/file-clock-outline.svg';
        }

        // When an image is updated, but a container still runs an old image, it's possible to have a null tag.
        // In this case, use the image id as the unique identifier. 
        if (image.RepoTags) {
          image.tag = image.RepoTags[0].replace(/</g, '&lt;').replace(/>/g, '&gt');
        }
        else {
          image.tag = image.Id;
          anyUnused++;
        }

        image.size = Math.round(image.Size / 1048576);

        html += template.replace(/{{\w+}}/g, (match) => {
          let property = match.replace(/^{{/, '').replace(/}}$/, '');
          return image[property] || match;
        });
      });

      // Put a trash can in the footer to trigger prune.
      if (anyUnused) {
        html += `<p><img alt="trash-can" class="control-aside" onclick="imageControl('prune');" src="icons/trash-can-outline.svg"><p>`;
      }

      document.getElementsByTagName('main')[0].innerHTML = html;
    }
  }
  catch {
    showAlert(`API request failed.`);
  }

  if (tagOfInterest) {
    document.getElementById(tagOfInterest).open = true;
  }
}

/**
 * Retrieve data from the /projects API call and format as HTML for viewing. 
 */
async function viewProjects(projectOfInterest) {
  let html = `<h2>Projects <img alt="refresh" class="control-aside" src="icons/refresh.svg" onclick="viewProjects();"></h2>`;
  let template = `
    <details id="{{project}}">
      <summary><img alt="project icon" src='icons/format-list-bulleted-type.svg'> {{project}}
        <span class="popup-controls grouping">
          <a href="javascript:projectControl('up', '{{project}}');" title="Deploy Project"><img alt="Up" src="icons/arrow-up-thick.svg"></a>
          <a href="javascript:projectControl('down', '{{project}}');" title="Remove Project"><img alt="Up" src="icons/arrow-down-thick.svg"></a>
          <a href="javascript:projectControl('restart', '{{project}}');" title="Restart Project"><img alt="Up" src="icons/arrow-u-up-right-bold.svg"></a>
        </span>
      </summary>
      <pre>{{content}}</pre>
    </details>
  `;

  console.info(`Fetching project info from ${window.location.origin}/projects`);
  try {
    let projectsResponse = await fetch(window.location.origin + '/projects');
    if (projectsResponse.status != 200) {
      console.error(`${projectsResponse.status} received while fetching ${window.location.origin}/projects`);
    }
    else {
      let projectData = await projectsResponse.json();
      console.debug(`${projectData.length} project(s) retrieved.`);

      if (projectData.length == 0) {
        html += `<p>No projects defined.</p>`;
      }
      else {
        projectData.forEach(dockerCompose => {
          dockerCompose.project = dockerCompose.filename.replace(/.yml/, '');
          dockerCompose.lines = dockerCompose.content.split('\n').length;
          html += template.replace(/{{\w+}}/g, (match) => {
            let property = match.replace(/^{{/, '').replace(/}}$/, '');
            return dockerCompose[property] || match;
          });
        });
        document.getElementsByTagName('main')[0].innerHTML = html;
      }
    }

    html += `<p><img alt="git-pull" class="control-aside" onclick="projectControl('git-pull');" src="icons/source-branch.svg"><p>`;
    document.getElementsByTagName('main')[0].innerHTML = html;
  }
  catch {
    showAlert(`API request failed.`);
  }

  if (projectOfInterest) {
    document.getElementById(projectOfInterest).open = true;
  }
}

/**
 * Retrieve data from the /volumes API call and format as HTML for viewing. 
 */
async function viewVolumes() {
  let html = `<h2>Volumes<img alt="refresh" class="control-aside" src="icons/refresh.svg" onclick="viewVolumes();"></h2>`;
  let template = `
    <details>
      <summary><img alt="generic project icon" src='icons/database-outline.svg'> {{Name}}</summary>
      <p><img alt="Created:" src="icons/calendar-clock.svg"> {{timeStamp}}</p>
      <p><img alt="Mounted:" src="icons/file-tree-outline.svg"> {{Mountpoint}}</p>
      </p>
    </details>
  `;

  console.info(`Fetching volume info from ${window.location.origin}/volumes`);
  try {
    let volumesResponse = await fetch(window.location.origin + '/volumes');
    if (volumesResponse.status != 200) {
      console.error(`${volumesResponse.status} received while fetching ${window.location.origin}/volumes`);
    }
    else {
      let volumeData = await volumesResponse.json();
      console.debug(`${volumeData.Volumes.length} volume(s) retrieved.`);
      volumeData.Volumes.forEach(volume => {
        volume.timeStamp = new Date(volume.CreatedAt).toLocaleString();
        html += template.replace(/{{\w+}}/g, (match) => {
          let property = match.replace(/^{{/, '').replace(/}}$/, '');
          return volume[property] || match;
        });
      });
      document.getElementsByTagName('main')[0].innerHTML = html;
    }
  }
  catch {
    showAlert(`API request failed.`);
  }
}

async function viewConfig() {
  let html = `<h2>Configuration<img alt="refresh" class="control-aside" src="icons/refresh.svg" onclick="viewConfig();"></h2>`;
  let template = `
    <form action="/config" method="post">
      <fieldset>
        <legend>Git Integration</legend>
        <label for="gitUrl">Repository URL:</label>
        <input id="gitUrl" name="gitUrl" type="url" placeholder="https://git.mypi.home/pi/compose.git" value="{{gitUrl}}">
        <br>
        <input id="git-no-verify-ssl" name="gitNoVerifySSL" type="checkbox" value="true"> <label for="git-no-verify-ssl">Skip SSL Verification:</label>
      </fieldset>

      <fieldset>
        <legend>Project Deployment</legend>
        <label for="compose-binary">Path to docker-compose:</label>
        <input id="compose-binary" name="composeBinary" type="text" placeholder="/usr/local/bin/docker-compose" value="{{composeBinary}}">
      </fieldset>

      <fieldset>
        <legend>Server</legend>
        <label for="listenPort">Listen port:</label>
        <input id="listenPort" name="listenPort" type="number" placeholder="8088" value="{{listenPort}}">
        <br>
        <i>Changes here require an application restart to take effect.</i>
      </fieldset>
      <br>
      <input type="submit" value="Save">
    </form>
  `;

  console.info(`Fetching configuration from ${window.location.origin}/config`);
  try {
    let configResponse = await fetch(window.location.origin + '/config');
    if (configResponse.status != 200) {
      console.error(`${configResponse.status} received while fetching ${window.location.origin}/config`);
    }
    else {
      let configData = await configResponse.json();

      html += template.replace(/{{\w+}}/g, (match) => {
        let property = match.replace(/^{{/, '').replace(/}}$/, '');
        let value = configData[property] || '';  // undefined becomes an empty string
        return value;
      });

      document.getElementsByTagName('main')[0].innerHTML = html;
      if (configData.gitNoVerifySSL) {
        document.getElementById('git-no-verify-ssl').checked = true;
      }
    }
  }
  catch {
    showAlert(`API request failed.`);
  }
}