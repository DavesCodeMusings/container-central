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

Open Container Central in a web browser to make sure everything is working as expected. If anything is not right, use the `docker logs` command for the container to get additional information to help you troubleshoot.

## Pull the repository using the Stacks menu
Once Container Central is running as a Docker container, you can test the git integration.

1. Select the Stacks menu.
2. Find the code branch icon on the righthand side and tap or click it.
3. Watch for a pop-up alert that says, "Compose files are up to date," and a listing of compose projects on the Stacks page.

If you see an error message instead, check the container logs with `docker logs` to get more detailed information.

>If you're trying to pull from a locally-hosted git server using https, you may see this message in the container logs:
>```
>fatal: unable to access 'https://local.git.server/pi/docker-compose.git/': server certificate verification failed. CAfile: none CRLfile: none
>```
>
>If that happens, try adding `-v /etc/ssl:/etc/ssl` to your docker run command.

Hopefully all goes well. As a final check, you can look inside the _data/compose_ directory and verify the files match what's in the git repository.

## Maintaining your Docker Compose files
Any changes made to files should be pushed to the git repository. Then, from Container Central's Stacks menu, click or tap the branch icon to pull the latest versions.
