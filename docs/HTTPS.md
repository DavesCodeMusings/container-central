# HTTPS
This document gives an overview of how to configure HTTPS for Container Central by using Nginx as a reverse proxy. Setting up Nginx as a reverse proxy is well documented on the internet and only the specifics of the Container Central configuration are covered here.

## Sample Configuration
We can start with a sample configuration that includes everything specific to Container Central. It is assumed you already have a certificate and have configured Nginx with _ssl_certificate_ and _ssl_certificate_key_ directives to use it. The configuration below comes after all of that.

```
# Container Central redirection and SSL off-loading using reverse proxy.
server {
    server_name central.mypi.home;
    listen 80;
    return 301 https://central.mypi.home;
}

server {
    server_name central.mypi.home;
    listen 443 ssl;
    location / {
        proxy_pass http://central.mypi.home:8088;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

_Be sure to adjust domain names for your setup._

The configuration shown above consists of two parts: redirection and SSL off-loading.

Redirection is in the first server { } block. It listens for any URL containing _central.mypi.home_ and uses a 301 redirect to tell the browser to use the https link instead.

SSL off-loading is configured in the second server { } block. It simply sends any requests on the encrypted port (443) to the regular non-SSL port 8088 (after decrypting, of course.) It also sets the header _X-Forwarded-For_ with the IP address of the client. This is needed so Container Central's logs will show the correct IP address, rather than the address of the proxy. It's not strictly neccessary, just convenient.

## Testing
Once the Nginx configuration is reloaded, try accessing http://central.mypi.home. You should automatically be sent to https://central.mypi.home and the padlock icon should appear in the browser's address bar indicating all traffic is HTTPS.
