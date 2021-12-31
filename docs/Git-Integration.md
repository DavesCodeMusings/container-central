# Git Integration for Stacks

_This is a work in progress. Additional development is needed before git integration is supported._

With a little configuration, Container Central can reference Docker Compose YAML stored in a git repository. Here's a high-level view of the steps:

1. Add the git URL to Container Central's config.json and (re)start the container.
2. Open Container Central in a browser and select the Stacks menu.
3. Find the source code branch symbol on the righthand side and click it.

## Add the git URL to config.json
The most basic docker run command for Container Central uses the default configuration parameters, but it's not hard to create a config.json and bind mount it. Here's an example of the config.json:

```
{
  "composeDirectory": "/home/pi/compose-files",
  "gitUrl": "https://git.mypi.home/pi/compose-files.git",
}
```

In the example above, the git server is hosted locally and the clone URL is https://git.mypi.home/pi/docker-compose.git. You could also use a public git server, like GitHub or GitLab. Just copy the _Clone with HTTP_ link and use it to define "gitURL" in the config.json file.

You may also want to redefine the directory that stores the Docker Compose files locally. This is done with "composeDirectory". (If you don't specify "composeDirectory", the files will reside inside the container in /app/compose.)

Now, start the container with a bind mount for config.json and the compose files directory, like this:

```
docker run -d \
  -p 8088:8088 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v config.json:/app/config.json \
  -v ./compose-files:/app/compose \
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
