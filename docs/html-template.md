# Understanding the HTML Templates
To make code easier to read, dynamically generated HTML is created using a simple template and substitution process.

Here's an example:

```
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
```

The function above generates HTML. It does so by using the template variable as a starting point. Anything in double braces, like this: {{Mountpoint}} is replaced later with the value of an object property. This makes the code easier to read than the previous method of concatenating line after line.

The Docker API returns properties using title case, like this: Mountpoint or ImageId. Any other values that are calculated or transformed from the API values, but not present in the data from the API, are represented in camel case, like this: timeStamp. This is handy for preventing acidental name collisions when these derived properties are added to the object returned from the API.
