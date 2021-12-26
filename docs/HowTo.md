# Using Container Central to Manage Your Containers
This document gives a more in-depth look at how to use Container Central. To get up and running, see the [Quick Start guide](QuickStart.md)

## A Little Background
Not too much, I promise. I just want to give you some insight into why I created Container Central so you will understand the typical use case I'm targeting.

I have a Raspberry Pi 4 running about a dozen Docker Containers. It's fucntioning as our home's NAS, Home Automation, etc. server. It does a lot using minimal hardware.

Running Docker containers using command-line tools is not my idea of a good time. But, a typical container management solution has more features than I really need. All I want to do is deploy using Docker Compose YAML and then be able to stop and start, upgrade images, prune unused stuff, etc. And I want to do this without typing.

I also want mobile friendly... and dark mode.

## A Typical Use Case
Here's the way I use Container Central to start a container.
1. Create a Docker Compose YAML for whatever I want to deploy.
2. Copy the YAML into Container Central's compose directory. (Git integration is in development to get rid of this step.)
3. Navigate to Container Central's Stacks menu.
4. Find the stack and click the up arrow.

Container Central comes with a sample compose file called nginx-test so you can try this at home.

Now that the container is up and running, I can start and stop it using the Containers menu.

Let's say a new Nginx image is deployed. I can go to the Images menu and use the download icon to pull the latest image from Docker Hub. I can then go back to the Stacks menu and click the up arrow again to redeploy. Docker Compose does all the work of getting the container running with the latest image.

That's really all I need to do to deploy containers and keep them up to date.

## Container Housekeeping
Occasionally, I will try out new containers, decide I don't like them, and then remove them. I can click the Container's menu and stop whatever I'm not using.

And, whenever one or more containers is in a stopped state, a little trash can icon appears at the bottom of the list. Clicking the trash can icon is like typing `docker container prune`, except I don't have to type it, I just click.

If nothing is in a stopped state, the trash can icon goes away.

## Image Housekeeping
After updating some of my containers and redeploying with the latest, there will be images hanging around with the tag of `<none>:<none>`, meaning they're no longer used. Whenever there are `<none>:<none>` images, the trash can will appear at the bottom of the list. All I have to do is click.

## Using Together With Other Tools
Container Central can be used alongside other tools. I can type `docker stop nginx-test` if I am so inclined. In fact, any Docker or Docker Compose commands will work. The only place to watch out is with Docker Compose.

The typical Docker Compose scenario is to create a directory with a project name, like `mkdir nginx-test`. The cd into nginx-test and create a file called docker-compose.yml. But I like to do it differently.

I put all my .yml files in one directory and name them something more descriptive than docker-compose.yml. For example, nginx-test.yml. For me, I think it's easier to manage. I'm certainly typing `cd nginx-test` a lot less.

When all the files are in a common directory, docker compose needs a couple extra command-line options beyond the usual -d.

1. -f to specify the file, as in `-f nginx-test.yml`
2. -p to specify the project name, as in `-p nginx-test`

By now, you might be thinking these extra command-line options take more effort than a simple `cd nginx-test` every now and again. But, that's why I like to point and click instead of typing.

## Other Perks
You may have noticed that the icons in front of container names change depending on the container's state. The image icons change as well. If an image is less than 30 days old, the icon is a calendar with a check mark. If it's older than 30 days, you'll see a calendar with a clock. I use this as a quick visual reminder to keep my containers up to date with the latest images.
