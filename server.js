const http = require('http');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const logEvents = require('./logEvents');
const EventEmitter = require("events");

class Emitter extends EventEmitter {};
//initializes object
const myEmitter = new Emitter();
//add listener for the log event
myEmitter.on('log', (msg, fileName) => logEvents(msg, fileName));

const PORT = process.env.PORT || 7000;

const serveFile = async (filePath, contentType, response) => {
    try {
        const rawData = await fsPromises.readFile(filePath, 
            !contentType.includes('image')? 'utf8' : ""
            );
        const data = contentType === 'application/json'? JSON.parse(rawData): rawData;
        response.writeHead(
            filePath.includes('404.html')? 404 : 200, {'Content-type': contentType});
        response.end(
            contentType === 'application/json'? JSON.stringify(data) : data
        );
    } catch (err) {
        console.log(err);
        myEmitter.emit('log', `${err.name}: ${err.message}`, "errLog.txt")
        response.statusCode = 500;
        response.end();
    }
}

const server = http.createServer((req, res) => {
    console.log(req.url, req.method);
    //emit event
    myEmitter.emit('log', `${req.url}\t${req.method}`, "reqLog.txt")

    //This is good, but not efficient

    // let path;
    // if (req.url === '/' || req.url === 'index.html') {
    //     res.statusCode = 200;
    //     res.setHeader('Content-Type', 'text/html');
    //     path = path.join(__dirname, 'views', 'index.html');
    //     fs.readFile(path, 'utf8', (err, data) => {
    //         res.end(data);
    //     })
    // }
    
    //this is equally not efficient

    // let path;

    // switch (req.url) {
    //     case '/':
    //         res.statusCode = 200;
    //         path = path.join(__dirname, 'views', 'index.html');
    //         fs.readFile(path, 'utf8', (err, data) => {
    //             res.end(data);
    //         })
    //         break;
    // }

    // using switch statement again.

    const extension = path.extname(req.url);
    let contentType;

    switch (extension) {
        case '.css':
            contentType = 'text/css';
            break;
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.jpeg':
            contentType = 'image/jpeg';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.txt':
            contentType = 'text/plan';
            break;
        default:
            contentType = 'text/html';                   
    }

    let filePath =
    contentType === 'text/html' && req.url === '/'?
    path.join(__dirname, 'views', 'index.html') :
    contentType === 'text/html' && req.url.slice(-1) === '/' ?
    path.join(__dirname, 'views', req.url, 'index.html') :
    contentType === 'text/html' ?
    path.join(__dirname, 'views', req.url) :
    path.join(__dirname, req.url);
    
    //with the below code, you can run an html file without the .html extension.
    if (!extension && req.url.slice(-1) !== '/') filePath += '.html';

    //check if the file exist.
    const fileExists = fs.existsSync(filePath);

    if (fileExists) {
        serveFile(filePath, contentType, res);
    } else {
        switch(path.parse(filePath).base){
            case 'old-page.html':
                res.writeHead(301, {'Location': '/new-page.html'})
                res.end();
                break;
            case 'www-page.html':
                res.writeHead(301, {'Location': '/'})
                res.end();
                break;
            default:
                serveFile(path.join(__dirname, 'views', '404.html'), 'text/html', res);    
        }
    }

});

server.listen(PORT, () => console.log(`server running on port ${PORT}`));  