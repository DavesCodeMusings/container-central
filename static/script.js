/**
 * @global {object} images, a cached copy of the initial API call to /images.
 */
var images = {};

/**
 * Make an async GET request to the API and pass the parsed JSON to the callback.
 * @param {string} path, as in the path part of http://host:port/path, including the /
 * @param {function} callback
 */
function apiGet(path, callback) {
  let url = window.location.origin + path;
  document.body.style.cursor = 'wait';
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        callback(JSON.parse(this.responseText));
      }
      else {
        alert(`Error communicating with server.\n${this.responseText}`);
      }
      document.body.style.cursor = 'default';
    }
  };
  xhttp.open('GET', url, true);
  xhttp.send();
}

/**
 * Make an async POST request to the API and pass the parsed JSON to the callback.
 * @param {string} path, as in the path part of http://host:port/path, including the /
 * @param {function} callback
 */
function apiPost(path, callback) {
  let url = window.location.origin + path;
  document.body.style.cursor = 'wait';
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        callback(JSON.parse(this.responseText));
      }
      else {
        alert(`Error communicating with server.\n${this.responseText}`);
      }
      document.body.style.cursor = 'default';
    }
  };
  xhttp.open('POST', url, true);
  xhttp.send();
}

/**
 * Callback function to create a copy of the /images API call results.
 * This is needed to match containers to image names rather than sha256 tags.
 * @param {object} imageApiResult, the data received from the API call.
 */
function cacheImages(imageApiResult) {
  images = imageApiResult;
}

/**
 * Callback function to format the data from the /info API call for viewing.
 * @param {object} info, data about the Docker host returned from the API call.
 */
function viewInfo(info) {
  let html = '';
  let template = `
    <h2>{{Name}}</h2>
    <p>
      <img alt="Host" src="icons/memory.svg"> {{NCPU}} CPU / {{ram}}G<br>
      <span style="margin-right: 1em;">
        <a href="javascript:apiGet('/containers', viewContainers)" style="text-decoration: none;">
          <img alt="Running:" src="icons/play.svg"> {{ContainersRunning}}/{{Containers}}
          <img alt="Paused:" src="icons/pause.svg"> {{ContainersPaused}}
          <img alt="Stopped:" src="icons/stop.svg"> {{ContainersStopped}}
        </a>
      </span>
      <span style="margin-right: 1em;">
        <a href="javascript:apiGet('/images', viewImages)" style="text-decoration: none;">
          <img alt="Images:" src="icons/file-outline.svg"> {{Images}}
        </a>
      </span>
      <span style="margin-right: 1em;">
        <a href="javascript:apiGet('/stacks', viewStacks)" style="text-decoration: none;">
          <img alt="Images:" src="icons/view-dashboard-outline.svg"> {{stacks}}
        </a>
      </span>
    </p>
  `;

  info.ram = (info.MemTotal / 1024 / 1024 / 1024).toFixed(2);

  // Replace template entries like {{property}} with properties found in the info object.
  html += template.replace(/{{\w+}}/g, (match) => {
    let property = match.replace(/^{{/, '').replace(/}}$/, '');
    return info[property];
  });

  document.getElementsByTagName('main')[0].innerHTML = html;
}

/**
 * A wrapper for the /containers start, stop API calls.
 * @param {string} action, one of: start, stop, restart.
 * @param {string} containerId, the uuid of the container.
 */
function containerControl(action, containerId) {
  console.log(`Telling conntainer ${containerId} to ${action}`);
  apiPost(`/containers/${containerId}/${action}`, alert);  // Pop up results when done.
}

/**
 * A wrapper for the /stacks up, down, restart API calls.
 * @param {string} action, one of: start, stop, restart.
 * @param {string} containerId, the uuid of the container.
 */
function stackControl(action, stackName) {
  console.log(`docker-compose ${stackName} ${action}`);
  apiPost(`/stacks/${stackName}/${action}`, alert);  // Pop up results when done.
}

/**
 * A wrapper for the /pull API call that URI encodes the image tag.
 * @param {string} imageTag, in the format name:tag. (e.g. debian:lite)
 */
function pullImage(imageTag) {
  let encodedImageTag = encodeURIComponent(imageTag);
  console.log(`Pulling ${imageTag}`);
  apiPost(`/pull/${encodedImageTag}`, alert);  // Pop up results when done.
}

/**
 * Callback to format the data from the /containers API call as HTML for viewing. 
 * @param {object} containerData, information returned from the API call.
 */
