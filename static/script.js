/**
 * Show a pop-up message similar to alert(msg) but styled with css and auto-closing.
 * @param {string} msg, the text to display.
 */
function showAlert(msg) {
  alertDiv = document.getElementById('alert');
  alertDiv.innerHTML = msg;
  alertDiv.style.display = 'block';
  setTimeout(() => { alertDiv.style.display = 'none'; }, 7000);
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
 * A wrapper for the /stacks up, down, restart API calls.
 * @param {string} action, one of: start, stop, restart.
 * @param {string} stackName, the project name for the stack.
 */
async function stackControl(action, stackName) {
  switch (action) {
    case 'git-pull':
      showAlert('Pulling compose files from git repository...');
      break;
    case 'up':
      showAlert(`Deploying ${stackName}...`);
      break;
    case 'down':
      showAlert(`Stopping ${stackName}...`);
      break;
    case 'restart':
      showAlert(`Redeploying ${stackName}...`);
      break;
    default:
      showAlert(`${stackName} ${action}`);
  }
  if (action == 'git-pull') {
    let response = await fetch(`/stacks/git`);
    if (response.status == 200) {
      showAlert('Compose files are up to date.');
    }
    else {
      let msg = await response.text();
      showAlert(`Git pull error: ${msg}`);
    }
    viewStacks();
  }
  else {
    let response = await fetch(`/stacks/${stackName}/${action}`, { method: 'POST' });
    if (response.status == 200) {
      switch (action) {
        case 'up':
          showAlert(`${stackName} deployed.`);
          break;
        case 'down':
          showAlert(`${stackName} is down.`);
          break;
        case 'restart':
          showAlert(`${stackName} redeployed.`);
          break;
        default:
          showAlert(`${stackName} ${action} complete.`);
      }
    }
    viewStacks();
  }
}

/**
 * Retrieve data from the /containers API call and format as HTML for viewing. 
 */
 async function viewInfo() {
  let html = '';
  let template = `
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
        <a href="javascript:viewStacks()" title="Stacks">
          <img alt="Stacks:" src="icons/format-list-bulleted-type.svg"> {{numStacks}}
        </a>
      </span>
      <span class="grouping">
        <a href="javascript:viewVolumes()" title="Volumes">
          <img alt="Volumes:" src="icons/database-outline.svg"> {{numVolumes}}
        </a>
      </span>
    </p>
  `;

  // Docker Compose "stacks" are not part of the /info API call.
  console.log(`Fetching stacks from ${window.location.origin}/stacks`);
  let numStacks = 0;
  let stacksResponse = await fetch(window.location.origin + '/stacks');
  if (stacksResponse.status != 200) {
    console.log(`${stacksResponse.status} received while fetching ${window.location.origin}/stacks`);
  }
  else {
    let stacksInfo = await stacksResponse.json();
    numStacks = stacksInfo.length;
  }

  // A count of volumes is not included in /info and muct be gathered separately.
  console.log(`Fetching volumes from ${window.location.origin}/volumes`);
  let numVolumes = 0;
  let volumesResponse = await fetch(window.location.origin + '/volumes');
  if (volumesResponse.status != 200) {
    console.log(`${volumesResponse.status} received while fetching ${window.location.origin}/volumes`);
  }
  else {
    let volumesInfo = await volumesResponse.json();
    numVolumes = volumesInfo.Volumes.length; 
  }

  // All of the other information comes from /info.
  console.log(`Fetching info from ${window.location.origin}/info`);
  try {
    let infoResponse = await fetch(window.location.origin + '/info');
    if (infoResponse.status != 200) {
      console.log(`${infoResponse.status} received while fetching ${window.location.origin}/info`);
    }
    else {
      let info = await infoResponse.json();
      info.ram = (info.MemTotal / 1024 / 1024 / 1024).toFixed(2);  // measuring in Gig seems a safe bet
      info.numStacks = numStacks;
      info.numVolumes = numVolumes;

      html += template.replace(/{{\w+}}/g, (match) => {
        let property = match.replace(/^{{/, '').replace(/}}$/, '');
        return info[property];
      });

      document.getElementsByTagName('main')[0].innerHTML = html;
    }
  }
  catch {
    showAlert(`API request failed.`);
  }
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
          <a href="javascript:containerControl('stop', '{{Id}}');" title="Stop container"><img alt="stop" src="icons/stop.svg"></a>
          <a href="javascript:containerControl('start', '{{Id}}');" title="Start container"><img alt="start" src="icons/play.svg"></a>
          <a href="javascript:containerControl('restart', '{{Id}}');" title="Restart container"><img alt="restart" src="icons/restart.svg"></a>
        </span>
      </summary>
      <p>
        {{Id}}<br>
        <a href="javascript:viewImages('{{imageTag}}');">{{imageTag}}</a><br>
        {{createDate}}<br>
        {{Status}} <a href="javascript:viewStacks('{{stackName}}');"><i>{{stackName}}</i></a><br>
      </p>
    </details>
  `;

  // Image IDs are referenced in container. Fetching image data allows more friendly image tags.
  // But it's not critical, so failure to retrieve is not fatal.
  let imageData = [];
  console.log(`Fetching image info from ${window.location.origin}/images`);
  try {
    let imagesResponse = await fetch(window.location.origin + '/images');
    if (imagesResponse.status != 200) {
      console.log(`${imagesResponse.status} received while fetching ${window.location.origin}/images`);
    }
    else {
      imageData = await imagesResponse.json();
      console.log(`${imageData.length} image(s) retrieved.`);
    }

    console.log(`Fetching container info from ${window.location.origin}/containers`);
    let containersResponse = await fetch(window.location.origin + '/containers');
    if (containersResponse.status != 200) {
      console.log(`${containersResponse.status} received while fetching ${window.location.origin}/containers`);
      html += `<p>API error ${containersResponse.status}</p>`;
    }
    else {
      let containerData = await containersResponse.json();
      console.log(`${containerData.length} container(s) retrieved.`);

      let anyStopped = 0;
      containerData.forEach(container => {
        switch (container.State) {
          case 'running':
            container.stateIcon = 'play-circle-outline.svg';
            break;
          case 'exited':
            container.stateIcon = 'stop-circle.svg';
            anyStopped++;
            break;
          default:
            container.stateIcon = 'question.svg';
        }

        container.name = container.Names[0].replace(/\//, '');  // Names come with a leading /, but it looks better without.

        if (container.Labels && container.Labels['com.docker.compose.project']) {
          container.stackName = container.Labels['com.docker.compose.project'];
        }
        else {
          container.stackName = '';
        }

        container.imageTag = container.ImageID;  // Use the sha256 ImageID as the fallback name, but...
        imageData.forEach(image => {             // Look for a match in the known images for a more friendly name.
          if (image.Id == container.ImageID && image.RepoTags) {
            container.imageTag = image.RepoTags[0];
          }
        });

        container.createDate = new Date(container.Created * 1000).toLocaleString();  // API uses unix epoch time.

        html += template.replace(/{{\w+}}/g, (match) => {
          let property = match.replace(/^{{/, '').replace(/}}$/, '');
          return container[property];
        });
      });

      if (anyStopped) {
        html += `<p><img alt="trash-can" class="control-aside" onclick="containerControl('prune');" src="icons/trash-can-outline.svg"><p>`;
      }

      document.getElementsByTagName('main')[0].innerHTML = html;
    }
  }
  catch {
    showAlert(`API request failed.`);
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
        <span class="popup-controls grouping">
          <a href="javascript:imageControl('pull', '{{tag}}')" title="Pull latest image"><img alt="pull" src="icons/download.svg"></a>
        </span>
      </summary>
      <p>
        {{Id}}<br>
        {{createDate}}<br>
        {{size}}M
      </p>
    </details>
  `;

  console.log(`Fetching image info from ${window.location.origin}/images`);
  try {
    let imagesResponse = await fetch(window.location.origin + '/images');
    if (imagesResponse.status != 200) {
      console.log(`${imagesResponse.status} received while fetching ${window.location.origin}/images`);
      html += `<p>API error ${imagesResponse.status}</p>`;
    }
    else {
      let imageData = await imagesResponse.json();
      console.log(`${imageData.length} image(s) retrieved.`);

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
          return image[property];
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
 * Retrieve data from the /stacks API call and format as HTML for viewing. 
 */
async function viewStacks(projectOfInterest) {
  let html = `<h2>Stacks <img alt="refresh" class="control-aside" src="icons/refresh.svg" onclick="viewStacks();"></h2>`;
  let template = `
    <details id="{{project}}">
      <summary><img alt="stack icon" src='icons/format-list-bulleted-type.svg'> {{project}}
        <span class="popup-controls grouping">
          <a href="javascript:stackControl('up', '{{project}}');" title="Deploy Stack"><img alt="Up" src="icons/arrow-up-thick.svg"></a>
          <a href="javascript:stackControl('down', '{{project}}');" title="Remove Stack"><img alt="Up" src="icons/arrow-down-thick.svg"></a>
          <a href="javascript:stackControl('restart', '{{project}}');" title="Restart Stack"><img alt="Up" src="icons/arrow-u-up-right-bold.svg"></a>
        </span>
      </summary>
      <pre>{{content}}</pre>
    </details>
  `;

  console.log(`Fetching stack info from ${window.location.origin}/stacks`);
  try {
    let stacksResponse = await fetch(window.location.origin + '/stacks');
    if (stacksResponse.status != 200) {
      console.log(`${stacksResponse.status} received while fetching ${window.location.origin}/stacks`);
    }
    else {
      let stackData = await stacksResponse.json();
      console.log(`${stackData.length} stack(s) retrieved.`);

      if (stackData.length == 0) {
        html += `<p>No stacks defined.</p>`;
      }
      else {
        stackData.forEach(dockerCompose => {
          dockerCompose.project = dockerCompose.filename.replace(/.yml/, '');
          dockerCompose.lines = dockerCompose.content.split('\n').length;
          html += template.replace(/{{\w+}}/g, (match) => {
            let property = match.replace(/^{{/, '').replace(/}}$/, '');
            return dockerCompose[property];
          });
        });
        document.getElementsByTagName('main')[0].innerHTML = html;
      }
    }

    html += `<p><img alt="git-pull" class="control-aside" onclick="stackControl('git-pull');" src="icons/source-branch.svg"><p>`;
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
      <summary><img alt="generic stack icon" src='icons/database-outline.svg'> {{Name}}</summary>
      <p>
        {{Mountpoint}}<br>
        {{timeStamp}}
      </p>
    </details>
  `;

  console.log(`Fetching volume info from ${window.location.origin}/volumes`);
  try {
    let volumesResponse = await fetch(window.location.origin + '/volumes');
    if (volumesResponse.status != 200) {
      console.log(`${volumesResponse.status} received while fetching ${window.location.origin}/volumes`);
    }
    else {
      let volumeData = await volumesResponse.json();
      console.log(`${volumeData.Volumes.length} volume(s) retrieved.`);
      volumeData.Volumes.forEach(volume => {
        volume.timeStamp = new Date(volume.CreatedAt).toLocaleString();
        html += template.replace(/{{\w+}}/g, (match) => {
          let property = match.replace(/^{{/, '').replace(/}}$/, '');
          return volume[property];
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
        <label for="git-no-verify-ssl">Skip SSL Verification:</label> <input id="git-no-verify-ssl" name="gitNoVerifySSL" type="checkbox" value="true">
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
  
  console.log(`Fetching configuration from ${window.location.origin}/config`);
  try {
    let configResponse = await fetch(window.location.origin + '/config');
    if (configResponse.status != 200) {
      console.log(`${configResponse.status} received while fetching ${window.location.origin}/config`);
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