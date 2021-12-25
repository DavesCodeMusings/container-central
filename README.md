# Container Central
A totally low-tech, not ready for prime time solution for managing Docker containers.

## What is it?
Container Central is a very stripped down management web-based tool for Docker containers. My target is a Raspberry Pi running Docker and a handful of containers. That's it.

Right now it's capable of viewing information about containers, images, and volumes. It can also pull updated images.

In the future, I plan to add:
* Deploying stacks with docker-compose.
* User interface improvements like automatic refresh.
* Documentation and examples for reverse proxy SSL.

## Why?
There are quite a few full-featured container management apps out there. Portainer is one of my favorites. But all the ones I've looked at have "enterprise features" in an attempt to get you to pay for a license rather than using the "community version".

I'm running a single Raspberry Pi in my home. I trust my users. I have no need for any enterprise features. I just want simple.

Like most open source, I had an itch and I scratched it. This is the byproduct.

## How can I use it?
There is a Docker image at: https://hub.docker.com/r/davescodemusings/container-central

Or you can install node.js on your Pi and run it that way. The included `start.sh` script will help with that.

## Where's all this going?
There are more features to add, but I'm starting small and working my way up. This is a hobby, not a business venture.

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
