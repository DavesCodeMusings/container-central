# Container Central
A totally low-tech, not ready for prime time solution for managing Docker containers on Raspberry Pi.

## What is it?
Container Central is a very stripped down web-based management tool for Docker containers. My target is a Raspberry Pi running Docker and a handful of containers. That's it.

Right now it's capable of viewing information about existing containers, images, Docker Compose stacks and Docker volumes. It can also pull updated images from Docker Hub.

In the future, I plan to add:
* User interface improvements like automatic refresh.
* Documentation and examples for reverse proxy SSL.

## Why?
There are pleny of full-featured container management apps out there. Portainer is one of my favorites. But all the ones I've looked at have "enterprise features" in an attempt to get you to pay for a license rather than using the "community version".

I'm running a single Raspberry Pi in my home. I trust my users. I have no need for any enterprise features. I just want simple. Like most open source, I had an itch and I scratched it. This is the byproduct.

## How can I use it?
There is a Docker image at: https://hub.docker.com/r/davescodemusings/container-central and instructions on how to deploy it. This is probably the easiest method.

You can install node.js on your Pi and run it that way. Start it up using the command `./central.js` to start it up and try it out, or use `start.sh` to run it as a background process.

## Where's all this going?
Currently, Container Central can manage already deployed conainers and Docker Compose stacks. It cannot run a new container or create a new docker-compose.yml. It can't deal with swarm mode or kubernetes. But, it can start, stop or restart existing containers. It can pull the latest version of any images from Docker Hub. It can deploy and remove Docker Compose projects if a YAML file exists.

My idea is to focus on the features needed for a typical Raspberry Pi home server. Here's some workflow examples to show where Container Central fits in and where it does not:

1. You find an interesting Docker container and start it with `docker run`. You can use Container Central to stop and start the container and to pull updated images.
2. You have a docker-compose.yml that you've used to deploy one or more containers. You can copy the docker-compose.yml to Container Central's _compose_ directory. Now you can control the stack by pointing and clicking.
3. You've got old containers or images that you want to remove. Sorry, Container Central can't do that yet. You'll have to use `docker rm` or another tool.

There are more features to add, but I'm starting small and working my way up. This is a hobby, not a business venture. But, Container Central has dark mode. Did I mention dark mode?

## Are there screenshots or what???
You betcha!

(Screenshots were taken in dark mode. Yes! There is a dark mode.)

### Mobile Device...

![image](https://user-images.githubusercontent.com/61114342/147377658-d974fb08-271c-4ed7-9474-ce201ad5ebdc.png)

_Containers view shown in portrait mode on simulated mobile phone_

![image](https://user-images.githubusercontent.com/61114342/147377722-1a578d30-0e7e-4c74-8101-cfd59cde6140.png)

_Container images view shown in landscape mode mobile phone._

### Laptop / Desktop...

![image](https://user-images.githubusercontent.com/61114342/147377790-d847aa4b-4b40-4009-84d8-a481206aaccf.png)

_Stacks view shown on a typical landscape mode display panel._