function viewContainers(containerData) {
  let html = '<h2>Containers</h2>';
  let template = `
    <details>
      <summary><img alt="{{State}}" src="icons/{{stateIcon}}"> {{name}}
        <span class="controls">
          <a href="javascript:containerControl('stop', '{{Id}}');" title="Stop container"><img alt="stop" src="icons/stop.svg"></a>
          <a href="javascript:containerControl('start', '{{Id}}');" title="Start container"><img alt="start" src="icons/play.svg"></a>
          <a href="javascript:containerControl('restart', '{{Id}}');" title="Restart container"><img alt="restart" src="icons/restart.svg"></a>
        </span>
      </summary>
      <p>
        {{Id}}<br>
        {{imageTag}}<br>
        {{createDate}}<br>
        {{Status}}<br>
      </p>
    </details>
  `;

  containerData.forEach(container => {
    switch (container.State) {
      case 'running':
        container.stateIcon = 'play-circle-outline.svg';
        break;
      case 'exited':
        container.stateIcon = 'stop-circle.svg';
        break;
      default:
        container.stateIcon = 'question.svg';
    }

    container.name = container.Names[0].replace(/\//, '');

    container.imageTag = container.ImageID;  // Use the sha256 ImageID as the fallback name, but...
    images.forEach(image => {                // Look for a match in the known images for a more friendly name.
      if (image.Id == container.ImageID) {
        container.imageTag = image.RepoTags[0];
      }
    });

    container.createDate = new Date(container.Created * 1000).toLocaleString();  // API uses unix epoch time.

    // Replace template entries like {{property}} with properties found in the container object.
    html += template.replace(/{{\w+}}/g, (match) => {
      let property = match.replace(/^{{/, '').replace(/}}$/, '');
      return container[property];
    });
  });

  document.getElementsByTagName('main')[0].innerHTML = html;
}

/**
 * Call back to format the data from the /images API call as HTML for viewing. 
 * @param {object} imageData, information returned from the API call.
 */
function viewImages(imageData) {
  let html = '<h2>Images</h2>';
  let template = `
    <details>
      <summary><img alt="freshness indicator" src={{ageIcon}}> {{tag}}
        <span class="controls">
          <a href="javascript:pullImage('{{tag}}')" title="Pull latest image"><img alt="pull" src="icons/download.svg"></a>
        </span>
      </summary>
      <p>
        {{Id}}<br>
        {{createDate}}<br>
        {{size}}M
      </p>
    </details>
  `;

  let now = new Date();  // Used as a baseline to calculate image age.

  imageData.forEach(image => {
    image.createDate = new Date(image.Created * 1000).toLocaleString();
    if (now - image.Created * 1000 < 30 * 86400000) {  // 86400000 is one day in milliseconds.
      image.ageIcon = 'icons/calendar-check.svg';
    }
    else {
      image.ageIcon = 'icons/calendar-clock.svg';
    }

    // When an image is updated, but a container still runs an old image, it's possible to have a null tag.
    if (image.RepoTags) {
      image.tag = image.RepoTags[0].replace(/</g, '&lt;').replace(/>/g, '&gt');
    }
    else {
      image.tag = '&lt;none&gt;';
    }

    image.size = Math.round(image.Size / 1048576);

    // Replace template entries like {{property}} with properties found in the image object.
    html += template.replace(/{{\w+}}/g, (match) => {
      let property = match.replace(/^{{/, '').replace(/}}$/, '');
      return image[property];
    });
  });

  document.getElementsByTagName('main')[0].innerHTML = html;
}

/**
 * Callback to format the data from the /stacks API call as HTML for viewing. 
 * @param {object} stackData, information returned from the API call.
 */
function viewStacks(stackData) {
  let html = '<h2>Stacks</h2>';
  let template = `
    <details>
      <summary><img alt="stack icon" src='icons/view-dashboard-outline.svg'> {{project}}
        <span class="controls">
          <a href="javascript:stackControl('up', '{{project}}');" title="Deploy Stack"><img alt="Up" src="icons/arrow-up-thick.svg"></a>
          <a href="javascript:stackControl('down', '{{project}}');" title="Remove Stack"><img alt="Up" src="icons/arrow-down-thick.svg"></a>
          <a href="javascript:stackControl('restart', '{{project}}');" title="Restart Stack"><img alt="Up" src="icons/arrow-u-up-right-bold.svg"></a>
        </span>
      </summary>
      <textarea rows="{{lines}}" cols="60" readonly wrap="off">{{content}}</textarea>
    </details>
  `;

  stackData.forEach(dockerCompose => {
    dockerCompose.project = dockerCompose.filename.replace(/.yml/, '');
    dockerCompose.lines = dockerCompose.content.split('\n').length;

    // Replace template entries like {{property}} with properties found in the dockerCompose object.
    html += template.replace(/{{\w+}}/g, (match) => {
      let property = match.replace(/^{{/, '').replace(/}}$/, '');
      return dockerCompose[property];
    });
  });

  document.getElementsByTagName('main')[0].innerHTML = html;
}

/**
 * Callback to format the data from the /volumes API call as HTML for viewing. 
 * @param {object} volumeData, information returned from the API call.
 */
function viewVolumes(volumeData) {
  let html = '<h2>Volumes</h2>';
  let template = `
    <details>
      <summary><img alt="generic stack icon" src='icons/database-outline.svg'> {{Name}}</summary>
      <p>
        {{Mountpoint}}<br>
        {{timeStamp}}
      </p>
    </details>
  `;

  volumeData.Volumes.forEach(volume => {
    volume.timeStamp = new Date(volume.CreatedAt).toLocaleString();

    // Replace template entries like {{property}} with properties found in the volume object.
    html += template.replace(/{{\w+}}/g, (match) => {
      let property = match.replace(/^{{/, '').replace(/}}$/, '');
      return volume[property];
    });
  })

  document.getElementsByTagName('main')[0].innerHTML = html;
}
