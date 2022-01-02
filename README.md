# Container Central
A totally minimalist, not quite ready for prime time, but still pretty good solution for managing Docker containers on Raspberry Pi.

## What is it?
Container Central is a web-based management tool for Docker containers that focuses on the needs of the home LAN user. My target is a Raspberry Pi running Docker and a handful of containers. That's it.

## Why?
There are pleny of full-featured container management apps out there. Portainer is one of my favorites. But all the ones I've looked at have "enterprise features" in an attempt to get you to pay for a license rather than using the "community version".

I'm running a single Raspberry Pi in my home. I trust my users. I have no need for any enterprise features. I just want simple. Like most open source developers, I had an itch and I scratched it. This is the product.

## How can I use it?
Get the [Docker image](https://hub.docker.com/r/davescodemusings/container-central) and run it. This is probably the easiest method.

There is a [Quick Start](docs/QuickStart.md) document to get you up and going with minimal hassle.

When you're done with that, take a look at the [other docs](docs/) to explore more features of Container Central.

## Where's all this going?
Currently, Container Central can manage already deployed conainers or deploy new ones using Docker Compose stacks. It can't deal with swarm mode or kubernetes. But, it can pull the latest version of any images from Docker Hub. It can deploy any Docker Compose projects you have the YAML files for. It can even integrate with a locally-hosted git server.

My idea is to focus on the features needed for a typical Raspberry Pi home server. Here's some workflow examples to show where Container Central fits in and where it does not:

1. You find an interesting Docker container and start it with `docker run`. You can use Container Central to stop and start the container and to pull updated images.
2. You have a docker-compose.yml that you've used to deploy one or more containers. You can copy the docker-compose.yml to Container Central's _compose_ directory (or use the git integration.) Now you can control the stack by pointing and clicking.
3. You've got old containers or images that you want to remove. Container Central will show a trash can icon in the lower right corner. Clicking this is like running `docker container prune` or `docker image prune`.

There are more features to add, but I'm starting small and working my way up. This is a hobby, not a business venture.

## Are there screenshots or what???
You betcha!

(Mobile device screenshots were taken in dark mode. Yes! There is a dark mode.)

### Mobile Device...

![image](https://user-images.githubusercontent.com/61114342/147377658-d974fb08-271c-4ed7-9474-ce201ad5ebdc.png)

_Containers view shown in portrait mode on simulated mobile phone_

![image](https://user-images.githubusercontent.com/61114342/147377722-1a578d30-0e7e-4c74-8101-cfd59cde6140.png)

_Container images view shown in landscape mode mobile phone._

### Laptop / Desktop...

![image](https://user-images.githubusercontent.com/61114342/147377790-d847aa4b-4b40-4009-84d8-a481206aaccf.png)

_Stacks view shown on a typical landscape mode display panel._
