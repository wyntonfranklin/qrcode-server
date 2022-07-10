// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, ipcMain, clipboard} = require('electron')
const Store = require('electron-store');
const fs = require('fs');
const axios = require('axios');
const command = require('node-cmd');


// default settings schema
const schema = {
  port: {
    type: 'string',
    default: '3001'
  },
  clipboard : {
    type :'boolean',
    default: true,
  },
  ipaddress : {
    type : 'string',
    default : ""
  },
  msgappend : {
    type : 'string',
    default: ''
  },
  actionparam : {
    type : 'string',
    default : ''
  }
};
const store = new Store({schema});

const path = require('path')
const Net = require('net');
let server;
let mainMenu;
let mainWindow, settingsWindow;
let serverStarted = false;



ipcMain.handle('restart', (event) => {
  if(serverStarted){
    stopServer();
  }else{
    startServer();
  }
});


ipcMain.handle('open-settings', (event) => {
    settingsWindow.show();
});


function stopServer(){
  server.close(()=>{
    serverStarted = false;
    startServer();
  })
}

function afterReceivedCallback(message){
  let finalMessage = message;
  let myaction = store.get('action');

  // assign message to clipboard
  if(store.get("clipboard") == true){
    clipboard.writeText(message);
  }

  // append to message if available
  if(store.get("msgappend")){
    finalMessage = message + store.get("msgappend");
  }

  // perform actions after message received
  if(myaction !== "nothing"){
    let actionParam = store.get("actionparam");

    // send command
      if(myaction == "command" ){
        command.run(actionParam,
            function(err, data, stderr){
              if(err){
                setNotificationToClient(err);
              }
            }
        );
      }else if(myaction == "get"){
        axios
            .get(actionParam.replace("{message}", finalMessage))
            .then(res => {
              // do something
            })
            .catch(error => {
             setNotificationToClient(error)
            });
      }else if(myaction == "post"){
        axios
            .post(actionParam, {
              message: finalMessage,
            })
            .then(res => {
              // do something
            })
            .catch(error => {
              setNotificationToClient(error)
            });
      }else if(myaction == "file" || myaction == "afile"){
        if(actionParam){
          if(fs.existsSync(actionParam)){
            try{
              if(myaction == "file"){
                fs.writeFileSync(actionParam, finalMessage);
              }else{
                fs.appendFileSync(actionParam, finalMessage);
              }
            }catch (e){
                setNotificationToClient(e);
            }
          }
        }
      }
  }
}

// send message to client ui
function setNotificationToClient(message){
  mainWindow.send('server_message',message);
}


function startServer(){

  // The port on which the server is listening.
  let port = store.get('port');
  server = new Net.Server();
  server.listen(port, function() {
    mainWindow.send('server_started',`Server listening for connection requests on socket :${port}` );
    serverStarted = true;
  });

// When a client requests a connection with the server, the server creates a new
// socket dedicated to that client.
  server.on('connection', function(socket) {
    socket.write('Hello, client.');
    // The server can also receive data from the client by reading from its socket.
    socket.on('data', function(chunk) {
      mainWindow.send('messagefromclient',chunk.toString());
      afterReceivedCallback(chunk.toString())
      //console.log(`Data received from client: ${chunk.toString()}`);
    });

    // When the client requests to end the TCP connection with the server, the server
    // ends the connection.
    socket.on('end', function() {
      //console.log('Closing connection with the client');
      setNotificationToClient("Closed connection with client");
    });

    socket.on('error', function(err) {
      if(!err.message.includes("ECONNRESET")){
        setNotificationToClient(`Error: ${err}`);
      }
    });

  });

}

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 380,
    height: 610,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  settingsWindow = new BrowserWindow({
    width: 600, height: 600,
    parent: mainWindow,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      backgroundColor: '#3b3b3b'
    },
    modal: false,
    show: false,
  });

  // Settings Window
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile('settings.html');
  settingsWindow.on('close',  (e) => {
    settingsWindow.hide();
    mainWindow.focus();
    e.preventDefault();
  });


  // and load the index.html of the app.
  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => {
    startServer();
  })
  Menu.setApplicationMenu(null)

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
