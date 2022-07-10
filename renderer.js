const network = require('network');
const open = require('open');
const { ipcRenderer, clipboard } = require('electron')
const Store = require("electron-store");
const store = new Store();

let messageEl = document.getElementById("notification")


function loadIpAddress(){
    let port = store.get('port')
    let customAddress = store.get("ipaddress")
    if(customAddress){
        showQRCode(customAddress, port);
    }else{
        network.get_private_ip(function(err, ip) {
            if(err){
                setMessage("No active network interface found")
            }else{
                let ipaddress = ip;
                showQRCode(ipaddress, port);
            }
        })
    }
}

function showQRCode(ipaddress, port){
    document.getElementById("qrcode").innerText = "";
    new QRCode(document.getElementById("qrcode"), `server-url:${ipaddress}:${port}`);
    setMessage(`Server started at ${ipaddress}:${port}`);
}



ipcRenderer.on('messagefromclient', function (evt, message) {
    setMessage(message);
});

ipcRenderer.on('server_started', function (evt, message) {
    loadIpAddress();
   // setMessage(message);
});

ipcRenderer.on('server_message', function (evt, message) {
    showSnackBar(message)
});



function setMessage(title){
    messageEl.innerText = title + "...";
}

function showSnackBar(message) {
    var x = document.getElementById("snackbar");
    x.innerText = message;
    x.className = "show";
    setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}


document.addEventListener('DOMContentLoaded', function(e){

    document.getElementById("settings").addEventListener("click", function(){
        ipcRenderer.invoke('open-settings');
    });

    document.getElementById("server-start").addEventListener("click", function(){
        showSnackBar("Restarting server");
        ipcRenderer.invoke('restart');
    });

    document.getElementById("author").addEventListener("click", function(){
        open("https://wfranklin.io/")
    });

})
