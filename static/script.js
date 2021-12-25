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
  let content = '<h2>Containers</h2>';

  containerData.forEach(container => {
    let stateIcon = '';
    switch (container.State) {
      case 'running':
        stateIcon = 'play-circle-outline.svg';
        break;
      case 'exited':
        stateIcon = 'stop-circle.svg';
        break;
      default:
        stateIcon = 'question.svg';
    }

    let imageTag = container.ImageID;  // Use the sha256 ImageID as the fallback name, but...
    images.forEach(image => {          // Look for a match in the known images for a more friendly name.
      if (image.Id == container.ImageID) {
        imageTag = image.RepoTags[0];
      }
    });

    let createDate = new Date(container.Created * 1000).toLocaleString();  // API uses unix epoch time.

    content += `<details>`;
    content += `<summary>`;
    content += `<img alt="${container.State}" src="icons/${stateIcon}"> ${container.Names[0].replace(/\//, '')}`;
    content += `<span class="controls">`;
    if (container.State == 'running') {
      content += `<a href="javascript:containerControl('stop', '${container.Id}');" title="Stop container"><img alt="stop" src="icons/stop.svg"></a>`;
      content += `<a href="javascript:containerControl('restart', '${container.Id}');" title="Restart container"><img alt="restart" src="icons/restart.svg"></a><br>`;
    }
    else {
      content += `<a href="javascript:containerControl('start', '${container.Id}');" title="Start container"><img alt="start" src="icons/play.svg"></a><br>`;
    }
    content += `</span>`;
    content += `</summary>`;
    content += `<p>`;
    content += `${container.Id}<br>`;
    content += `${imageTag}<br>`;
    content += `${createDate}<br>`;
    content += `${container.Status}<br>`;
    content += `</p>`;
    content += `</details>`;
  });

  document.getElementsByTagName('main')[0].innerHTML = content;
}

/**
 * Call back to format the data from the /images API call as HTML for viewing. 
 * @param {object} imageData, information returned from the API call.
 */
function viewImages(imageData) {
  let content = '<h2>Images</h2>';
  let now = new Date();  // Used as a baseline to calculate image age.

  imageData.forEach(image => {
    let createDate = new Date(image.Created * 1000).toLocaleString();
    let ageIcon = 'icons/calendar-clock.svg';
    if (now - image.Created * 1000 < 30 * 86400000) {  // 86400000 is one day in milliseconds.
      ageIcon = 'icons/calendar-check.svg';
    }

    let repoTag = '&lt;none&gt;';  // When an image is updated, but a container still runs an old image,
    if (image.RepoTags) {          // it's possible to have a null tag.
      repoTag = image.RepoTags[0].replace(/</g, '&lt;').replace(/>/g, '&gt');
    }
    else if (image.RepoDigests) {
      repoTag = image.RepoDigests[0].replace(/@sha256.*/, ':&lt;none&gt;');
    }

    content += `<details>`;
    content += `<summary>`;
    content += `<img alt="freshness indicator" src=${ageIcon}> ${repoTag}`;
    content += `<span class="controls">`;
    content += `<a href="javascript:pullImage('${repoTag}')" title="Pull latest image"><img alt="pull" src="icons/download.svg"></a>`;
    content += `</span>`;
    content += `</summary>`;
    content += `<p>`;
    content += `${image.Id}<br>`;
    content += `${createDate}<br>`;
    content += `${Math.round(image.Size / 1048576)}M<br>`;
    content += `</p>`;
    content += `</details>`;
  });

  document.getElementsByTagName('main')[0].innerHTML = content;
}

/**
 * Callback to format the data from the /stacks API call as HTML for viewing. 
 * @param {object} stackData, information returned from the API call.
 */
function viewStacks(stackData) {
  let content = '<h2>Stacks</h2>';
  let yamlFiles = Object.keys(stackData);

  yamlFiles.forEach(composeFile => {
    let stackName = composeFile.replace(/.yml/, '');
    let linesInFile = stackData[composeFile].split('\n').length;

    content += `<details>`;
    content += `<summary>`;
    content += `<img alt="stack icon" src='icons/view-dashboard-outline.svg'> ${composeFile.replace(/.yaml$/, '').replace(/.yml$/, '')}`;
    content += `<span class="controls">`;
    content += `<a href="javascript:stackControl('up', '${stackName}');" title="Deploy Stack"><img alt="Up" src="icons/arrow-up-thick.svg"></a>`;
    content += `<a href="javascript:stackControl('down', '${stackName}');" title="Remove Stack"><img alt="Up" src="icons/arrow-down-thick.svg"></a>`;
    content += `<a href="javascript:stackControl('restart', '${stackName}');" title="Restart Stack"><img alt="Up" src="icons/arrow-u-up-right-bold.svg"></a><br>`;
    content += `</span>`;
    content += `</summary>`;
    content += `<textarea rows="${linesInFile}" cols="60" readonly wrap="off">${stackData[composeFile]}</textarea><br>`;
    content += `</details>`;
  });

  document.getElementsByTagName('main')[0].innerHTML = content;
}

/**
 * Callback to format the data from the /volumes API call as HTML for viewing. 
 * @param {object} volumeData, information returned from the API call.
 */
function viewVolumes(volumeData) {
  let content = '<h2>Volumes</h2>';
  volumeData.Volumes.forEach(volume => {
    let timeStamp = new Date(volume.CreatedAt).toLocaleString();
    content += `<details>`;
    content += `<summary><img alt="stack icon" src='icons/database-outline.svg'> ${volume.Name}</summary>`;
    content += `<p>`;
    content += `${volume.Mountpoint}<br>`;
    content += `${timeStamp}<br>`;
    content += `</p>`;
    content += `</details>`;
  })
  document.getElementsByTagName('main')[0].innerHTML = content;
}
