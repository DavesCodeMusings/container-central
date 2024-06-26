/**
 * Load main content based on #hash part of URL. (e.g. http://host#images displays image information.)
 * Called when the page loads, this allows bookmarks or external links to bring up a specific view.
 */
function selectViewFromURL() {
  let hash = document.location.hash;
  let view = '';
  let focus = '';
  let firstSeparator = hash.indexOf('/');
  if (firstSeparator != -1) {
    view = hash.substring(1, firstSeparator);  // Between leading # and the first /
    focus = hash.substring(firstSeparator + 1);  // Between the first / and the end
  }
  else {
    view = hash.substring(1);  // Chop off the leading #
  }
  console.debug("Requested view is:", view);
  console.debug("Focus is:", focus);

  switch (view) {
    case 'containers':
      viewContainers(focus);
      break;
    case 'images':
      viewImages(focus);
      break;
    case 'projects':
      viewProjects(focus);
      break;
    case 'volumes':
      viewVolumes();
      break;
    case 'config':
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
 * Retrieve data from the /containers API call and format as HTML for viewing.
 */
async function viewInfo() {
  let html = `
    <h2>{{Name}}</h2>
    <p>
      <img alt="Host" src="icons/memory.svg"> {{NCPU}} CPU / {{ram}}G<br>
      <span class="grouping">
        <a href="#containers" title="Containers">
          <img alt="Running:" src="icons/play.svg"> {{ContainersRunning}}/{{Containers}}
          <img alt="Paused:" src="icons/pause.svg"> {{ContainersPaused}}
          <img alt="Stopped:" src="icons/stop.svg"> {{ContainersStopped}}
        </a>
      </span>
      <br class="optional">
      <span class="grouping">
        <a href="#images" title="Images">
          <img alt="Images:" src="icons/file-outline.svg"> {{numImages}}
        </a>
      </span>
      <span class="grouping">
        <a href="#projects" title="Projects">
          <img alt="Projects:" src="icons/format-list-bulleted-type.svg"> {{numProjects}}
        </a>
      </span>
      <span class="grouping">
        <a href="#volumes" title="Volumes">
          <img alt="Volumes:" src="icons/database-outline.svg"> {{numVolumes}}
        </a>
      </span>
    </p>
  `;

  // Most of the information for template placeholders comes from the /info API call.
  console.info(`Fetching info from ${window.location.origin}/info`);
  let infoResponse = null;
  try {
    infoResponse = await fetch(window.location.origin + '/info');
  }
  catch (ex) {
    console.error(`${ex}`);
    showAlert(`API request failed.`);
  }
  if (infoResponse) {
    if (infoResponse.status != 200) {
      console.error(`${infoResponse.status} received while fetching ${window.location.origin}/info`);
      showAlert(`API request failed.`);
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

  // The count of images from /info includes dangling images, so fetch from /images instead.
  console.info(`Fetching images from ${window.location.origin}/images`);
  let imagesResponse = null;
  try {
    imagesResponse = await fetch(window.location.origin + '/images');
  }
  catch (ex) {
    console.error(`${ex}`);
    showAlert(`API request failed.`);
  }
  if (imagesResponse) {
    if (imagesResponse.status != 200) {
      console.error(`${imagesResponse.status} received while fetching ${window.location.origin}/images`);
      showAlert(`API request failed.`);
    }
    else {
      let imagesInfo = await imagesResponse.json();
      html = html.replace(/{{numImages}}/, imagesInfo.length);
    }
  }

  // Docker Compose projects are not part of the /info API call.
  console.info(`Fetching projects from ${window.location.origin}/projects`);
  let projectsResponse = null;
  try {
    projectsResponse = await fetch(window.location.origin + '/projects');
  }
  catch (ex) {
    console.error(`${ex}`);
    showAlert(`API request failed.`);
  }
  if (projectsResponse) {
    if (projectsResponse.status != 200) {
      console.error(`${projectsResponse.status} received while fetching ${window.location.origin}/projects`);
      showAlert(`API request failed.`);
    }
    else {
      let projectsInfo = await projectsResponse.json();
      html = html.replace(/{{numProjects}}/, projectsInfo.length);
    }
  }

  // A count of volumes is not included in /info and must be gathered separately.
  console.info(`Fetching volumes from ${window.location.origin}/volumes`);
  let volumesResponse = null;
  try {
    volumesResponse = await fetch(window.location.origin + '/volumes');
  }
  catch (ex) {
    console.error(`${ex}`);
    showAlert(`API request failed.`);
  }
  if (volumesResponse) {
    if (volumesResponse.status != 200) {
      console.error(`${volumesResponse.status} received while fetching ${window.location.origin}/volumes`);
      showAlert(`API request failed.`);
    }
    else {
      let volumesInfo = await volumesResponse.json();
      html = html.replace(/{{numVolumes}}/, volumesInfo.Volumes.length);
    }
  }
  document.getElementsByTagName('main')[0].innerHTML = html;
}

/**
 * Retrieve data from the /containers API call and format as HTML for viewing.
 */
async function viewContainers(containerOfInterest) {
  let html = `<h2>Containers <img alt="refresh" class="control-aside" src="icons/refresh.svg" onclick="viewContainers();"></h2>`;
  let template = `
    <details id="{{name}}">
      <summary><img alt="{{State}}" src="icons/{{stateIcon}}"> {{name}}
        <span class="popup-controls grouping">
          <a href="javascript:containerControl('stop', '{{Id}}');" title="Stop Container"><img alt="stop" src="icons/stop.svg"></a>
          <a href="javascript:containerControl('start', '{{Id}}');" title="Start Container"><img alt="start" src="icons/play.svg"></a>
          <a href="javascript:containerControl('restart', '{{Id}}');" title="Restart Container"><img alt="restart" src="icons/restart.svg"></a>
        </span>
      </summary>
      <p>{{Id}}</p>
      <p><img alt="Created:" src="icons/calendar-clock.svg"> {{createDate}}. {{Status}}.</p>
      <p><img alt="Image:" src="icons/file-outline.svg"> <a href="#images/{{imageTag}}" title="Jump to Image">{{imageTag}}</a></p>
      {{projectInfo}}
      {{quickCommands}}
    </details>
  `;

  // Image IDs are referenced in container. Fetching image data allows more friendly image tags.
  // But it's not critical, so failure to retrieve is not fatal.
  console.info(`Fetching image info from ${window.location.origin}/images`);
  let imageData = [];
  let imagesResponse = null;
  try {
    imagesResponse = await fetch(window.location.origin + '/images');
  }
  catch (ex) {
    console.warn(`${ex}`);
  }
  if (imagesResponse) {
    if (imagesResponse.status != 200) {
      console.error(`${imagesResponse.status} received while fetching ${window.location.origin}/images`);
    }
    else {
      imageData = await imagesResponse.json();
      console.debug(`${imageData.length} image(s) retrieved.`);
    }
  }

  // Containers may use quick commands. A GET call to /containers/exec will retrieve these.
  // Also not fatal if the call fails.
  console.info(`Fetching quick commands from ${window.location.origin}/containers/exec`);
  let quickCommands = [];
  let quickCommandsResponse = null;
  try {
    quickCommandsResponse = await fetch(window.location.origin + '/containers/exec');
  }
  catch (ex) {
    console.warn(`${ex}`);
  }
  if (quickCommandsResponse) {
    if (quickCommandsResponse.status != 200) {
      console.error(`${quickCommandsResponse.status} received while fetching ${window.location.origin}/containers/exec`);
    }
    else {
      quickCommands = await quickCommandsResponse.json();
      console.debug(`${quickCommands.length} command(s) retrieved.`);
    }
  }

  // And finally... Containers!
  console.info(`Fetching container info from ${window.location.origin}/containers`);
  let containerData = [];
  let anyStopped = 0;
  let containersResponse = null;
  try {
    containersResponse = await fetch(window.location.origin + '/containers');
  }
  catch (ex) {
    console.error(`${ex}`);
    showAlert(`API request failed.`);
  }
  if (containersResponse) {
    if (containersResponse.status != 200) {
      showAlert(`API request failed.`);
      console.error(`${containersResponse.status} received while fetching ${window.location.origin}/containers`);
    }
    else {
      containerData = await containersResponse.json();
      console.debug(`${containerData.length} container(s) retrieved.`);
    }
  }

  containerData.forEach(container => {
    let htmlChunk = template;

    // Fill in placeholders with data from the API call.
    htmlChunk = htmlChunk.replace(/{{\w+}}/g, (match) => {
      let property = match.replace(/^{{/, '').replace(/}}$/, '');
      return ((typeof container[property] === 'undefined') ? match : container[property]);
    });

    // An icon showing stopped, started, or paused is not returned from the API, but it can be derived.
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
    htmlChunk = htmlChunk.replace(/{{name}}/g, container.Names[0].replace(/\//, ''));

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
      htmlChunk = htmlChunk.replace(/{{projectInfo}}/, `<p><img alt="Project:" src="icons/format-list-bulleted-type.svg"> <a href="#projects/${projectName}" title="Jump to Project">${projectName}</a></p>`);
    }
    else {
      htmlChunk = htmlChunk.replace(/{{projectInfo}}/, '');
    }

    // Some containers may have a pre-defined list of quick commands to choose from.
    htmlChunk = htmlChunk.replace(/{{quickCommands}}/, (match) => {
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

  if (containerOfInterest) {
    document.getElementById(containerOfInterest).open = true;
  }
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
        <!-- Pull functionality removed until Issue #22 is sorted
        <span class="popup-controls grouping">
          <a href="javascript:imageControl('pull', '{{tag}}')" title="Pull Latest Image"><img alt="pull" src="icons/download.svg"></a>
        </span>
        -->
      </summary>
      <p>{{Id}}</p>
      <p><img alt="Created:" src="icons/calendar-clock.svg"> {{createDate}}</p>
      <p><img alt="Created:" src="icons/chart-arc.svg"> {{size}}M</p>
      </p>
    </details>
  `;

  console.info(`Fetching image info from ${window.location.origin}/images`);
  let imagesResponse = null;
  try {
    imagesResponse = await fetch(window.location.origin + '/images');
  }
  catch (ex) {
    console.error(`${ex}`);
    showAlert(`API request failed.`);
  }
  if (imagesResponse) {
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
        if (image.RepoTags && image.RepoTags[0]) {
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
      {{containers}}
      <details>
        <summary>{{composeFile}}</summary>
        <pre>{{contents}}</pre>
      </details>
    </details>
  `;

  // Fetch /containers to use for associating containers with their projects.
  console.info(`Fetching container info from ${window.location.origin}/containers`);
  let containerData = [];
  let containersResponse = null;
  try {
    containersResponse = await fetch(window.location.origin + '/containers');
  }
  catch (ex) {
    console.error(`${ex}`);
    showAlert(`API request failed.`);
  }
  if (containersResponse) {
    if (containersResponse.status != 200) {
      console.error(`${containersResponse.status} received while fetching ${window.location.origin}/containers`);
      showAlert(`API request failed.`);
    }
    else {
      containerData = await containersResponse.json();
      console.debug(`${containerData.length} container(s) retrieved.`);
    }
  }

  // Fetch /projects to find the YAML file that defines them.
  console.info(`Fetching project info from ${window.location.origin}/projects`);
  let projectData = [];
  let projectsResponse = null;
  try {
    let projectsResponse = await fetch(window.location.origin + '/projects');
  }
  catch (ex) {
    console.error(`${ex}`);
    showAlert(`API request failed.`);
  }
  if (projectsResponse) {
    if (projectsResponse.status != 200) {
      console.error(`${projectsResponse.status} received while fetching ${window.location.origin}/projects`);
      showAlert(`API request failed.`);
    }
    else {
      projectData = await projectsResponse.json();
      console.debug(`${projectData.length} project(s) retrieved.`);
    }
  }

  if (projectData.length == 0) {
    html += `<p>No projects defined.</p>`;
  }
  else {
    projectData.forEach(dockerCompose => {
      let htmlChunk = template;
      dockerCompose.contents = dockerCompose.yaml.join('\n');
      htmlChunk = htmlChunk.replace(/{{\w+}}/g, (match) => {
        let property = match.replace(/^{{/, '').replace(/}}$/, '');
        return dockerCompose[property] || match;
      });

      // Show a list of containers associated with the project.
      htmlChunk = htmlChunk.replace(/{{containers}}/, (match) => {
        containerHTML = '';
        console.debug('Project:', dockerCompose.project);
        containerData.forEach(container => {
          let projectLabel = container.Labels['com.docker.compose.project'];
          if (typeof projectLabel !== 'undefined' && projectLabel == dockerCompose.project) {
            let containerName = container.Names[0].replace(/^\//, '');  // Remove leading slash for better readability.
            containerHTML += `<p><a href="#containers/${containerName}" title="Jump to Container"><img alt="container" src="icons/cube-outline.svg"> ${containerName}</a></p>`;
          }
        });
        return containerHTML || '<p>Not deployed.</p>';
      });

      htmlChunk = htmlChunk.replace(/{{composeFile}}/, `<p><img alt="yaml" src="icons/file-code-outline.svg"> ${dockerCompose.filename}</p>`);

      html += htmlChunk;
    });
  }

  document.getElementsByTagName('main')[0].innerHTML = html;

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
  let volumesResponse = null;
  try {
    volumesResponse = await fetch(window.location.origin + '/volumes');
  }
  catch (ex) {
    console.error(`${ex}`);
    showAlert(`API request failed.`);
  }
  if (volumesResponse) {
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
}
