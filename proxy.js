// This was for figuring everything out. Not used by the example script.

import express from 'express';
import request from 'request';
import bodyParser from 'body-parser';
import yargs from 'yargs';
const argv = yargs.argv;

import HttpProxyMiddleware from 'http-proxy-middleware';
const createProxyMiddleware = HttpProxyMiddleware.createProxyMiddleware;

var app = express();

app.use(bodyParser.json());

app.all("*", createProxyMiddleware({
  target: argv.target,
  ws: true,
  onProxyReq: (proxyReq, req, res) => {
    // IPFS request dies if these headers are present!
    // https://github.com/ipfs-shipyard/ipfs-share-files/issues/17
    proxyReq.removeHeader("Origin");
    proxyReq.removeHeader("Referer");
    proxyReq.removeHeader("User-Agent");

    console.log(proxyReq)
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add cors
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, PUT, PATCH, POST, DELETE';
    proxyRes.headers["Access-Control-Allow-Headers"] = "*";
  }
}));

app.set('port', argv.port);

app.listen(app.get('port'), function () {
  console.log('Proxy server listening on port ' + app.get('port'));
});

