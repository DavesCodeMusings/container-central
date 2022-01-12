# Container Central Quick Start

## Running
On Raspberry Pi, the easiest way to run Container Central is to use the Docker container. Start the container using a Docker volume for persistent data, like this:

```
docker run -d \
  --name container-central \
  -p 8088:8088 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v cc_data:/app/data \
  davescodemusings/container-central:latest
```

For WSL2 and other x86-based systems, use the x86 tag, like this:

```
docker run -d \
  --name container-central \
  -p 8088:8088 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v cc_data:/app/data \
  davescodemusings/container-central:x86
```

## The Home Screen
Point your browser to your Pi, like this: http://mypi.home:8088 (or use the IP address.) You'll see a simple menu and an overview of your system, like this:

![menu](screenshots/home.png)

The layout will be slightly different on mobile phones and other small screen devices, but the information displayed is the same.

Underneath the information about your system resources, you'll see a status of the containers. Refering to the screenshot, you can see eleven of twelve containers are running, none are paused, and one is stopped.

You can also see that there are seventeen Docker images, two Docker Compose stacks, and one Docker volume. Clicking or tapping on any of these items will take you to a more detailed view. (You can also use the menu selections on the left to do the same thing.)

## Containers
When selecting containers, ou will see a list of Docker containers running on the host. This is similar to running `docker ps` on the command-line.

![container view](screenshots/containers.png)

The state of each container is shown by the round icon before the container's name. A triangle indicates it's running. A square indicates it is stopped. In the screenshot above, all containers are running except for esphome.

Clicking or tapping on the container name will open up details about the containers. Tapping on the container's image name will take you to the images menu item. Selecting the stack name will take you to the Stacks menu and the Docker Compose configuration for the container. You're also presented with controls to stop, start, or restart the container.

If there are stopped containers, you'll see a trash can icon at the bottom of the list. You can tap or click this to remove (prune in Docker lingo) the stopped containers.

## Images
Select images and you will see all the container images, similar to using the command `docker image ls`.

![image view](screenshots/images.png)

You can get a quick estimation of a container's age by looking at the calendar icon in front of its name. If the calendar has a check mark in it, the image is less than 30 days old. If the calendar has a clock in it, the image is older than 30 days.

If you expand the details of the container you'll be presented with more information and a download option to pull a more recent version. (The download option also appears if you hover the mouse pointer.) Image downloads can take a bit of time. A pop-up will appear when it's done.

If any images are no longer being used, a trash can icon will appear at the bottom of the list. Click or tap to delete the unused images.

## Stacks
Select the stacks menu choice and you will see a list of Docker Compose projects.

![stacks view](screenshots/stacks.png)

What you see here are any Docker Compose YAML files avaialble to deploy. Container Central stores these in the _data/compose_ directory.

Clicking the up arrow will deploy the stack, just like typing the command `docker-compose -f nginx.yml -p nginx up -d` The down arrow is the same as `docker-compose down` and the U-turn arrow will let you do a restart.

You can create your own Docker Compose YAML files and save them in the _data/compose_ directory, or you can configure a git repository and pull them from there. Which ever option you choose, name the YAML files with the stack name. For example, _nginx-test.yml_ in _data/compose_ appears here in the stacks view as _nginx-test_.

## Volumes
Select volumes to view Docker Volume information as if you had typed `docker volume ls` from the command-line. It's not very exciting, so there's no screenshot.

## Configuration
This is where you can enter site specific settings, like the URL for the git repository for Docker Compose files.

## Next Steps
For a more in-depth look at how to use Container Central, see the [HowTo docuument](HowTo.md)
