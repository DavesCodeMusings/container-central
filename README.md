# Container Central
A low-tech solution to managing Docker containers.

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

### Containers

![image](https://user-images.githubusercontent.com/61114342/147370959-509a9cec-a50d-4a12-8722-e32ff8312b5f.png)

The image above is the containers view. There's a round play button icon to show the container is running (triangle) or stopped (square).  Container details are shown when you click on the container name to expand. (See mosquitto container.) If you hover over the container name, you'll get controls to stop, start, restart depending on the state of the container. (See esphome container.)

### Images

![image](https://user-images.githubusercontent.com/61114342/147370973-69cefbf0-5971-4806-b6ff-750621eab95c.png)

The screenshot above is the images view. The calendar with a clock icon indicates the image is more than 30 days old. Expanding shows details. Hovering gives the option to pull a new image.

### More
There are also stack (docker-compose) and volume views. These are features still in development.
