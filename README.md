# Container Central
A low-tech solution to managing Docker containers.

## What is it?
Container Central is a very stripped down management web-based tool for Docker containers. My target is a Raspberry Pi running Docker and a handful of containers. That's it.

Right now it's capable of viewing information about containers, images, and volumes. It can also pull updated images.

In the future, I plan to add:
* Stoping, starting, and restarting of containers.
* Deploying stacks with docker-compose.
* A container published to Docker Hub.

## Why?
There are quite a few full-featured container management apps out there. Portainer is one of my favorites. But all the ones I've looked at have "enterprise features" in an attempt to get you to pay for a license rather than using the "community version".

I'm running a single Raspberry Pi in my home. I trust my users. I have no need for any enterprise features. I just want simple.

Like most open source, I had an itch and I scratched it. This is the byproduct.

## How can I use it?
Currently, it requires Node.js to be installed on the host. There's a start.sh shell script that will get you going. Then point a web browser at http://yourhost:8080.

There is also a Dockerfile to build a containerized version. Look at the `build.sh` and `run.sh` scripts to facilitate that.

## Where's all this going?
There are more features to add, but I'm starting small and working my way up. This is a hobby, not a business venture.
