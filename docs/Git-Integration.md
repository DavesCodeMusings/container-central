# Git Integration for Stacks

_This is a work in progress._

With a little configuration, Container Central can reference Docker Compose YAML stored in a git repository. Here's a high-level view of the steps:

1. Configure a git repository to hold docker compose files.
2. Add the git URL using Container Central's Configuration menu.
3. Navigate to Stacks, find the source code branch symbol on the righthand side, and click it.

## Pulling the Repository
When you click the source code branch symbol, watch for a pop-up alert that says, "Compose files are up to date". You should also see an updated list of Docker Pompose projects that can be deployed.

If you see an error message instead, check the container logs with `docker logs` to get more detailed information.

>If you're trying to pull from a locally-hosted git server using https, you may see this message in the container logs:
>```
>fatal: unable to access 'https://local.git.server/pi/docker-compose.git/': server certificate verification failed. CAfile: none CRLfile: none
>```
>
>If that happens, try adding `-v /etc/ssl:/etc/ssl` to your docker run command, like this:
>
>```
>docker run -d \
>  -p 8088:8088 \
>  -v /var/run/docker.sock:/var/run/docker.sock \
>  -v ${PWD}/data:/app/data \
>  -v /etc/ssl:/etc/ssl \
>  davescodemusings/container-central:latest
>```
>
>This will make certain /etc/ssl/cert/ca-certificates.crt is available to the container so git can verify the SSL certificate issuer. 

Hopefully all goes well. As a final check, you can look inside the _data/compose_ directory and verify the files match what's in the git repository.

## Maintaining your Docker Compose files
Any changes made to files should be pushed to the git repository. Then, from Container Central's Stacks menu, click or tap the branch icon to pull the latest versions.
