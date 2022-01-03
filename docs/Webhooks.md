# Webhooks
This document shows how to configure a self-hosted Gitea server to notify Container Central whenever the repository of Docker Compose YAML files is updated so Container Central can stay in sync.

## Obligatory Disclaimer
This only works with locally-hosted Gitea as far as I know. Gitea is the only git server I'm aware of that can use HTTP GET when calling a webhook. (Most git servers do HTTPS POST.)

You will not be able to use webhooks triggered from a public git service like GitHub, because with a typical home LAN, there is no way to receive HTTP requests from the outside.

## Prerequisites
You need to have a Gitea server running and Container Central configured for manual git pulls (See the [Git Integration](Git-Integration.md) document for details.

You should also read up on Gitea's [webhook documentation](https://docs.gitea.io/en-us/webhooks/). You don't need a deep understanding, just knowing where to click to get it configured is enough.

## Setting Up the Webhook
Once the prerequisites are taken care of, all you need is a Container Central URL to plug into Gitea and you're ready to go. The URL looks like this:

```
http://mypi.home:8088/stacks/git
```

That's it. Adjust the domain name to suit your configuration and plug that into Gitea for the target URL. Configure Gitea for a GET request and trigger on PUSH events, save, and you're done.

## Testing the Webhook
After configuring the webhook, add a new Docker Compose YAML file to your Gitea repository.

For example, create a new file called _nginx-test.yml_ and use the following YAML for the contents:

```
services:
    nginx:
        image: nginx
        container_name: nginx-test
        hostname: nginx
        restart: unless-stopped
        ports:
        - 8080:80
```

Commit the new file.

Now go to Container Central and select the Stacks menu. If everything is configured correctly, you will see the new _nginx-test_ appearing in the list of stacks to deploy.

Click the up arrow to deploy the stack.
