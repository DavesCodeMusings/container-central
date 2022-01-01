# Git Integration for Stacks

_This is a work in progress._

With a little configuration, Container Central can reference Docker Compose YAML stored in a git repository. Here's a high-level view of the steps:

1. Add the git URL to Container Central's config.json and (re)start the container.
2. Open Container Central in a browser and select the Stacks menu.
3. Find the source code branch symbol on the righthand side and click it.

## Add the git URL to config.json
The most basic docker run command for Container Central uses the default configuration parameters, but it's not hard to create a config.json and bind mount it. Here's an example of the config.json:

```
{
  "gitUrl": "https://git.mypi.home/pi/compose-files.git"
}
```

In the example above, the git server is hosted locally and the clone URL is https://git.mypi.home/pi/compose-files.git. You could also use a public git server, like GitHub or GitLab. Just copy the _Clone with HTTP_ link and use it to define "gitURL" in the config.json file.

Create a directory called _data_ when you can store _config.json_. Then create an empty directory called _compose_ under _data_ for storing the Docker Compose files.

When you're done the _data_ directory should look like this:

```
$ ls -RF data
data:
compose/  config.json

data/compose:
```

Now, start the container with a bind mount for _data_, like this:

```
docker run -d \
  -p 8088:8088 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ${PWD}/data:/app/data \
  davescodemusings/container-central:latest
```

## Pull the repository using the Stacks menu
1. Open Container Central in a web browser.
2. Select the Stacks menu.
3. Find the code branch icon on the righthand side and tap it.
4. Look for error messages in the browser window and the container logs.

Hopefully, there are no error messages and everything is working as expected. If you see errors in th browser window, you can get more detail by using `docker logs` to examine the container logs for Container Central.

## Maintaining your Docker Compose files
Any changes made to files should be pushed to the git repository. Then, from Container Central's Stacks menu, click or tap the branch icon to pull the latest versions.
